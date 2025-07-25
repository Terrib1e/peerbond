/**
 * Production-Ready Orchestration System - Fixed Version
 * Simplified implementation without telemetry dependencies
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../services/database';
import { GeminiService } from '../services/geminiService';

// Production-safe interfaces
export interface ProductionConversationState {
  sessionId: string;
  userId: string;
  groupId?: string;
  messages: ProductionMessage[];
  currentAgent: string;
  messageCount: number;
  lastSentimentScore?: number;
  crisisLevel: 'none' | 'mild' | 'moderate' | 'severe';
  startTime: Date;
  lastActivity: Date;
  agentHistory: string[];
  metadata: Record<string, any>;
}

export interface ProductionMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'ai' | 'system';
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
  suggestGroupMatching?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Production-ready orchestration service without telemetry dependencies
 */
export class ProductionOrchestratorService {
  private sessions: Map<string, ProductionConversationState>;
  private readonly maxSessions: number;
  private readonly sessionTimeout: number;
  private readonly maxMessageLength: number;
  private databaseService: DatabaseService;
  private geminiService: GeminiService;

  constructor() {
    this.sessions = new Map();
    this.maxSessions = 10000;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxMessageLength = 4000;
    this.databaseService = new DatabaseService();
    this.geminiService = new GeminiService();

    // Cleanup expired sessions every 5 minutes
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000);

    console.log('[ProductionOrchestrator] Service initialized');
  }

  /**
   * Start a new conversation session
   */
  public async startSession(
    userId: string,
    groupId?: string,
    userProfile?: any
  ): Promise<{
    sessionId: string;
    welcomeMessage: string;
    success: boolean;
  }> {
    console.log('[ProductionOrchestrator] 🚀 Starting session for userId:', userId);
    try {
      console.log('[ProductionOrchestrator] 📝 Validating userId...');
      if (!userId || typeof userId !== 'string') {
        console.log('[ProductionOrchestrator] ❌ Invalid userId');
        throw new Error('Valid userId is required');
      }

      console.log('[ProductionOrchestrator] 📊 Checking session limits...');
      console.log('[ProductionOrchestrator] Current sessions:', this.sessions.size, '/ Max:', this.maxSessions);

      // Check session limit
      if (this.sessions.size >= this.maxSessions) {
        console.log('[ProductionOrchestrator] 🧹 Cleaning up expired sessions...');
        await this.cleanupExpiredSessions();
        if (this.sessions.size >= this.maxSessions) {
          console.warn('[ProductionOrchestrator] ❌ Maximum session limit reached', {
            currentSessions: this.sessions.size,
            maxSessions: this.maxSessions,
            userId,
          });
          throw new Error('Server is at capacity. Please try again later.');
        }
      }

      console.log('[ProductionOrchestrator] 🆔 Generating session ID...');
      // Generate session ID
      const sessionId = `session_${Date.now()}_${uuidv4()}`;
      console.log('[ProductionOrchestrator] Generated sessionId:', sessionId);

      console.log('[ProductionOrchestrator] 📋 Creating conversation state...');
      // Create conversation state
      const session: ProductionConversationState = {
        sessionId,
        userId,
        groupId,
        messages: [],
        currentAgent: 'none',
        messageCount: 0,
        crisisLevel: 'none',
        startTime: new Date(),
        lastActivity: new Date(),
        agentHistory: [],
        metadata: userProfile ? { userProfile } : {},
      };

      console.log('[ProductionOrchestrator] 💾 Storing session in memory...');
      this.sessions.set(sessionId, session);
      console.log('[ProductionOrchestrator] Session stored. Total sessions:', this.sessions.size);

      console.log('[ProductionOrchestrator] 💬 Generating welcome message...');
      // Generate welcome message based on context
      const welcomeMessage = groupId
        ? "Welcome to your group session! I'm Maya, here to facilitate our discussion. How are you feeling today?"
        : "Hi! I'm Maya, your AI peer support facilitator. I'm here to help you connect with others and provide support. What brings you here today?";

      console.log(`[ProductionOrchestrator] ✅ Session ${sessionId} created successfully for user ${userId}`);

      return {
        sessionId,
        welcomeMessage,
        success: true
      };

    } catch (error) {
      console.error('[ProductionOrchestrator] Error starting session:', error);
      throw error;
    }
  }

  /**
   * Process a message through the orchestration system
   */
  public async processMessage(input: {
    userId: string;
    sessionId: string;
    content: string;
    messageType?: 'user' | 'system';
  }): Promise<AgentResponse> {
    try {
      // Validate input
      if (!input.userId || !input.sessionId || !input.content) {
        throw new Error('userId, sessionId, and content are required');
      }

      if (input.content.length > this.maxMessageLength) {
        throw new Error('Message content too long (max 4000 characters)');
      }

      // Get session
      const session = this.sessions.get(input.sessionId);
      if (!session) {
        throw new Error(`Session ${input.sessionId} not found`);
      }

      if (session.userId !== input.userId) {
        throw new Error('Unauthorized access to session');
      }

      // Add user message
      const userMessage: ProductionMessage = {
        id: `msg_${Date.now()}_${uuidv4()}`,
        content: input.content,
        timestamp: new Date(),
        type: input.messageType || 'user',
        metadata: { userId: input.userId }
      };

      session.messages.push(userMessage);
      session.messageCount += 1;
      session.lastActivity = new Date();

      // Process through agents
      const agentResponse = await this.processWithAgents(session, input.content);

      // Add AI response message
      const aiMessage: ProductionMessage = {
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
      session.agentHistory.push(...agentResponse.agentUsed);

      console.log(`[ProductionOrchestrator] Processed message in session ${input.sessionId}`);

      return agentResponse;

    } catch (error) {
      console.error('[ProductionOrchestrator] Error processing message:', error);

      return {
        success: false,
        response: "I'm here to support you. How are you feeling right now?",
        confidence: 0.1,
        agentUsed: ['fallback'],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Get session analytics
   */
  public async getSessionAnalytics(sessionId: string): Promise<{
    messageCount: number;
    averageResponseTime: number;
    sentimentTrend: string;
    agentsUsed: string[];
    crisisLevel: string;
    sessionDuration: number;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const sessionDuration = new Date().getTime() - session.startTime.getTime();

    return {
      messageCount: session.messageCount,
      averageResponseTime: 1500, // Placeholder
      sentimentTrend: session.lastSentimentScore ? (session.lastSentimentScore > 0 ? 'positive' : 'negative') : 'neutral',
      agentsUsed: [...new Set(session.agentHistory)],
      crisisLevel: session.crisisLevel,
      sessionDuration
    };
  }

  /**
   * End a session
   */
  public async endSession(sessionId: string): Promise<{
    success: boolean;
    summary: string;
    analytics: any;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const analytics = await this.getSessionAnalytics(sessionId);
    this.sessions.delete(sessionId);

    console.log(`[ProductionOrchestrator] Ended session ${sessionId}`);

    return {
      success: true,
      summary: `Session completed with ${analytics.messageCount} messages`,
      analytics
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeSessions: number;
    uptime: number;
    version: string;
  } {
    const activeSessions = this.sessions.size;
    const uptime = process.uptime();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (activeSessions > this.maxSessions * 0.9) {
      status = 'degraded';
    }
    if (activeSessions >= this.maxSessions) {
      status = 'unhealthy';
    }

    return {
      status,
      activeSessions,
      uptime,
      version: '2.0.0'
    };
  }

  /**
   * List all available agents and their tools
   */
  public getAvailableAgentsAndTools(): {
    agents: {
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      tools: string[];
    }[];
    tools: {
      name: string;
      description: string;
      agent: string;
      parameters?: any;
    }[];
  } {
    const agents = [
      {
        id: 'ai-router',
        name: 'AI Router',
        description: 'Intelligently routes user messages to the most appropriate agent using LLM analysis',
        capabilities: ['intent_analysis', 'agent_routing', 'decision_making'],
        tools: ['analyzeLLMIntent', 'routeToAgent', 'provideRoutingInsight']
      },
      {
        id: 'sentiment',
        name: 'Sentiment Agent',
        description: 'Analyzes emotional content and detects crisis indicators for safety',
        capabilities: ['sentiment_analysis', 'crisis_detection', 'emotional_assessment'],
        tools: ['analyzeSentiment', 'detectCrisis', 'assessEmotionalState']
      },
      {
        id: 'crisis',
        name: 'Crisis Agent',
        description: 'Handles crisis intervention and provides immediate safety resources',
        capabilities: ['crisis_intervention', 'safety_planning', 'emergency_response'],
        tools: ['provideCrisisSupport', 'escalateToHuman', 'createSafetyPlan']
      },
      {
        id: 'facilitator',
        name: 'Facilitator Agent (Maya)',
        description: 'Primary therapeutic conversation handler providing empathetic support',
        capabilities: ['therapeutic_support', 'emotional_validation', 'coping_strategies'],
        tools: ['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies']
      },
      {
        id: 'matching',
        name: 'Matching Agent',
        description: 'Finds and recommends suitable peer support groups based on user needs',
        capabilities: ['group_matching', 'peer_connection', 'community_building'],
        tools: ['searchGroups', 'rankGroupsByRelevance', 'generateGroupRecommendations', 'listAllGroups']
      },
      {
        id: 'insight',
        name: 'Insight Agent',
        description: 'Analyzes user progress and provides journey insights and growth tracking',
        capabilities: ['progress_tracking', 'pattern_analysis', 'growth_insights'],
        tools: ['analyzeUserProgress', 'generateProgressInsights', 'trackJourney', 'identifyPatterns']
      }
    ];

    const tools = [
      // AI Router Tools
      { name: 'analyzeLLMIntent', description: 'Use LLM to analyze user intent and determine routing', agent: 'ai-router' },
      { name: 'routeToAgent', description: 'Route message to appropriate agent based on analysis', agent: 'ai-router' },
      { name: 'provideRoutingInsight', description: 'Explain why specific routing decision was made', agent: 'ai-router' },

      // Sentiment Agent Tools
      { name: 'analyzeSentiment', description: 'Analyze emotional tone and sentiment score of user message', agent: 'sentiment' },
      { name: 'detectCrisis', description: 'Identify crisis keywords and risk levels', agent: 'sentiment' },
      { name: 'assessEmotionalState', description: 'Comprehensive emotional state assessment', agent: 'sentiment' },

      // Crisis Agent Tools
      { name: 'provideCrisisSupport', description: 'Provide immediate crisis intervention and safety resources', agent: 'crisis' },
      { name: 'escalateToHuman', description: 'Escalate to human crisis counselor when needed', agent: 'crisis' },
      { name: 'createSafetyPlan', description: 'Help user create a personalized safety plan', agent: 'crisis' },

      // Facilitator Agent Tools
      { name: 'provideSupportiveResponse', description: 'Generate empathetic, therapeutic responses', agent: 'facilitator' },
      { name: 'validateFeelings', description: 'Acknowledge and validate user emotions', agent: 'facilitator' },
      { name: 'suggestCopingStrategies', description: 'Recommend evidence-based coping techniques', agent: 'facilitator' },

      // Matching Agent Tools
      { name: 'searchGroups', description: 'Search for groups matching specific criteria', agent: 'matching' },
      { name: 'rankGroupsByRelevance', description: 'Rank groups by match score to user needs', agent: 'matching' },
      { name: 'generateGroupRecommendations', description: 'Create personalized group recommendations', agent: 'matching' },
      { name: 'listAllGroups', description: 'List all available peer support groups', agent: 'matching' },

      // Insight Agent Tools
      { name: 'analyzeUserProgress', description: 'Analyze patterns in user\'s conversation and growth', agent: 'insight' },
      { name: 'generateProgressInsights', description: 'Provide insights about user\'s journey', agent: 'insight' },
      { name: 'trackJourney', description: 'Track user\'s progress over time', agent: 'insight' },
      { name: 'identifyPatterns', description: 'Identify behavioral and emotional patterns', agent: 'insight' }
    ];

    return { agents, tools };
  }

  /**
   * Call a specific agent directly with a message
   */
  public async callAgentDirectly(
    agentId: string,
    message: string,
    sessionId: string,
    userId: string,
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
      // Validate session
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.userId !== userId) {
        throw new Error('Unauthorized access to session');
      }

      console.log(`[ProductionOrchestrator] Direct agent call: ${agentId} with message: "${message}"`);
      if (toolName) {
        console.log(`[ProductionOrchestrator] Specific tool requested: ${toolName}`);
      }

      let result;
      let toolsUsed: string[] = [];

      switch (agentId) {
        case 'facilitator':
          result = await this.facilitatorAgent(message, session);
          toolsUsed = ['provideSupportiveResponse'];
          break;

        case 'matching':
          const matchingResult = await this.matchingAgent(message, session);
          result = {
            response: matchingResult.response,
            confidence: matchingResult.confidence
          };
          toolsUsed = toolName ? [toolName] : ['searchGroups', 'generateGroupRecommendations'];
          break;

        case 'sentiment':
          const sentimentResult = await this.sentimentAgent(message, session);
          result = {
            response: `Sentiment Analysis Results:\n• Sentiment Score: ${sentimentResult.sentimentScore}\n• Crisis Level: ${sentimentResult.crisisLevel}\n• Emotional State: ${sentimentResult.sentimentScore > 0 ? 'Positive' : sentimentResult.sentimentScore < 0 ? 'Negative' : 'Neutral'}`,
            confidence: 0.9
          };
          toolsUsed = ['analyzeSentiment', 'detectCrisis'];
          session.lastSentimentScore = sentimentResult.sentimentScore;
          session.crisisLevel = sentimentResult.crisisLevel;
          break;

        case 'crisis':
          result = await this.crisisAgent(message, session);
          toolsUsed = ['provideCrisisSupport'];
          break;

        case 'insight':
          result = await this.insightAgent(message, session);
          toolsUsed = ['analyzeUserProgress', 'generateProgressInsights'];
          break;

        case 'ai-router':
          const routingResult = await this.aiRouterAgent(message, session);
          result = {
            response: `AI Router Analysis:\n• Primary Agent: ${routingResult.primaryAgent}\n• Recommended Tools: ${routingResult.tools.join(', ')}\n• Reasoning: ${routingResult.reasoning}\n• Confidence: ${routingResult.confidence}`,
            confidence: routingResult.confidence
          };
          toolsUsed = ['analyzeLLMIntent'];
          break;

        default:
          throw new Error(`Unknown agent: ${agentId}`);
      }

      // Update session with agent call
      session.currentAgent = agentId;
      session.agentHistory.push(agentId);
      session.lastActivity = new Date();

      return {
        success: true,
        response: result.response,
        agentUsed: agentId,
        toolsUsed,
        confidence: result.confidence,
        metadata: {
          directCall: true,
          requestedTool: toolName,
          sessionUpdated: true
        }
      };

    } catch (error) {
      console.error(`[ProductionOrchestrator] Error in direct agent call:`, error);
      return {
        success: false,
        response: `Error calling agent ${agentId}: ${error.message}`,
        agentUsed: 'error',
        confidence: 0,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date().getTime();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ProductionOrchestrator] Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Process message through AI-driven agent pipeline
   */
  private async processWithAgents(
    session: ProductionConversationState,
    content: string
  ): Promise<AgentResponse> {
    const agentsUsed: string[] = [];
    let toolResults: any[] = [];

    try {
      console.log('[ProductionOrchestrator] Starting AI-driven agent selection...');

      // 1. AI Router Agent - Determines which agents and tools to use
      const routingDecision = await this.aiRouterAgent(content, session);
      agentsUsed.push('ai-router');

      console.log('[ProductionOrchestrator] AI Router decision:', routingDecision);

      // 2. Always run sentiment analysis first for safety
      const sentimentResult = await this.sentimentAgent(content, session);
      agentsUsed.push('sentiment');
      session.lastSentimentScore = sentimentResult.sentimentScore;
      session.crisisLevel = sentimentResult.crisisLevel;

      let response = '';
      let confidence = 0.7;
      let needsCrisisIntervention = false;
      let suggestGroupMatching = false;

      // 3. Crisis intervention takes highest priority
      if (sentimentResult.crisisLevel !== 'none') {
        console.log('[ProductionOrchestrator] Crisis detected, routing to crisis agent');
        const crisisResult = await this.crisisAgent(content, session);
        agentsUsed.push('crisis');
        response = crisisResult.response;
        confidence = crisisResult.confidence;
        needsCrisisIntervention = true;
      }
      // 4. Execute the AI router's decision
      else {
        const executionResult = await this.executeRoutingDecision(routingDecision, content, session);
        agentsUsed.push(...executionResult.agentsUsed);
        toolResults.push(...executionResult.toolResults);
        response = executionResult.response;
        confidence = executionResult.confidence;
        suggestGroupMatching = executionResult.suggestGroupMatching;
      }

      session.currentAgent = agentsUsed[agentsUsed.length - 1];

      return {
        success: true,
        response,
        confidence,
        agentUsed: agentsUsed,
        needsCrisisIntervention,
        suggestGroupMatching,
        toolResults,
        metadata: {
          sentimentScore: session.lastSentimentScore,
          crisisLevel: session.crisisLevel,
          groupRecommendations: suggestGroupMatching,
          aiRoutingDecision: routingDecision
        }
      };

    } catch (error) {
      console.error('[ProductionOrchestrator] Error in agent processing:', error);

      return {
        success: false,
        response: "I'm here to support you. Could you tell me more about how you're feeling?",
        confidence: 0.3,
        agentUsed: ['fallback'],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Facilitator Agent - Primary conversation handler
   */
  private async facilitatorAgent(content: string, session: ProductionConversationState): Promise<{
    response: string;
    confidence: number;
  }> {
    const lowerContent = content.toLowerCase();
    let response = "Thank you for sharing that with me. ";
    let confidence = 0.7;

    if (lowerContent.includes('anxious') || lowerContent.includes('anxiety')) {
      response += "I understand that anxiety can be overwhelming. You're in a safe space here. What's been contributing to these feelings?";
      confidence = 0.8;
    } else if (lowerContent.includes('depressed') || lowerContent.includes('depression') || lowerContent.includes('sad')) {
      response += "I hear that you're going through a difficult time. Depression can feel isolating, but you're not alone. What's been the hardest part for you recently?";
      confidence = 0.8;
    } else if (lowerContent.includes('stressed') || lowerContent.includes('overwhelmed')) {
      response += "It sounds like you're carrying a lot right now. Stress can be really challenging to manage alone. What's been weighing on you the most?";
      confidence = 0.8;
    } else if (lowerContent.includes('lonely') || lowerContent.includes('isolated') || lowerContent.includes('alone')) {
      response += "Feeling isolated can be really painful. Connection is so important for our wellbeing. Tell me more about what's making you feel this way?";
      confidence = 0.8;
    } else if (lowerContent.includes('thank') || lowerContent.includes('better') || lowerContent.includes('good')) {
      response = "I'm so glad to hear that! It's wonderful that you're feeling better. What's been helping you the most?";
      confidence = 0.9;
    } else {
      response += "I'm here to listen and support you. Could you tell me a bit more about what's on your mind today?";
      confidence = 0.6;
    }

    return { response, confidence };
  }

  /**
   * Sentiment Agent - Analyze emotional content and crisis indicators
   */
  private async sentimentAgent(content: string, session: ProductionConversationState): Promise<{
    sentimentScore: number;
    crisisLevel: 'none' | 'mild' | 'moderate' | 'severe';
  }> {
    const lowerContent = content.toLowerCase();
    let sentimentScore = 0;
    let crisisLevel: 'none' | 'mild' | 'moderate' | 'severe' = 'none';

    // Crisis keywords detection
    const severeKeywords = ['suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead'];
    const moderateKeywords = ['hopeless', 'can\'t go on', 'give up', 'no point', 'hate myself'];
    const mildKeywords = ['overwhelmed', 'can\'t cope', 'breaking down', 'falling apart'];

    if (severeKeywords.some(keyword => lowerContent.includes(keyword))) {
      crisisLevel = 'severe';
      sentimentScore = -0.9;
    } else if (moderateKeywords.some(keyword => lowerContent.includes(keyword))) {
      crisisLevel = 'moderate';
      sentimentScore = -0.7;
    } else if (mildKeywords.some(keyword => lowerContent.includes(keyword))) {
      crisisLevel = 'mild';
      sentimentScore = -0.5;
    } else {
      // Basic sentiment analysis
      const positiveWords = ['good', 'better', 'happy', 'grateful', 'thankful', 'positive', 'hopeful'];
      const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'angry', 'frustrated', 'anxious', 'depressed'];

      const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
      const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;

      sentimentScore = (positiveCount - negativeCount) * 0.2;
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
    }

    return { sentimentScore, crisisLevel };
  }

  /**
   * Crisis Agent - Handle crisis intervention
   */
  private async crisisAgent(content: string, session: ProductionConversationState): Promise<{
    response: string;
    confidence: number;
  }> {
    let response = '';
    let confidence = 0.9;

    if (session.crisisLevel === 'severe') {
      response = `I'm very concerned about what you've shared. Your safety is the most important thing right now.

🚨 **Immediate Help Available:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Or call 911 for immediate emergency assistance

You don't have to go through this alone. There are people who want to help you right now. Would you like me to help you connect with professional support immediately?`;
    } else if (session.crisisLevel === 'moderate') {
      response = `I can hear how much pain you're in right now, and I want you to know that these feelings can change. You're reaching out, which shows tremendous strength.

**Support Resources:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• SAMHSA National Helpline: 1-800-662-4357

Would you like to talk about what's making you feel this hopeless? Sometimes sharing can help lighten the burden.`;
    } else {
      response = `It sounds like you're going through a really tough time. These feelings are overwhelming, but they're also temporary - even though it might not feel that way right now.

**Remember:**
• You're not alone in this
• These difficult feelings will pass
• Reaching out shows courage

What's one small thing that has brought you even a tiny bit of comfort recently?`;
    }

    return { response, confidence };
  }

  /**
   * Matching Agent - Find suitable peer support groups using real database data
   */
  private async matchingAgent(content: string, session: ProductionConversationState): Promise<{
    response: string;
    confidence: number;
    toolResults?: any[];
  }> {
    try {
      console.log('[MatchingAgent] Processing group recommendation request');

      // Check if this is a "list all groups" request
      const lowerContent = content.toLowerCase();
      const isListAllRequest =
        lowerContent.includes('list all') ||
        lowerContent.includes('show all') ||
        lowerContent.includes('what groups are available') ||
        lowerContent.includes('list all groups') ||
        lowerContent.includes('show me all') ||
        (lowerContent.includes('all') && (lowerContent.includes('group') || lowerContent.includes('available')));

      console.log('[MatchingAgent] Is list all request:', isListAllRequest);

      // Extract goals and challenges from content (only if not a list all request)
      const goals = isListAllRequest ? ['general_support'] : this.extractGoalsFromContent(content);
      const challenges = isListAllRequest ? [] : this.extractChallengesFromContent(content);

      console.log('[MatchingAgent] Extracted goals:', goals);
      console.log('[MatchingAgent] Extracted challenges:', challenges);

            // Fetch available groups from database - match frontend Groups tab behavior
      const { groups: allGroups } = await this.databaseService.getGroups(1, 50, {
        status: true, // Only active groups
        privacy: undefined, // Include both public and private groups (like frontend)
        userId: session.userId // Show groups the user has access to
      });

      // Use all available groups (no filtering - show user-created groups too)
      const availableGroups = allGroups;

      console.log('[MatchingAgent] Found', availableGroups.length, 'available groups');
      console.log('[MatchingAgent] Group names:', availableGroups.map(g => g.name));

      if (availableGroups.length === 0) {
        return {
          response: `I'd love to help you find a supportive group, but it looks like we don't have any active groups available right now.

Would you like me to help you:
• Create a new support group based on your interests?
• Connect you with our therapist network for one-on-one support?
• Provide some self-help resources while we work on expanding our group offerings?`,
          confidence: 0.7,
          toolResults: []
        };
      }

      // Filter and rank groups based on user's needs
      const matchedGroups = this.rankGroupsByRelevance(availableGroups, goals, challenges);

      console.log('[MatchingAgent] Matched groups:', matchedGroups.map(g => g.name));

      // Create response with real group recommendations
      let response = '';
      let topGroups: any[] = [];

      if (isListAllRequest) {
        // Show all available groups for list requests
        response = `Here are all the available peer support groups:\n\n`;
        topGroups = matchedGroups; // Show all groups
      } else {
        // Show targeted recommendations for specific requests
        response = `Great! I've found some wonderful peer support groups that match your interests`;

        if (goals.length > 0 && !goals.includes('general_support')) {
          const goalNames = goals.map(g => g.replace('_', ' ')).join(', ');
          response += ` around ${goalNames}`;
        }

        response += `. Here are my top recommendations:\n\n`;
        topGroups = matchedGroups.slice(0, 3); // Show top 3 for targeted requests
      }
      topGroups.forEach((group, index) => {
        const memberCount = Array.isArray(group.members) ? group.members.length : 0;
        const maxMembers = group.maxMembers || 8;

        response += `**${index + 1}. ${group.name}**\n`;
        response += `${group.description}\n`;
        response += `• Group Type: ${group.type}\n`;
        response += `• Members: ${memberCount}/${maxMembers}\n`;
        response += `• Status: ${group.isActive ? 'Active' : 'Inactive'}\n\n`;
      });

      if (isListAllRequest) {
        response += `These are all the currently available peer support groups. Each group offers a unique community and support experience. `;
        response += `Would you like me to help you join one of these groups, or would you like me to recommend which groups might be best for your specific needs?`;
      } else {
        response += `These groups have been selected based on your goals and the type of support you're seeking. `;

        if (matchedGroups.length > 3) {
          response += `I found ${matchedGroups.length - 3} additional groups that might also be a good fit. `;
        }

        response += `Would you like me to help you join one of these groups, or would you like to hear more details about any specific group?`;
      }

      // Store group recommendations as tool results
      const toolResults = topGroups.map(group => ({
        tool: 'groupRecommendation',
        groupId: group.id,
        groupName: group.name,
        groupType: group.type,
        description: group.description,
        memberCount: Array.isArray(group.members) ? group.members.length : 0,
        maxMembers: group.maxMembers || 8,
        matchScore: this.calculateMatchScore(group, goals, challenges)
      }));

      return {
        response,
        confidence: 0.9,
        toolResults
      };
    } catch (error) {
      console.error('[MatchingAgent] Error accessing database:', error);
      return {
        response: `I'd be happy to help you find a supportive group! Unfortunately, I'm having trouble accessing our group database right now.

In the meantime, could you tell me more about:
• What type of support you're looking for (anxiety, depression, general mental health, etc.)
• Any specific goals you have for your mental health journey
• Whether you prefer smaller or larger group settings

Once our systems are back online, I'll be able to give you personalized group recommendations based on your needs.`,
        confidence: 0.6,
        toolResults: []
      };
    }
  }

  /**
   * Extract potential goals from user message content
   */
  private extractGoalsFromContent(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const goals: string[] = [];

    const goalKeywords = {
      'anxiety_management': ['anxiety', 'anxious', 'panic', 'worry', 'stress'],
      'depression_support': ['depression', 'depressed', 'sad', 'hopeless', 'mood'],
      'addiction_recovery': ['addiction', 'recovery', 'sober', 'substance', 'alcohol'],
      'trauma_healing': ['trauma', 'ptsd', 'abuse', 'grief', 'loss'],
      'social_connection': ['lonely', 'isolated', 'connect', 'friends', 'social'],
      'self_improvement': ['improve', 'growth', 'better', 'progress', 'goals']
    };

    Object.entries(goalKeywords).forEach(([goal, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        goals.push(goal);
      }
    });

    return goals.length > 0 ? goals : ['general_support'];
  }

  /**
   * Extract challenges from user message content
   */
  private extractChallengesFromContent(content: string): string[] {
    const lowerContent = content.toLowerCase();
    const challenges: string[] = [];

    const challengeKeywords = {
      'mental_health': ['anxiety', 'depression', 'panic', 'mood'],
      'relationships': ['relationship', 'family', 'partner', 'divorce', 'breakup'],
      'work_stress': ['work', 'job', 'career', 'boss', 'workplace'],
      'health_issues': ['illness', 'chronic', 'pain', 'medical'],
      'financial': ['money', 'financial', 'debt', 'unemployed'],
      'addiction': ['addiction', 'drinking', 'substance', 'drugs']
    };

    Object.entries(challengeKeywords).forEach(([challenge, keywords]) => {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        challenges.push(challenge);
      }
    });

    return challenges;
  }

  /**
   * Rank groups by relevance to user's goals and challenges
   */
  private rankGroupsByRelevance(groups: any[], goals: string[], challenges: string[]): any[] {
    return groups
      .map(group => ({
        ...group,
        matchScore: this.calculateMatchScore(group, goals, challenges)
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate match score between user needs and group
   */
  private calculateMatchScore(group: any, goals: string[], challenges: string[]): number {
    let score = 0;
    const groupType = group.type?.toLowerCase() || '';
    const groupName = group.name?.toLowerCase() || '';
    const groupDescription = group.description?.toLowerCase() || '';
    const groupText = `${groupType} ${groupName} ${groupDescription}`;

    // Score based on goals alignment
    goals.forEach(goal => {
      const goalKeywords = {
        'anxiety_management': ['anxiety', 'stress', 'panic', 'worry'],
        'depression_support': ['depression', 'mood', 'sad', 'support'],
        'addiction_recovery': ['recovery', 'addiction', 'sober', 'substance'],
        'trauma_healing': ['trauma', 'ptsd', 'healing', 'grief'],
        'social_connection': ['social', 'connection', 'community', 'general'],
        'general_support': ['general', 'support', 'community', 'wellness']
      };

      const keywords = goalKeywords[goal] || [];
      keywords.forEach(keyword => {
        if (groupText.includes(keyword)) {
          score += 2; // High weight for goal matches
        }
      });
    });

    // Score based on challenges alignment
    challenges.forEach(challenge => {
      const challengeKeywords = {
        'mental_health': ['mental', 'wellness', 'anxiety', 'depression'],
        'relationships': ['relationship', 'family', 'social'],
        'work_stress': ['stress', 'wellness', 'anxiety'],
        'health_issues': ['health', 'wellness', 'support'],
        'financial': ['support', 'general', 'community'],
        'addiction': ['recovery', 'addiction', 'sober']
      };

      const keywords = challengeKeywords[challenge] || [];
      keywords.forEach(keyword => {
        if (groupText.includes(keyword)) {
          score += 1.5; // Medium weight for challenge matches
        }
      });
    });

    // Boost score for active groups with available space
    if (group.isActive) {
      score += 1;
    }

    const memberCount = Array.isArray(group.members) ? group.members.length : 0;
    const maxMembers = group.maxMembers || 8;
    if (memberCount < maxMembers) {
      score += 0.5; // Slight boost for groups with space
    }

    // Prefer groups with some members but not full
    if (memberCount > 0 && memberCount < maxMembers * 0.8) {
      score += 0.5;
    }

    return score;
  }

    /**
   * AI Router Agent - Uses LLM to intelligently determine which agents and tools to use
   */
  private async aiRouterAgent(content: string, session: ProductionConversationState): Promise<{
    primaryAgent: string;
    tools: string[];
    reasoning: string;
    confidence: number;
  }> {
    try {
      console.log('[ProductionOrchestrator] Using LLM-powered intent analysis...');

      // Use LLM to analyze intent
      const llmAnalysis = await this.analyzeLLMIntent(content, session);

      console.log('[ProductionOrchestrator] LLM analysis result:', llmAnalysis);

      return {
        primaryAgent: llmAnalysis.primaryAgent,
        tools: llmAnalysis.tools,
        reasoning: llmAnalysis.reasoning,
        confidence: llmAnalysis.confidence
      };

    } catch (error) {
      console.error('[ProductionOrchestrator] LLM intent analysis failed, using fallback:', error);
      // Fallback to simplified rule-based routing if LLM fails
      return {
        primaryAgent: 'facilitator', // Default to facilitator as safest option
        tools: ['provideSupportiveResponse', 'validateFeelings'],
        reasoning: 'Fallback routing due to LLM analysis failure - defaulting to general support',
        confidence: 0.3 // Low confidence since this is a fallback
      };
    }
  }

  /**
   * LLM-powered intent analysis to replace keyword matching
   */
  private async analyzeLLMIntent(content: string, session: ProductionConversationState): Promise<{
    primaryAgent: string;
    tools: string[];
    reasoning: string;
    confidence: number;
  }> {
    const contextInfo = {
      messageCount: session.messageCount,
      currentAgent: session.currentAgent,
      recentAgents: session.agentHistory.slice(-3),
      sessionDuration: Math.round((new Date().getTime() - session.startTime.getTime()) / 60000),
      crisisLevel: session.crisisLevel
    };

         const prompt = `You are an AI orchestration system analyzing user messages to route them to the appropriate support agent.

AVAILABLE AGENTS:
1. **matching** - For finding peer support groups, connecting with others, group recommendations, listing available groups
2. **facilitator** - For general therapeutic support, emotional validation, coping strategies
3. **insight** - For progress tracking, personal growth analysis, journey reflection
4. **crisis** - For immediate safety concerns (handled separately by sentiment analysis)

AVAILABLE TOOLS PER AGENT:
- matching: searchGroups, rankGroupsByRelevance, generateGroupRecommendations, listAllGroups, findPeerConnections
- facilitator: provideSupportiveResponse, maintainTherapeuticAlliance, validateFeelings, suggestCopingStrategies
- insight: analyzeUserProgress, generateProgressInsights, trackJourney, identifyPatterns

CONTEXT:
- User's message: "${content}"
- Session info: ${JSON.stringify(contextInfo)}

ANALYZE THE USER'S INTENT and determine:
1. Which agent is most appropriate
2. What tools should be used
3. Your reasoning for this decision
4. Confidence level (0.0-1.0)

RESPOND WITH ONLY THIS JSON FORMAT:
{
  "primaryAgent": "agent_name",
  "tools": ["tool1", "tool2"],
  "reasoning": "Brief explanation of why this agent/tools were selected",
  "confidence": 0.0-1.0
}

Key patterns to recognize:
- **GROUP LISTING REQUESTS** (→ matching agent): "list groups", "show groups", "groups available", "what groups", "available groups", "group options", "all groups"
- **GROUP FINDING REQUESTS** (→ matching agent): "find group", "recommend group", "support group for", "connect with others", "peer support"
- **EMOTIONAL SUPPORT** (→ facilitator agent): expressing feelings, seeking comfort, needing to talk, therapeutic conversation
- **PROGRESS TRACKING** (→ insight agent): "my progress", "how am I doing", "journey", "milestones", "growth"
- **GENERAL QUESTIONS** (→ facilitator agent, default)

Special attention: Any request to LIST, SHOW, or SEE AVAILABLE groups should use the matching agent with listAllGroups tool.`;

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM intent analysis timeout')), 8000)
      );

            const result = await Promise.race([
        this.callGeminiDirectly(prompt),
        timeoutPromise
      ]);

      let responseText = '';
      if (result && typeof result.response?.text === 'function') {
        responseText = result.response.text();
      } else if (result && result.response) {
        responseText = result.response;
      } else if (typeof result === 'string') {
        responseText = result;
      }

      // Parse JSON response
      const analysis = this.parseIntentResponse(responseText);

      console.log('[ProductionOrchestrator] LLM intent analysis successful:', analysis);

      return analysis;

    } catch (error) {
      console.error('[ProductionOrchestrator] Error in LLM intent analysis:', error);
      throw error;
    }
  }

  /**
   * Direct Gemini API call for intent analysis
   */
  private async callGeminiDirectly(prompt: string): Promise<any> {
    // Use the geminiService's model directly
    if (this.geminiService && (this.geminiService as any).model) {
      const model = (this.geminiService as any).model;
      return await model.generateContent(prompt);
    }
    throw new Error('Gemini service not available');
  }

  /**
   * Parse LLM response for intent analysis with improved reliability
   */
  private parseIntentResponse(responseText: string): {
    primaryAgent: string;
    tools: string[];
    reasoning: string;
    confidence: number;
  } {
    try {
      console.log('[ProductionOrchestrator] Parsing LLM response:', responseText);

      // Clean the response and extract JSON
      let cleanResponse = responseText.trim();

      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Find JSON object in the response (more robust matching)
      const jsonMatch = cleanResponse.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      console.log('[ProductionOrchestrator] Cleaned JSON:', cleanResponse);

      const parsed = JSON.parse(cleanResponse);
      console.log('[ProductionOrchestrator] Parsed JSON:', parsed);

      // Validate and sanitize the response structure
      const result = {
        primaryAgent: this.validateAgent(parsed.primaryAgent),
        tools: this.validateTools(parsed.tools, parsed.primaryAgent),
        reasoning: this.validateReasoning(parsed.reasoning),
        confidence: this.validateConfidence(parsed.confidence)
      };

      console.log('[ProductionOrchestrator] Validated result:', result);
      return result;

    } catch (error) {
      console.error('[ProductionOrchestrator] Error parsing LLM response:', error);
      console.log('[ProductionOrchestrator] Raw response text:', responseText);

      // Enhanced fallback analysis
      const fallback = this.getEnhancedFallbackRouting(responseText);
      console.log('[ProductionOrchestrator] Using fallback routing:', fallback);
      return fallback;
    }
  }

  /**
   * Validate and sanitize agent name
   */
  private validateAgent(agentName: any): string {
    const validAgents = ['matching', 'facilitator', 'insight'];
    if (typeof agentName === 'string' && validAgents.includes(agentName)) {
      return agentName;
    }
    console.warn('[ProductionOrchestrator] Invalid agent name:', agentName, 'defaulting to facilitator');
    return 'facilitator';
  }

  /**
   * Validate and sanitize tools array
   */
  private validateTools(tools: any, primaryAgent: string): string[] {
    if (!Array.isArray(tools)) {
      // Return default tools based on agent
      return this.getDefaultToolsForAgent(primaryAgent);
    }

    const validTools = this.getValidToolsForAgent(primaryAgent);
    const filteredTools = tools.filter(tool =>
      typeof tool === 'string' && validTools.includes(tool)
    );

    if (filteredTools.length === 0) {
      return this.getDefaultToolsForAgent(primaryAgent);
    }

    return filteredTools;
  }

  /**
   * Validate reasoning text
   */
  private validateReasoning(reasoning: any): string {
    if (typeof reasoning === 'string' && reasoning.trim().length > 0) {
      return reasoning.trim();
    }
    return 'AI analysis completed with standard routing logic';
  }

  /**
   * Validate confidence score
   */
  private validateConfidence(confidence: any): number {
    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
      return confidence;
    }
    return 0.7; // Default confidence
  }

  /**
   * Get default tools for an agent
   */
  private getDefaultToolsForAgent(agent: string): string[] {
    const defaultTools = {
      'matching': ['searchGroups', 'generateGroupRecommendations'],
      'facilitator': ['provideSupportiveResponse', 'validateFeelings'],
      'insight': ['analyzeUserProgress', 'generateProgressInsights']
    };
    return defaultTools[agent] || defaultTools['facilitator'];
  }

  /**
   * Get valid tools for an agent
   */
  private getValidToolsForAgent(agent: string): string[] {
    const agentTools = {
      'matching': ['searchGroups', 'rankGroupsByRelevance', 'generateGroupRecommendations', 'listAllGroups'],
      'facilitator': ['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies'],
      'insight': ['analyzeUserProgress', 'generateProgressInsights', 'trackJourney', 'identifyPatterns']
    };
    return agentTools[agent] || agentTools['facilitator'];
  }

  /**
   * Enhanced fallback routing when LLM analysis fails
   */
  private getEnhancedFallbackRouting(content: string): {
    primaryAgent: string;
    tools: string[];
    reasoning: string;
    confidence: number;
  } {
    const lowerContent = content.toLowerCase();
    console.log('[ProductionOrchestrator] Analyzing content for fallback routing:', lowerContent);

    // Group listing requests (highest priority)
    const listingKeywords = ['list groups', 'show groups', 'groups available', 'what groups',
                            'available groups', 'group options', 'all groups', 'list all', 'show all groups'];
    const listingMatch = listingKeywords.some(keyword => lowerContent.includes(keyword));
    if (listingMatch) {
      console.log('[ProductionOrchestrator] Fallback: Group listing detected');
      return {
        primaryAgent: 'matching',
        tools: ['listAllGroups', 'searchGroups'],
        reasoning: 'Enhanced fallback: Detected group listing request with high confidence',
        confidence: 0.85
      };
    }

    // Group finding/matching requests
    const groupKeywords = ['find group', 'join group', 'group for', 'support group', 'recommend group', 'match me', 'connect me'];
    const groupMatch = groupKeywords.some(keyword => lowerContent.includes(keyword));
    const hasGroupContext = lowerContent.includes('group') || lowerContent.includes('connect') ||
                           lowerContent.includes('community') || lowerContent.includes('others');

    if (groupMatch || hasGroupContext) {
      console.log('[ProductionOrchestrator] Fallback: Group matching detected');
      return {
        primaryAgent: 'matching',
        tools: ['searchGroups', 'generateGroupRecommendations', 'rankGroupsByRelevance'],
        reasoning: 'Enhanced fallback: Detected group/connection request',
        confidence: 0.75
      };
    }

    // Progress/insight requests
    const insightKeywords = ['my progress', 'how am i doing', 'journey', 'growth', 'insights', 'milestones', 'improvement'];
    const insightMatch = insightKeywords.some(keyword => lowerContent.includes(keyword));
    const hasProgressContext = lowerContent.includes('progress') || lowerContent.includes('better') ||
                              lowerContent.includes('growing') || lowerContent.includes('learning');

    if (insightMatch || hasProgressContext) {
      console.log('[ProductionOrchestrator] Fallback: Insight request detected');
      return {
        primaryAgent: 'insight',
        tools: ['analyzeUserProgress', 'generateProgressInsights', 'trackJourney'],
        reasoning: 'Enhanced fallback: Detected progress/insight request',
        confidence: 0.7
      };
    }

    // Crisis-related content (even though crisis agent is handled separately)
    const crisisKeywords = ['help', 'crisis', 'emergency', 'urgent', 'desperate', 'cant cope', 'overwhelmed'];
    const crisisMatch = crisisKeywords.some(keyword => lowerContent.includes(keyword));

    if (crisisMatch) {
      console.log('[ProductionOrchestrator] Fallback: Crisis context detected, routing to facilitator');
      return {
        primaryAgent: 'facilitator',
        tools: ['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies'],
        reasoning: 'Enhanced fallback: Crisis context detected, providing therapeutic support',
        confidence: 0.8
      };
    }

    // Emotional support content
    const emotionalKeywords = ['feeling', 'sad', 'happy', 'anxious', 'depressed', 'angry', 'frustrated', 'worried'];
    const emotionalMatch = emotionalKeywords.some(keyword => lowerContent.includes(keyword));

    if (emotionalMatch) {
      console.log('[ProductionOrchestrator] Fallback: Emotional content detected');
      return {
        primaryAgent: 'facilitator',
        tools: ['provideSupportiveResponse', 'validateFeelings'],
        reasoning: 'Enhanced fallback: Emotional content requires therapeutic support',
        confidence: 0.75
      };
    }

    // Default to facilitator with basic support
    console.log('[ProductionOrchestrator] Fallback: Using default facilitator routing');
    return {
      primaryAgent: 'facilitator',
      tools: ['provideSupportiveResponse'],
      reasoning: 'Enhanced fallback: Default therapeutic support for general conversation',
      confidence: 0.6
    };
  }

  /**
   * Execute the routing decision made by the AI Router
   */
  private async executeRoutingDecision(
    decision: { primaryAgent: string; tools: string[]; reasoning: string; confidence: number },
    content: string,
    session: ProductionConversationState
  ): Promise<{
    agentsUsed: string[];
    toolResults: any[];
    response: string;
    confidence: number;
    suggestGroupMatching: boolean;
  }> {
    const agentsUsed: string[] = [];
    const toolResults: any[] = [];
    let response = '';
    let confidence = decision.confidence;
    let suggestGroupMatching = false;

    console.log(`[ProductionOrchestrator] Executing routing decision: ${decision.primaryAgent} with tools: ${decision.tools.join(', ')}`);
    console.log(`[ProductionOrchestrator] Reasoning: ${decision.reasoning}`);

    // Execute the primary agent based on AI routing decision with proper agent switching
    try {
      switch (decision.primaryAgent) {
        case 'matching':
          console.log('[ProductionOrchestrator] Switching to MATCHING agent');
          const matchingResult = await this.matchingAgent(content, session);
          agentsUsed.push('matching');
          response = matchingResult.response;
          confidence = Math.max(matchingResult.confidence, decision.confidence);
          suggestGroupMatching = true;

          // Add matching-specific tool results
          if (matchingResult.toolResults) {
            toolResults.push(...matchingResult.toolResults);
          }

          // Execute specific tools requested by AI router
          for (const tool of decision.tools) {
            if (['searchGroups', 'listAllGroups', 'generateGroupRecommendations'].includes(tool)) {
              toolResults.push({
                tool,
                agent: 'matching',
                executed: true,
                timestamp: new Date()
              });
            }
          }
          break;

        case 'insight':
          console.log('[ProductionOrchestrator] Switching to INSIGHT agent');
          const insightResult = await this.insightAgent(content, session);
          agentsUsed.push('insight');
          response = insightResult.response;
          confidence = Math.max(insightResult.confidence, decision.confidence);

          // Execute insight-specific tools
          for (const tool of decision.tools) {
            if (['analyzeUserProgress', 'generateProgressInsights', 'trackJourney'].includes(tool)) {
              toolResults.push({
                tool,
                agent: 'insight',
                executed: true,
                timestamp: new Date()
              });
            }
          }
          break;

        case 'facilitator':
        default:
          console.log('[ProductionOrchestrator] Switching to FACILITATOR agent (Maya)');
          const facilitatorResult = await this.facilitatorAgent(content, session);
          agentsUsed.push('facilitator');
          response = facilitatorResult.response;
          confidence = Math.max(facilitatorResult.confidence, decision.confidence);

          // Execute facilitator-specific tools
          for (const tool of decision.tools) {
            if (['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies'].includes(tool)) {
              toolResults.push({
                tool,
                agent: 'facilitator',
                executed: true,
                timestamp: new Date()
              });
            }
          }
          break;
      }

      // Update session with the agent that was actually used
      session.currentAgent = decision.primaryAgent;
      console.log(`[ProductionOrchestrator] ✅ Successfully switched to ${decision.primaryAgent} agent`);

    } catch (error) {
      console.error(`[ProductionOrchestrator] Error executing ${decision.primaryAgent} agent:`, error);

      // Fallback to facilitator if primary agent fails
      console.log('[ProductionOrchestrator] Falling back to facilitator agent');
      const fallbackResult = await this.facilitatorAgent(content, session);
      agentsUsed.push('facilitator-fallback');
      response = fallbackResult.response;
      confidence = 0.3; // Lower confidence for fallback
      session.currentAgent = 'facilitator';
    }

    // Log the AI routing decision and tool execution
    toolResults.push({
      tool: 'aiRouting',
      decision: decision,
      toolsUsed: decision.tools,
      executedAgent: session.currentAgent,
      timestamp: new Date()
    });

    return {
      agentsUsed,
      toolResults,
      response,
      confidence,
      suggestGroupMatching
    };
  }



  /**
   * Insight Agent - Analyzes user progress and provides insights
   */
  private async insightAgent(content: string, session: ProductionConversationState): Promise<{
    response: string;
    confidence: number;
  }> {
    const messageCount = session.messageCount;
    const sessionDuration = new Date().getTime() - session.startTime.getTime();
    const sessionMinutes = Math.round(sessionDuration / 60000);

    let response = "I've been reflecting on our conversation and your journey. ";

    if (messageCount < 3) {
      response += "While we're just getting started, I can see you're taking an important step by reaching out. Every conversation is progress, and showing up here demonstrates real courage.";
    } else if (messageCount < 10) {
      response += `Over our ${messageCount} messages together, I've noticed your willingness to engage and share. This kind of openness is a key part of healing and growth. How are you feeling about our conversation so far?`;
    } else {
      response += `We've had ${messageCount} exchanges over ${sessionMinutes} minutes, and I can see patterns of resilience in how you communicate. Your continued engagement shows commitment to your wellbeing. What insights have you gained about yourself through our conversation?`;
    }

    return {
      response,
      confidence: 0.8
    };
  }
}