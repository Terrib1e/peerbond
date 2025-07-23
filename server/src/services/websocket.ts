import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './database';
import { GeminiService } from './geminiService';
import { logger } from '../utils/logger';
import { WebSocketMessage, User, Message, Group } from '../types';

export interface AuthenticatedSocket extends Socket {
  user?: User;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer;
  private dbService: DatabaseService;
  private geminiService: GeminiService;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private typingUsers: Map<string, Set<string>> = new Map(); // groupId -> Set of userIds

  constructor(server: HTTPServer, dbService: DatabaseService) {
    this.dbService = dbService;
    this.geminiService = new GeminiService();
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    // Set singleton instance
    WebSocketService.instance = this;
  }

  // Static method to get singleton instance
  public static getInstance(): WebSocketService | null {
    return WebSocketService.instance || null;
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('JWT secret not configured'));
        }

        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
        const user = await this.dbService.getUserById(decoded.userId);

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        if (!user.isActive) {
          return next(new Error('Authentication error: User account is disabled'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.user!;
      logger.info(`User connected: ${user.email} (${socket.id})`);

      // Track connected user
      this.connectedUsers.set(user.id, socket.id);

      // Join user's groups
      this.joinUserGroups(socket, user);

      // Handle joining specific group
      socket.on('join_group', async (groupId: string) => {
        await this.handleJoinGroup(socket, groupId);
      });

      // Handle leaving specific group
      socket.on('leave_group', async (groupId: string) => {
        await this.handleLeaveGroup(socket, groupId);
      });

      // Handle new message
      socket.on('send_message', async (data: { groupId: string; content: string; type?: string }) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle typing indicator
      socket.on('typing', (data: { groupId: string; isTyping: boolean }) => {
        this.handleTyping(socket, data);
      });

      // Handle message reaction
      socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
        await this.handleAddReaction(socket, data);
      });

      socket.on('remove_reaction', async (data: { messageId: string; emoji: string }) => {
        await this.handleRemoveReaction(socket, data);
      });

      // Handle manual AI facilitator request
      socket.on('request_facilitator', async (data: { groupId: string; type?: string }) => {
        await this.handleFacilitatorRequest(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async joinUserGroups(socket: AuthenticatedSocket, user: User) {
    try {
      const groups = await this.dbService.getUserGroups(user.id);

      for (const group of groups) {
        socket.join(group.id);

        // Notify group members that user is online
        socket.to(group.id).emit('user_status', {
          userId: user.id,
          status: 'online',
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error joining user groups for ${user.email}:`, error);
    }
  }

  private async handleJoinGroup(socket: AuthenticatedSocket, groupId: string) {
    try {
      const user = socket.user!;
      const group = await this.dbService.getGroupById(groupId);

      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }

      if (!group.members.includes(user.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(groupId);

      // Notify group members
      socket.to(groupId).emit('user_joined', {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date()
      });

      logger.info(`User ${user.email} joined group ${groupId}`);
    } catch (error) {
      logger.error(`Error joining group ${groupId}:`, error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  }

  private async handleLeaveGroup(socket: AuthenticatedSocket, groupId: string) {
    try {
      const user = socket.user!;
      socket.leave(groupId);

      // Notify group members
      socket.to(groupId).emit('user_left', {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date()
      });

      logger.info(`User ${user.email} left group ${groupId}`);
    } catch (error) {
      logger.error(`Error leaving group ${groupId}:`, error);
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: { groupId: string; content: string; type?: string }) {
    try {
      const user = socket.user!;
      const { groupId, content, type = 'text' } = data;

      // Verify user access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(user.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Create message
      const message = await this.dbService.createMessage({
        groupId,
        userId: user.id,
        content,
        type
      });

      // Broadcast to group members
      const messageData = {
        ...message,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture
        }
      };

      this.io.to(groupId).emit('new_message', messageData);

      // Clear typing indicator
      this.clearTyping(groupId, user.id);

      // Trigger AI facilitator response for recovery groups
      await this.triggerAIFacilitatorResponse(groupId, message, group);

      logger.info(`Message sent in group ${groupId} by ${user.email}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  private handleTyping(socket: AuthenticatedSocket, data: { groupId: string; isTyping: boolean }) {
    const user = socket.user!;
    const { groupId, isTyping } = data;

    if (!this.typingUsers.has(groupId)) {
      this.typingUsers.set(groupId, new Set());
    }

    const typingSet = this.typingUsers.get(groupId)!;

    if (isTyping) {
      typingSet.add(user.id);
    } else {
      typingSet.delete(user.id);
    }

    // Broadcast typing status to group (excluding sender)
    socket.to(groupId).emit('typing_update', {
      groupId,
      typingUsers: Array.from(typingSet).filter(id => id !== user.id),
      timestamp: new Date()
    });

    // Auto-clear typing after 5 seconds
    if (isTyping) {
      setTimeout(() => {
        this.clearTyping(groupId, user.id);
      }, 5000);
    }
  }

  private clearTyping(groupId: string, userId: string) {
    const typingSet = this.typingUsers.get(groupId);
    if (typingSet) {
      typingSet.delete(userId);

      this.io.to(groupId).emit('typing_update', {
        groupId,
        typingUsers: Array.from(typingSet),
        timestamp: new Date()
      });
    }
  }

  private async handleAddReaction(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      const user = socket.user!;
      const { messageId, emoji } = data;

      const message = await this.dbService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify user access to group
      const group = await this.dbService.getGroupById(message.groupId);
      if (!group || !group.members.includes(user.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const updatedMessage = await this.dbService.addMessageReaction(messageId, user.id, emoji);

      // Broadcast to group members
      this.io.to(message.groupId).emit('reaction_added', {
        messageId,
        emoji,
        userId: user.id,
        reactions: updatedMessage.reactions,
        timestamp: new Date()
      });

      logger.info(`Reaction added to message ${messageId} by ${user.email}`);
    } catch (error) {
      logger.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  private async handleRemoveReaction(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      const user = socket.user!;
      const { messageId, emoji } = data;

      const message = await this.dbService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify user access to group
      const group = await this.dbService.getGroupById(message.groupId);
      if (!group || !group.members.includes(user.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await this.dbService.removeMessageReaction(messageId, user.id, emoji);

      // Get updated message to get reactions
      const updatedMessage = await this.dbService.getMessageById(messageId);

      // Broadcast to group members
      this.io.to(message.groupId).emit('reaction_removed', {
        messageId,
        emoji,
        userId: user.id,
        reactions: updatedMessage?.reactions || {},
        timestamp: new Date()
      });

      logger.info(`Reaction removed from message ${messageId} by ${user.email}`);
    } catch (error) {
      logger.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    const user = socket.user!;

    // Remove from connected users
    this.connectedUsers.delete(user.id);

    // Clear typing indicators
    for (const [groupId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(user.id)) {
        typingSet.delete(user.id);
        this.io.to(groupId).emit('typing_update', {
          groupId,
          typingUsers: Array.from(typingSet),
          timestamp: new Date()
        });
      }
    }

    // Notify groups that user is offline
    this.io.emit('user_status', {
      userId: user.id,
      status: 'offline',
      timestamp: new Date()
    });

    logger.info(`User disconnected: ${user.email} (${socket.id})`);
  }

  // Public methods for external use
  public broadcastToGroup(groupId: string, event: string, data: any) {
    this.io.to(groupId).emit(event, data);
  }

  public broadcastToUser(userId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  public broadcastToAll(event: string, data: any) {
    this.io.emit(event, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  public getTypingUsers(groupId: string): string[] {
    return Array.from(this.typingUsers.get(groupId) || new Set());
  }

  private async triggerAIFacilitatorResponse(groupId: string, userMessage: Message, group: Group) {
    try {
      logger.info(`🤖 Checking AI trigger for group ${groupId}, type: ${group.type}, message: "${userMessage.content}"`);

      // Trigger AI for recovery, support, wellness, and general groups
      const aiEnabledTypes = ['recovery', 'support', 'wellness', 'general'];
      const shouldTriggerForType = aiEnabledTypes.some(type => group.type.includes(type));

      if (!shouldTriggerForType) {
        logger.info(`❌ AI not enabled for group type: ${group.type}`);
        return;
      }

      logger.info(`✅ AI enabled for group type: ${group.type}`);

      // Get recent messages for context
      const recentMessages = await this.dbService.getRecentMessages(groupId, 10);
      const activeUsers = await this.dbService.getGroupMembers(groupId);

      // Check if AI should interject based on conversation flow
      const shouldRespond = await this.shouldAIRespond(recentMessages, userMessage, group);

      logger.info(`🎯 Should AI respond? ${shouldRespond} for message: "${userMessage.content}"`);

      if (!shouldRespond) {
        logger.info(`❌ AI decided not to respond based on conversation flow`);
        return;
      }

      logger.info(`✅ AI will respond to message: "${userMessage.content}"`);

      // Generate AI facilitator response using Gemini
      const aiResponse = await this.geminiService.generateFacilitatorResponse(
        userMessage,
        recentMessages,
        group,
        activeUsers
      );

      if (!aiResponse) {
        return;
      }

      // Create AI message in database
      const aiMessage = await this.dbService.createMessage({
        groupId,
        userId: 'ai-facilitator',
        content: aiResponse.message,
        type: 'ai_facilitator'
      });

      // Broadcast AI response to group with slight delay for natural feel
      setTimeout(() => {
        this.io.to(groupId).emit('new_message', {
          ...aiMessage,
          user: {
            id: 'ai-facilitator',
            firstName: 'AI',
            lastName: 'Facilitator',
            profilePicture: null
          }
        });

        // If there are action items, broadcast them too
        if (aiResponse.actionItems && aiResponse.actionItems.length > 0) {
          this.io.to(groupId).emit('action_items_suggested', {
            groupId,
            actionItems: aiResponse.actionItems,
            timestamp: new Date()
          });
        }

        // If there are insights, broadcast them
        if (aiResponse.insights && aiResponse.insights.length > 0) {
          this.io.to(groupId).emit('insights_generated', {
            groupId,
            insights: aiResponse.insights,
            timestamp: new Date()
          });
        }
      }, 1000 + Math.random() * 2000); // 1-3 second delay

    } catch (error) {
      logger.error('Error triggering AI facilitator response:', error);
    }
  }

  private async shouldAIRespond(recentMessages: Message[], userMessage: Message, group: Group): Promise<boolean> {
    logger.info(`🔍 Checking if Maya should respond to: "${userMessage.content}"`);

    // Get AI messages in recent conversation
    const aiMessages = recentMessages.filter(m => m.type === 'ai_facilitator');
    const userMessages = recentMessages.filter(m => m.type === 'user' || m.type === 'text');

    logger.info(`📊 Recent messages: ${userMessages.length} user messages, ${aiMessages.length} AI messages`);

    // More relaxed frequency check - only prevent if there are more AI messages than user messages recently
    if (aiMessages.length > userMessages.length && aiMessages.length > 2) {
      logger.info(`⏸️ Too many recent AI messages (${aiMessages.length} AI vs ${userMessages.length} user) - skipping`);
      return false;
    }

    // Check for crisis language using Gemini (if available)
    try {
      const isCrisis = await this.geminiService.checkCrisisLanguage(userMessage.content);
      if (isCrisis) {
        logger.info(`🚨 Crisis language detected - Maya responding immediately`);
        return true; // Always respond to crisis indicators
      }
    } catch (error) {
      logger.warn('Crisis detection unavailable, continuing with other checks');
    }

    // Direct mentions of Maya or facilitator - case insensitive
    const directMentions = [
      'maya', 'facilitator', 'ai', 'help me', 'need help', 'support',
      'guidance', 'advice', 'what should i do'
    ];
    const messageContent = userMessage.content.toLowerCase();
    const matchedMention = directMentions.find(mention => messageContent.includes(mention));
    if (matchedMention) {
      logger.info(`🎯 Direct facilitator request detected: "${matchedMention}" - Maya responding with 100% chance`);
      return true; // 100% chance to respond to direct requests
    }

    // Enhanced support opportunities - more triggers for engagement
    const supportTriggers = [
      'struggling', 'difficult', 'hard day', 'relapsed', 'failed', 'relapse',
      'need help', 'don\'t know what to do', 'feeling lost', 'depressed',
      'anxious', 'scared', 'worried', 'stressed', 'overwhelmed', 'alone',
      'hopeless', 'worthless', 'angry', 'frustrated', 'tired', 'exhausted',
      'can\'t cope', 'giving up', 'want to quit', 'not working', 'failed again',
      'terrible progress', 'no progress', 'stuck', 'lost', 'helpless'
    ];

    // Find which trigger matched
    const matchedTrigger = supportTriggers.find(trigger => messageContent.includes(trigger));
    if (matchedTrigger) {
      logger.info(`🎯 Support trigger detected: "${matchedTrigger}" - Maya responding with 100% chance`);
      return true; // 100% chance to respond to support requests
    }

    // Positive moments to reinforce - also respond more frequently
    const positiveTriggers = [
      'doing better', 'made progress', 'proud of', 'accomplished', 'achievement',
      'sober for', 'clean for', 'milestone', 'grateful', 'thank you', 'thankful',
      'feeling good', 'happy', 'excited', 'success', 'breakthrough', 'better day',
      'improving', 'healing', 'recovery', 'growth', 'learning'
    ];

    const matchedPositive = positiveTriggers.find(trigger => messageContent.includes(trigger));
    if (matchedPositive) {
      logger.info(`🌟 Positive moment detected: "${matchedPositive}" - Maya celebrating with 90% chance`);
      return Math.random() > 0.1; // 90% chance to respond to positive moments
    }

    // Conversation starters and check-ins
    const engagementTriggers = [
      'hello', 'hi everyone', 'good morning', 'good evening', 'how is everyone',
      'anyone here', 'quiet today', 'new here', 'first time', 'introduce myself',
      'check in', 'checking in', 'update', 'share', 'thoughts', 'feelings'
    ];

    const matchedEngagement = engagementTriggers.find(trigger => messageContent.includes(trigger));
    if (matchedEngagement) {
      logger.info(`👋 Engagement opportunity detected: "${matchedEngagement}" - Maya responding with 70% chance`);
      return Math.random() > 0.3; // 70% chance to respond to engagement opportunities
    }

    // Questions that need facilitator guidance
    const questionTriggers = [
      '?', 'how do', 'what should', 'any advice', 'has anyone', 'does anyone',
      'what would you', 'suggestions', 'recommendations', 'thoughts on'
    ];

    const matchedQuestion = questionTriggers.find(trigger => messageContent.includes(trigger));
    if (matchedQuestion) {
      logger.info(`❓ Question detected: "${matchedQuestion}" - Maya providing guidance with 80% chance`);
      return Math.random() > 0.2; // 80% chance to respond to questions
    }

    // Long silence - if last message was more than 5 minutes ago (reduced from 10)
    const lastMessage = recentMessages[recentMessages.length - 2]; // Previous message before current
    if (lastMessage && (Date.now() - new Date(lastMessage.createdAt).getTime()) > 5 * 60 * 1000) {
      logger.info(`🕐 Breaking silence after 5+ minutes - Maya engaging with 80% chance`);
      return Math.random() > 0.2; // 80% chance to respond to break silence
    }

    // Group-specific engagement for recovery and wellness groups
    if (group.type === 'recovery' || group.type === 'wellness') {
      logger.info(`💊 Recovery/Wellness group - Maya facilitating with 50% chance`);
      return Math.random() > 0.5; // 50% chance for general engagement in recovery groups
    }

    // General conversation flow - respond more frequently
    logger.info(`💬 General message - Maya responding with 30% chance (increased engagement)`);
    return Math.random() > 0.7; // 30% chance for general engagement (doubled from 15%)
  }

  private async handleFacilitatorRequest(socket: AuthenticatedSocket, data: { groupId: string; type?: string }) {
    try {
      const user = socket.user!;
      const { groupId, type = 'general' } = data;

      // Verify user access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(user.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Get recent messages for context
      const recentMessages = await this.dbService.getRecentMessages(groupId, 10);
      const activeUsers = await this.dbService.getGroupMembers(groupId);

      let aiResponse;

      // Generate response based on request type
      if (type === 'check_in') {
        const checkInMessage = await this.geminiService.generateCheckInPrompt(group);
        aiResponse = { message: checkInMessage, confidenceScore: 0.9 };
      } else if (type === 'welcome') {
        const welcomeMessage = await this.geminiService.generateWelcomeMessage(group);
        aiResponse = { message: welcomeMessage, confidenceScore: 0.9 };
      } else {
        // Create a dummy user message to trigger contextual response
        const dummyMessage = {
          id: 'msg_dummy',
          groupId: group.id,
          userId: 'system',
          authorId: 'system', // Add missing authorId field
          content: 'Test message for conversation analysis',
          type: 'user' as const,
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          reactions: {},
          isEdited: false
        };

        aiResponse = await this.geminiService.generateFacilitatorResponse(
          dummyMessage,
          recentMessages,
          group,
          activeUsers
        );
      }

      if (!aiResponse) {
        socket.emit('error', { message: 'Failed to generate facilitator response' });
        return;
      }

      // Create AI message in database
      const aiMessage = await this.dbService.createMessage({
        groupId,
        userId: 'ai-facilitator',
        content: aiResponse.message,
        type: 'ai_facilitator'
      });

      // Broadcast AI response to group
      this.io.to(groupId).emit('new_message', {
        ...aiMessage,
        user: {
          id: 'ai-facilitator',
          firstName: 'Maya',
          lastName: 'AI Facilitator',
          profilePicture: null
        }
      });

      // If there are action items, broadcast them too
      if (aiResponse.actionItems && aiResponse.actionItems.length > 0) {
        this.io.to(groupId).emit('action_items_suggested', {
          groupId,
          actionItems: aiResponse.actionItems,
          timestamp: new Date()
        });
      }

      // If there are insights, broadcast them
      if (aiResponse.insights && aiResponse.insights.length > 0) {
        this.io.to(groupId).emit('insights_generated', {
          groupId,
          insights: aiResponse.insights,
          timestamp: new Date()
        });
      }

      logger.info(`Manual facilitator response generated for group ${groupId} by ${user.email}`);
    } catch (error) {
      logger.error('Error handling facilitator request:', error);
      socket.emit('error', { message: 'Failed to request facilitator response' });
    }
  }

}