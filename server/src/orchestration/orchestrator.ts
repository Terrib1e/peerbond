/**
 * Clean Production Orchestrator - Uses Real Agent Classes
 * Simplified architecture that properly integrates the agent system
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentFactory, AgentType } from '../agents/AgentFactory';
import { ToolContext } from '../tools/schemas';
import { logger } from '../utils/logger';

export interface ConversationState {
  sessionId: string;
  memberId: string;
  groupId?: string;
  messages: Message[];
  currentAgent: string;
  messageCount: number;
  lastSentimentScore?: number;
  crisisLevel: 'none' | 'mild' | 'moderate' | 'severe';
  startTime: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}

export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  type: 'member' | 'ai' | 'system';
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  response: string;
  confidence: number;
  agentUsed: string[];
  toolResults?: any[];
  needsCrisisIntervention?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Clean orchestrator that uses the real agent system
 */
export class ProductionOrchestratorService {
  private sessions: Map<string, ConversationState>;
  private agentFactory: AgentFactory;
  private readonly maxSessions: number;
  private readonly sessionTimeout: number;

  constructor() {
    this.sessions = new Map();
    this.agentFactory = AgentFactory.getInstance();
    this.maxSessions = 10000;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes

    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);

    logger.info('[ProductionOrchestrator] Service initialized with real agent system');
  }

  /**
   * Start a new conversation session
   */
  public async startSession(
    memberId: string,
    groupId?: string,
    memberProfile?: any
  ): Promise<{
    sessionId: string;
    welcomeMessage: string;
    success: boolean;
  }> {
    try {
      if (!memberId || typeof memberId !== 'string') {
        throw new Error('Valid memberId is required');
      }

      // Check session limit
      if (this.sessions.size >= this.maxSessions) {
        await this.cleanupExpiredSessions();
        if (this.sessions.size >= this.maxSessions) {
          throw new Error('Server is at capacity. Please try again later.');
        }
      }

      // Generate session ID
      const sessionId = `session_${Date.now()}_${uuidv4()}`;

      // Create conversation state
      const session: ConversationState = {
        sessionId,
        memberId,
        groupId,
        messages: [],
        currentAgent: 'none',
        messageCount: 0,
        crisisLevel: 'none',
        startTime: new Date(),
        lastActivity: new Date(),
        metadata: memberProfile ? { memberProfile } : {},
      };

      this.sessions.set(sessionId, session);

      // Generate welcome message using Maya
      const welcomeMessage = groupId
        ? "Welcome to your group session! I'm Maya, here to facilitate our discussion. How are you feeling today?"
        : "Hi! I'm Maya, your AI peer support facilitator. I'm here to help you connect with others and provide support. What brings you here today?";

      logger.info(`[ProductionOrchestrator] Session ${sessionId} created for member ${memberId}`);

      return {
        sessionId,
        welcomeMessage,
        success: true
      };

    } catch (error) {
      logger.error('[ProductionOrchestrator] Error starting session:', error);
      throw error;
    }
  }

  /**
   * Process a message through the real agent system
   */
  public async processMessage(input: {
    memberId: string;
    sessionId: string;
    content: string;
    messageType?: 'member' | 'system';
  }): Promise<AgentResponse> {
    try {
      // Validate input
      if (!input.memberId || !input.sessionId || !input.content) {
        throw new Error('memberId, sessionId, and content are required');
      }

      // Get session
      const session = this.sessions.get(input.sessionId);
      if (!session) {
        throw new Error(`Session ${input.sessionId} not found`);
      }

      if (session.memberId !== input.memberId) {
        throw new Error('Unauthorized access to session');
      }

      // Add member message
      const memberMessage: Message = {
        id: `msg_${Date.now()}_${uuidv4()}`,
        content: input.content,
        timestamp: new Date(),
        type: input.messageType || 'member',
        metadata: { memberId: input.memberId }
      };

      session.messages.push(memberMessage);
      session.messageCount += 1;
      session.lastActivity = new Date();

      // Process with real agents
      const agentResponse = await this.processWithRealAgents(session, input.content);

      // Add AI response message
      const aiMessage: Message = {
        id: `msg_${Date.now()}_${uuidv4()}`,
        content: agentResponse.response,
        timestamp: new Date(),
        type: 'ai',
        agentId: agentResponse.agentUsed[agentResponse.agentUsed.length - 1],
        metadata: {
          confidence: agentResponse.confidence,
          agentsUsed: agentResponse.agentUsed
        }
      };

      session.messages.push(aiMessage);

      logger.info(`[ProductionOrchestrator] Processed message in session ${input.sessionId}`, {
        agentsUsed: agentResponse.agentUsed,
        confidence: agentResponse.confidence
      });

      return agentResponse;

    } catch (error) {
      logger.error('[ProductionOrchestrator] Error processing message:', error);

      return {
        success: false,
        response: "I'm here to support you. While I'm having a technical moment, please know that what you're sharing is important. Can you tell me a bit more about what's on your mind?",
        confidence: 0.1,
        agentUsed: ['fallback'],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Process message using real agent classes
   */
  private async processWithRealAgents(
    session: ConversationState,
    content: string
  ): Promise<AgentResponse> {
    const agentsUsed: string[] = [];
    let needsCrisisIntervention = false;

    try {
      // Step 1: Always run sentiment analysis for safety
      logger.info('[ProductionOrchestrator] Running sentiment analysis...');
      const sentimentAgent = this.agentFactory.getAgent('sentiment');
      
      if (sentimentAgent) {
        const sentimentContext: Omit<ToolContext, 'agent'> = {
          memberId: session.memberId,
          sessionId: session.sessionId,
          groupId: session.groupId,
          timestamp: new Date()
        };

        const sentimentResult = await sentimentAgent.execute(content, sentimentContext);
        agentsUsed.push('sentiment');
        
        // Check for crisis
        if (sentimentResult.metadata?.crisisDetected) {
          session.crisisLevel = 'severe';
          needsCrisisIntervention = true;
          logger.warn('[ProductionOrchestrator] Crisis detected, escalating to crisis agent');
        }
      }

      // Step 2: Route to appropriate primary agent
      let primaryAgentType: AgentType = 'facilitator'; // Default to Maya
      
      // Enhanced intent detection
      const lowerContent = content.toLowerCase();
      
      // Group matching triggers
      const groupKeywords = ['group', 'community', 'support group', 'peer support'];
      const searchKeywords = ['find', 'search', 'looking for', 'need', 'join', 'connect with'];
      const hasGroupKeyword = groupKeywords.some(keyword => lowerContent.includes(keyword));
      const hasSearchKeyword = searchKeywords.some(keyword => lowerContent.includes(keyword));
      
      if (hasGroupKeyword && hasSearchKeyword) {
        primaryAgentType = 'matching';
      } else if (lowerContent.includes('progress') || lowerContent.includes('insight') || lowerContent.includes('how am i doing')) {
        primaryAgentType = 'insight';
      } else if (needsCrisisIntervention) {
        primaryAgentType = 'crisis';
      }

      logger.info(`[ProductionOrchestrator] Routing to ${primaryAgentType} agent`);

      // Step 3: Execute primary agent
      const primaryAgent = this.agentFactory.getAgent(primaryAgentType);
      if (!primaryAgent) {
        throw new Error(`Agent ${primaryAgentType} not available`);
      }

      const agentContext: Omit<ToolContext, 'agent'> = {
        memberId: session.memberId,
        sessionId: session.sessionId,
        groupId: session.groupId,
        timestamp: new Date(),
        metadata: {
          sessionContext: {
            messageCount: session.messageCount,
            crisisLevel: session.crisisLevel,
            previousAgents: agentsUsed
          }
        }
      };

      const agentResult = await primaryAgent.execute(content, agentContext);
      agentsUsed.push(primaryAgentType);

      // Update session state
      session.currentAgent = primaryAgentType;
      if (agentResult.metadata?.sentimentScore) {
        session.lastSentimentScore = agentResult.metadata.sentimentScore;
      }

      logger.info(`[ProductionOrchestrator] ${primaryAgentType} agent executed successfully`, {
        confidence: agentResult.confidence,
        toolsUsed: agentResult.toolsUsed
      });

      return {
        success: true,
        response: agentResult.response,
        confidence: agentResult.confidence,
        agentUsed: agentsUsed,
        toolResults: agentResult.toolResults,
        needsCrisisIntervention,
        metadata: {
          primaryAgent: primaryAgentType,
          toolsUsed: agentResult.toolsUsed,
          sessionContext: {
            messageCount: session.messageCount,
            crisisLevel: session.crisisLevel
          }
        }
      };

    } catch (error) {
      logger.error('[ProductionOrchestrator] Error in agent processing:', error);

      // Fallback to Maya with basic response
      agentsUsed.push('facilitator-fallback');
      
      return {
        success: true,
        response: "I'm here to support you. It takes courage to reach out, and I want you to know that I'm listening. Can you tell me a bit more about what's on your mind right now?",
        confidence: 0.6,
        agentUsed: agentsUsed,
        needsCrisisIntervention,
        metadata: { error: error.message, fallback: true }
      };
    }
  }

  /**
   * Get session info
   */
  public getSession(sessionId: string): ConversationState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Call a specific agent directly with a message
   */
  public async callAgentDirectly(
    agentId: string,
    message: string,
    sessionId: string,
    memberId: string,
    toolName?: string
  ): Promise<{
    success: boolean;
    response: string;
    agentUsed: string;
    toolsUsed?: string[];
    confidence: number;
    metadata?: any;
  }> {
    try {
      // Get or create session
      let session = this.sessions.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          memberId,
          messages: [],
          currentAgent: agentId,
          messageCount: 0,
          crisisLevel: 'none',
          startTime: new Date(),
          lastActivity: new Date(),
          metadata: {}
        };
        this.sessions.set(sessionId, session);
      }

      // Get the specified agent
      const agent = this.agentFactory.getAgent(agentId as any);
      if (!agent) {
        throw new Error(`Agent ${agentId} not available`);
      }

      // Create agent context
      const agentContext: Omit<ToolContext, 'agent'> = {
        memberId,
        sessionId,
        groupId: session.groupId,
        timestamp: new Date(),
        metadata: {
          sessionContext: {
            messageCount: session.messageCount,
            crisisLevel: session.crisisLevel,
            toolName
          }
        }
      };

      // Execute the agent
      const result = await agent.execute(message, agentContext);

      // Update session
      session.currentAgent = agentId;
      session.messageCount += 1;
      session.lastActivity = new Date();
      session.messages.push({
        id: `msg-${Date.now()}`,
        content: message,
        timestamp: new Date(),
        type: 'member'
      }, {
        id: `response-${Date.now()}`,
        content: result.response,
        timestamp: new Date(),
        type: 'ai',
        agentId
      });

      logger.info(`[ProductionOrchestrator] Direct agent call successful: ${agentId}`, {
        confidence: result.confidence,
        toolsUsed: result.toolsUsed
      });

      return {
        success: true,
        response: result.response,
        agentUsed: agentId,
        toolsUsed: result.toolsUsed,
        confidence: result.confidence,
        metadata: result.metadata
      };

    } catch (error) {
      logger.error(`[ProductionOrchestrator] Error in direct agent call (${agentId}):`, error);
      throw error;
    }
  }

  /**
   * Get session analytics and metrics
   */
  public async getSessionAnalytics(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return {
      sessionId: session.sessionId,
      memberId: session.memberId,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      messageCount: session.messageCount,
      currentAgent: session.currentAgent,
      crisisLevel: session.crisisLevel,
      lastSentimentScore: session.lastSentimentScore,
      duration: Date.now() - session.startTime.getTime(),
      messages: session.messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        timestamp: msg.timestamp,
        agentId: msg.agentId,
        contentLength: msg.content.length
      }))
    };
  }

  /**
   * End a conversation session
   */
  public async endSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Get analytics before ending
    const analytics = await this.getSessionAnalytics(sessionId);
    
    // Remove the session
    this.sessions.delete(sessionId);

    logger.info(`[ProductionOrchestrator] Session ended: ${sessionId}`, {
      duration: analytics.duration,
      messageCount: analytics.messageCount
    });

    return {
      success: true,
      sessionId,
      analytics,
      endTime: new Date()
    };
  }

  /**
   * Get all available agents
   */
  public getAvailableAgents() {
    return this.agentFactory.getAgentInfo();
  }

  /**
   * Get health status
   */
  public getHealthStatus() {
    return {
      status: 'healthy' as const,
      activeSessions: this.sessions.size,
      uptime: process.uptime(),
      version: '3.0.0-clean',
      agentsLoaded: this.agentFactory.getAvailableAgentTypes().length
    };
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      logger.info(`[ProductionOrchestrator] Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
}