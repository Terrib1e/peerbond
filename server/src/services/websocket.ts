import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { DatabaseService } from './database';
import { GeminiService } from './geminiService';
import { ProductionOrchestratorService } from '../orchestration/production-ready-fixed';
import { GroupOrchestrationService } from './GroupOrchestrationService';
import { logger } from '../utils/logger';
import { WebSocketMessage, Member, Message, Group } from '../types';

export interface AuthenticatedSocket extends Socket {
  member?: Member;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private io: SocketIOServer;
  private dbService: DatabaseService;
  private geminiService: GeminiService;
  private orchestratorService: ProductionOrchestratorService;
  private groupOrchestrationService: GroupOrchestrationService;
  private connectedUsers: Map<string, string> = new Map(); // memberId -> socketId
  private typingUsers: Map<string, Set<string>> = new Map(); // groupId -> Set of memberIds
  private groupSessions: Map<string, string> = new Map(); // groupId -> sessionId

  constructor(server: HTTPServer, dbService: DatabaseService) {
    this.dbService = dbService;
    this.geminiService = new GeminiService();
    this.orchestratorService = new ProductionOrchestratorService();
    this.groupOrchestrationService = new GroupOrchestrationService();
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

        const decoded = jwt.verify(token, jwtSecret) as { memberId: string };
        const member = await this.dbService.getMemberById(decoded.memberId);

        if (!member) {
          return next(new Error('Authentication error: User not found'));
        }

        if (!member.isActive) {
          return next(new Error('Authentication error: User account is disabled'));
        }

        socket.member = member;
        next();
      } catch (error) {
        logger.error('WebSocket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const member = socket.member!;
      logger.info(`User connected: ${member.email} (${socket.id})`);

      // Track connected member
      this.connectedUsers.set(member.id, socket.id);

      // Join member's groups
      this.joinMemberGroups(socket, member);

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

      // AI Orchestration Events
      socket.on('ai:start_session', async (data: { groupId: string; memberProfile?: any }) => {
        await this.handleAISessionStart(socket, data);
      });

      socket.on('ai:agent_call', async (data: { groupId: string; agentId: string; message: string; sessionId: string }) => {
        await this.handleAIAgentCall(socket, data);
      });

      socket.on('ai:crisis_intervention', async (data: { groupId: string; messageId: string; severity: string }) => {
        await this.handleCrisisIntervention(socket, data);
      });

      socket.on('ai:request_insights', async (data: { groupId: string }) => {
        await this.handleGroupInsightsRequest(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async joinMemberGroups(socket: AuthenticatedSocket, member: Member) {
    try {
      const groups = await this.dbService.getMemberGroups(member.id);

      for (const group of groups) {
        socket.join(group.id);

        // Notify group members that member is online
        socket.to(group.id).emit('member_status', {
          memberId: member.id,
          status: 'online',
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error(`Error joining member groups for ${member.email}:`, error);
    }
  }

  private async handleJoinGroup(socket: AuthenticatedSocket, groupId: string) {
    try {
      const member = socket.member!;
      const group = await this.dbService.getGroupById(groupId);

      if (!group) {
        socket.emit('error', { message: 'Group not found' });
        return;
      }

      if (!group.members.includes(member.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      socket.join(groupId);

      // Notify group members
      socket.to(groupId).emit('member_joined', {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        timestamp: new Date()
      });

      logger.info(`User ${member.email} joined group ${groupId}`);
    } catch (error) {
      logger.error(`Error joining group ${groupId}:`, error);
      socket.emit('error', { message: 'Failed to join group' });
    }
  }

  private async handleLeaveGroup(socket: AuthenticatedSocket, groupId: string) {
    try {
      const member = socket.member!;
      socket.leave(groupId);

      // Notify group members
      socket.to(groupId).emit('member_left', {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        timestamp: new Date()
      });

      logger.info(`User ${member.email} left group ${groupId}`);
    } catch (error) {
      logger.error(`Error leaving group ${groupId}:`, error);
    }
  }

  private async handleSendMessage(socket: AuthenticatedSocket, data: { groupId: string; content: string; type?: string }) {
    try {
      const member = socket.member!;
      const { groupId, content, type = 'text' } = data;

      // Verify member access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Create message
      const message = await this.dbService.createMessage({
        groupId,
        memberId: member.id,
        content,
        type
      });

      // Broadcast to group members
      const messageData = {
        ...message,
        member: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          profilePicture: member.profilePicture
        }
      };

      this.io.to(groupId).emit('new_message', messageData);

      // Clear typing indicator
      this.clearTyping(groupId, member.id);

      // Enhanced AI orchestration for group messages
      await this.processGroupMessageWithAI(groupId, message, member);

      logger.info(`Message sent in group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Process group message through AI orchestration pipeline
   */
  private async processGroupMessageWithAI(groupId: string, message: any, member: Member) {
    try {
      console.log('[WebSocket] Processing group message with AI:', {
        groupId,
        messageContent: message.content,
        memberId: member.id
      });

      // Process message through group orchestration service
      const aiResponse = await this.groupOrchestrationService.processGroupMessage({
        groupId,
        memberId: member.id,
        message: message.content,
        messageId: message.id
      });

      console.log('[WebSocket] AI response received:', {
        success: aiResponse.success,
        agentUsed: aiResponse.agentUsed,
        isMetaQuery: aiResponse.metadata?.isMetaQuery
      });

      // Handle different AI response scenarios
      if (aiResponse.needsCrisisIntervention) {
        await this.handleAutomaticCrisisDetection(groupId, message, aiResponse);
      }

      if (aiResponse.needsGroupAction) {
        await this.handleGroupActionRequired(groupId, aiResponse);
      }

      if (aiResponse.suggestGroupMatching) {
        await this.handleGroupMatchingSuggestion(groupId, aiResponse);
      }

      // Send AI response as a message if there's actual content to respond with
      if (aiResponse.response && aiResponse.response.trim()) {
        console.log('[WebSocket] Sending AI response message');

        // Create AI message in database
        const aiMessage = await this.dbService.createMessage({
          groupId,
          memberId: aiResponse.metadata?.isMetaQuery ? 'ai-system' : 'ai-facilitator',
          content: aiResponse.response,
          type: aiResponse.metadata?.isMetaQuery ? 'system' : 'ai_facilitator'
        });

        // Broadcast AI response to all group members
        this.io.to(groupId).emit('new_message', {
          ...aiMessage,
          isAIGenerated: true,
          aiContext: {
            agentUsed: aiResponse.agentUsed,
            confidence: aiResponse.confidence,
            metadata: aiResponse.metadata
          }
        });
      }

      // Send AI insights to group if available
      if (aiResponse.groupInsights && aiResponse.groupInsights.length > 0) {
        this.io.to(groupId).emit('ai:insights_update', {
          groupId,
          insights: aiResponse.groupInsights,
          timestamp: new Date()
        });
      }

      // Emit updated agent status based on group context
      this.io.to(groupId).emit('ai:agent_status_update', {
        groupId,
        agentStatus: {
          facilitator: true,
          sentiment: aiResponse.agentUsed.includes('sentiment'),
          crisis: aiResponse.needsCrisisIntervention || false,
          insight: aiResponse.groupInsights && aiResponse.groupInsights.length > 0,
          matching: aiResponse.suggestGroupMatching || false
        },
        groupContext: {
          mood: aiResponse.groupContext?.groupMood,
          activity: aiResponse.groupContext?.recentActivity,
          memberCount: aiResponse.groupContext?.memberCount
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Error processing group message with AI:', error);
      // Fallback to basic AI response if group orchestration fails
      await this.triggerAIFacilitatorResponse(groupId, message, await this.dbService.getGroupById(groupId));
    }
  }

  private async handleAutomaticCrisisDetection(groupId: string, message: any, aiResponse: any) {
    // Create crisis alert message
    const crisisMessage = await this.dbService.createMessage({
      groupId,
      memberId: 'ai-crisis',
      content: aiResponse.response,
      type: 'crisis_intervention'
    });

    // Broadcast crisis intervention
    this.io.to(groupId).emit('ai:crisis_detected', {
      groupId,
      messageId: message.id,
      severity: aiResponse.metadata?.crisisLevel || 'moderate',
      aiResponse: crisisMessage,
      resources: aiResponse.metadata?.crisisResources || []
    });

    // Alert facilitators
    const group = await this.dbService.getGroupById(groupId);
    if (group?.facilitators) {
      const facilitatorSockets = group.facilitators
        .map(facId => this.connectedUsers.get(facId))
        .filter(Boolean);

      facilitatorSockets.forEach(socketId => {
        this.io.to(socketId!).emit('ai:facilitator_alert', {
          type: 'crisis_detected',
          groupId,
          messageId: message.id,
          severity: aiResponse.metadata?.crisisLevel || 'moderate',
          requiresAction: true
        });
      });
    }
  }

  private async handleGroupActionRequired(groupId: string, aiResponse: any) {
    // Emit group action needed event
    this.io.to(groupId).emit('ai:group_action_needed', {
      groupId,
      actionType: aiResponse.metadata?.actionType || 'general_support',
      recommendation: aiResponse.response,
      priority: aiResponse.metadata?.priority || 'medium',
      timestamp: new Date()
    });
  }

  private async handleGroupMatchingSuggestion(groupId: string, aiResponse: any) {
    // Get group matching suggestions
    try {
      const sessionId = this.groupSessions.get(groupId);
      if (sessionId) {
        const matchingResponse = await this.orchestratorService.callAgentDirectly(
          'matching',
          'Suggest similar groups for better peer connection',
          sessionId,
          'system'
        );

        this.io.to(groupId).emit('ai:group_matching_suggestion', {
          groupId,
          suggestions: matchingResponse.metadata?.suggestions || [],
          reason: matchingResponse.response,
          timestamp: new Date()
        });
      }
    } catch (error) {
      logger.error('Error getting group matching suggestions:', error);
    }
  }

  private handleTyping(socket: AuthenticatedSocket, data: { groupId: string; isTyping: boolean }) {
    const member = socket.member!;
    const { groupId, isTyping } = data;

    if (!this.typingUsers.has(groupId)) {
      this.typingUsers.set(groupId, new Set());
    }

    const typingSet = this.typingUsers.get(groupId)!;

    if (isTyping) {
      typingSet.add(member.id);
    } else {
      typingSet.delete(member.id);
    }

    // Broadcast typing status to group (excluding sender)
    socket.to(groupId).emit('typing_update', {
      groupId,
      typingUsers: Array.from(typingSet).filter(id => id !== member.id),
      timestamp: new Date()
    });

    // Auto-clear typing after 5 seconds
    if (isTyping) {
      setTimeout(() => {
        this.clearTyping(groupId, member.id);
      }, 5000);
    }
  }

  private clearTyping(groupId: string, memberId: string) {
    const typingSet = this.typingUsers.get(groupId);
    if (typingSet) {
      typingSet.delete(memberId);

      this.io.to(groupId).emit('typing_update', {
        groupId,
        typingUsers: Array.from(typingSet),
        timestamp: new Date()
      });
    }
  }

  private async handleAddReaction(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      const member = socket.member!;
      const { messageId, emoji } = data;

      const message = await this.dbService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify member access to group
      const group = await this.dbService.getGroupById(message.groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const updatedMessage = await this.dbService.addMessageReaction(messageId, member.id, emoji);

      // Broadcast to group members
      this.io.to(message.groupId).emit('reaction_added', {
        messageId,
        emoji,
        memberId: member.id,
        reactions: updatedMessage.reactions,
        timestamp: new Date()
      });

      logger.info(`Reaction added to message ${messageId} by ${member.email}`);
    } catch (error) {
      logger.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  }

  private async handleRemoveReaction(socket: AuthenticatedSocket, data: { messageId: string; emoji: string }) {
    try {
      const member = socket.member!;
      const { messageId, emoji } = data;

      const message = await this.dbService.getMessageById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message not found' });
        return;
      }

      // Verify member access to group
      const group = await this.dbService.getGroupById(message.groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      await this.dbService.removeMessageReaction(messageId, member.id, emoji);

      // Get updated message to get reactions
      const updatedMessage = await this.dbService.getMessageById(messageId);

      // Broadcast to group members
      this.io.to(message.groupId).emit('reaction_removed', {
        messageId,
        emoji,
        memberId: member.id,
        reactions: updatedMessage?.reactions || {},
        timestamp: new Date()
      });

      logger.info(`Reaction removed from message ${messageId} by ${member.email}`);
    } catch (error) {
      logger.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Failed to remove reaction' });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    const member = socket.member!;

    // Remove from connected members
    this.connectedUsers.delete(member.id);

    // Clear typing indicators
    for (const [groupId, typingSet] of this.typingUsers.entries()) {
      if (typingSet.has(member.id)) {
        typingSet.delete(member.id);
        this.io.to(groupId).emit('typing_update', {
          groupId,
          typingUsers: Array.from(typingSet),
          timestamp: new Date()
        });
      }
    }

    // Notify groups that member is offline
    this.io.emit('member_status', {
      memberId: member.id,
      status: 'offline',
      timestamp: new Date()
    });

    logger.info(`User disconnected: ${member.email} (${socket.id})`);
  }

  // Public methods for external use
  public broadcastToGroup(groupId: string, event: string, data: any) {
    this.io.to(groupId).emit(event, data);
  }

  public broadcastToUser(memberId: string, event: string, data: any) {
    const socketId = this.connectedUsers.get(memberId);
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

  public isUserConnected(memberId: string): boolean {
    return this.connectedUsers.has(memberId);
  }

  public getTypingUsers(groupId: string): string[] {
    return Array.from(this.typingUsers.get(groupId) || new Set());
  }

  private async triggerAIFacilitatorResponse(groupId: string, memberMessage: Message, group: Group) {
    try {
      logger.info(`🤖 Checking AI trigger for group ${groupId}, type: ${group.type}, message: "${memberMessage.content}"`);

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
      const shouldRespond = await this.shouldAIRespond(recentMessages, memberMessage, group);

      logger.info(`🎯 Should AI respond? ${shouldRespond} for message: "${memberMessage.content}"`);

      if (!shouldRespond) {
        logger.info(`❌ AI decided not to respond based on conversation flow`);
        return;
      }

      logger.info(`✅ AI will respond to message: "${memberMessage.content}"`);

      // Generate AI facilitator response using Gemini
      const aiResponse = await this.geminiService.generateFacilitatorResponse(
        memberMessage,
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
        memberId: 'ai-facilitator',
        content: aiResponse.message,
        type: 'ai_facilitator'
      });

      // Broadcast AI response to group with slight delay for natural feel
      setTimeout(() => {
        this.io.to(groupId).emit('new_message', {
          ...aiMessage,
          member: {
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

  private async shouldAIRespond(recentMessages: Message[], memberMessage: Message, group: Group): Promise<boolean> {
    logger.info(`🔍 Checking if Maya should respond to: "${memberMessage.content}"`);

    // Get AI messages in recent conversation
    const aiMessages = recentMessages.filter(m => m.type === 'ai_facilitator');
    const memberMessages = recentMessages.filter(m => m.type === 'member' || m.type === 'text');

    logger.info(`📊 Recent messages: ${memberMessages.length} member messages, ${aiMessages.length} AI messages`);

    // More relaxed frequency check - only prevent if there are more AI messages than member messages recently
    if (aiMessages.length > memberMessages.length && aiMessages.length > 2) {
      logger.info(`⏸️ Too many recent AI messages (${aiMessages.length} AI vs ${memberMessages.length} member) - skipping`);
      return false;
    }

    // Check for crisis language using Gemini (if available)
    try {
      const isCrisis = await this.geminiService.checkCrisisLanguage(memberMessage.content);
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
    const messageContent = memberMessage.content.toLowerCase();
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
      const member = socket.member!;
      const { groupId, type = 'general' } = data;

      // Verify member access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(member.id)) {
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
        // Create a dummy member message to trigger contextual response
        const dummyMessage = {
          id: 'msg_dummy',
          groupId: group.id,
          memberId: 'system',
          authorId: 'system', // Add missing authorId field
          content: 'Test message for conversation analysis',
          type: 'member' as const,
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
        memberId: 'ai-facilitator',
        content: aiResponse.message,
        type: 'ai_facilitator'
      });

      // Broadcast AI response to group
      this.io.to(groupId).emit('new_message', {
        ...aiMessage,
        member: {
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

      logger.info(`Manual facilitator response generated for group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error handling facilitator request:', error);
      socket.emit('error', { message: 'Failed to request facilitator response' });
    }
  }

  // AI Orchestration Event Handlers
  private async handleAISessionStart(socket: AuthenticatedSocket, data: { groupId: string; memberProfile?: any }) {
    try {
      const member = socket.member!;
      const { groupId, memberProfile } = data;

      // Verify member access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('ai:error', { message: 'Access denied to group' });
        return;
      }

      // Start orchestration session for the group
      const session = await this.orchestratorService.startSession(member.id, groupId, memberProfile);

      // Store the session ID for this group
      this.groupSessions.set(groupId, session.sessionId);

      // Emit session started event to all group members
      this.io.to(groupId).emit('ai:session_started', {
        groupId,
        sessionId: session.sessionId,
        welcomeMessage: session.welcomeMessage,
        agentStatus: {
          facilitator: true,
          sentiment: true,
          crisis: true,
          insight: false,
          matching: false
        },
        timestamp: new Date()
      });

      logger.info(`AI orchestration session started for group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error starting AI session:', error);
      socket.emit('ai:error', { message: 'Failed to start AI session' });
    }
  }

  private async handleAIAgentCall(socket: AuthenticatedSocket, data: { groupId: string; agentId: string; message: string; sessionId: string }) {
    try {
      const member = socket.member!;
      const { groupId, agentId, message, sessionId } = data;

      // Verify member access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('ai:error', { message: 'Access denied to group' });
        return;
      }

      // Call the specific agent
      const response = await this.orchestratorService.callAgentDirectly(agentId, message, sessionId, member.id);

      // Emit AI typing indicator
      this.io.to(groupId).emit('ai:typing', {
        groupId,
        agentId,
        isTyping: true
      });

      // Simulate processing delay for better UX
      setTimeout(async () => {
        // Create AI message in database
        const aiMessage = await this.dbService.createMessage({
          groupId,
          memberId: 'ai-facilitator',
          content: response.response,
          type: 'ai_facilitator'
        });

        // Stop typing indicator
        this.io.to(groupId).emit('ai:typing', {
          groupId,
          agentId,
          isTyping: false
        });

        // Broadcast AI response to all group members
        this.io.to(groupId).emit('ai:response', {
          ...aiMessage,
          agentContext: {
            agentUsed: response.agentUsed,
            confidence: response.confidence,
            toolsUsed: response.toolsUsed,
            metadata: response.metadata
          }
        });

        // Handle crisis intervention if detected
        if (response.metadata?.needsCrisisIntervention) {
          this.io.to(groupId).emit('ai:crisis_detected', {
            groupId,
            messageId: aiMessage.id,
            severity: response.metadata.crisisLevel || 'moderate',
            resources: response.metadata.crisisResources
          });
        }

      }, 1500);

      logger.info(`AI agent ${agentId} called for group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error handling AI agent call:', error);
      socket.emit('ai:error', { message: 'Failed to call AI agent' });
    }
  }

  private async handleCrisisIntervention(socket: AuthenticatedSocket, data: { groupId: string; messageId: string; severity: string }) {
    try {
      const member = socket.member!;
      const { groupId, messageId, severity } = data;

      // Verify member has facilitator permissions
      const group = await this.dbService.getGroupById(groupId);
      if (!group || (!group.facilitators.includes(member.id) && member.role !== 'admin')) {
        socket.emit('ai:error', { message: 'Insufficient permissions for crisis intervention' });
        return;
      }

      // Get the original message for context
      const message = await this.dbService.getMessageById(messageId);
      if (!message) {
        socket.emit('ai:error', { message: 'Message not found' });
        return;
      }

      // Call crisis agent
      const sessionId = this.groupSessions.get(groupId);
      if (!sessionId) {
        socket.emit('ai:error', { message: 'No active AI session for this group' });
        return;
      }

      const crisisResponse = await this.orchestratorService.callAgentDirectly(
        'crisis',
        `Crisis intervention needed for message: "${message.content}". Severity: ${severity}`,
        sessionId,
        member.id
      );

      // Create crisis intervention message
      const crisisMessage = await this.dbService.createMessage({
        groupId,
        memberId: 'ai-crisis',
        content: crisisResponse.response,
        type: 'crisis_intervention'
      });

      // Broadcast crisis intervention to group
      this.io.to(groupId).emit('ai:crisis_intervention', {
        ...crisisMessage,
        originalMessageId: messageId,
        severity,
        resources: crisisResponse.metadata?.resources || []
      });

      // Notify facilitators privately
      const facilitatorSockets = group.facilitators
        .map(facId => this.connectedUsers.get(facId))
        .filter(Boolean);

      facilitatorSockets.forEach(socketId => {
        this.io.to(socketId!).emit('ai:facilitator_alert', {
          groupId,
          messageId,
          severity,
          interventionType: 'crisis',
          requiresAction: severity === 'severe'
        });
      });

      logger.info(`Crisis intervention triggered for group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error handling crisis intervention:', error);
      socket.emit('ai:error', { message: 'Failed to handle crisis intervention' });
    }
  }

  private async handleGroupInsightsRequest(socket: AuthenticatedSocket, data: { groupId: string }) {
    try {
      const member = socket.member!;
      const { groupId } = data;

      // Verify member access to group
      const group = await this.dbService.getGroupById(groupId);
      if (!group || !group.members.includes(member.id)) {
        socket.emit('ai:error', { message: 'Access denied to group' });
        return;
      }

      // Get session for group
      const sessionId = this.groupSessions.get(groupId);
      if (!sessionId) {
        socket.emit('ai:error', { message: 'No active AI session for this group' });
        return;
      }

      // Get recent group messages for context
      const recentMessagesResult = await this.dbService.getMessages(groupId, 50);
      const recentMessages = recentMessagesResult.messages;
      const messagesContext = recentMessages
        .map(msg => `${msg.member?.firstName || 'User'}: ${msg.content}`)
        .join('\n');

      // Call insight agent
      const insightResponse = await this.orchestratorService.callAgentDirectly(
        'insight',
        `Generate insights for group discussion. Recent messages:\n${messagesContext}`,
        sessionId,
        member.id
      );

      // Emit insights to group
      this.io.to(groupId).emit('ai:group_insights', {
        groupId,
        insights: {
          summary: insightResponse.response,
          patterns: insightResponse.metadata?.patterns || [],
          recommendations: insightResponse.metadata?.recommendations || [],
          mood: insightResponse.metadata?.groupMood || 'neutral',
          engagement: insightResponse.metadata?.engagement || 'moderate'
        },
        generatedBy: insightResponse.agentUsed,
        confidence: insightResponse.confidence,
        timestamp: new Date()
      });

      logger.info(`Group insights generated for group ${groupId} by ${member.email}`);
    } catch (error) {
      logger.error('Error generating group insights:', error);
      socket.emit('ai:error', { message: 'Failed to generate group insights' });
    }
  }

}