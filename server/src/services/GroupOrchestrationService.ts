/**
 * Group Orchestration Service - Enhanced AI orchestration for group chats
 * Extends the production orchestrator with group-specific functionality
 */

import { ProductionOrchestratorService, AgentResponse } from '../orchestration/production-ready-fixed';
import { EnhancedOrchestrator } from '../orchestration/EnhancedOrchestrator';
import { DatabaseService } from './database';
import { logger } from '../utils/logger';
import ToolExecutor, { ToolAuditLog } from '../tools/executor';
import { ToolContext } from '../tools/schemas';
import { toolDatabaseIntegration } from './toolDatabaseIntegration';

export interface GroupContext {
  groupId: string;
  groupType: 'recovery' | 'wellness' | 'general';
  memberCount: number;
  activeFacilitators: string[];
  recentActivity: 'high' | 'moderate' | 'low';
  groupMood?: 'positive' | 'neutral' | 'concerning' | 'crisis';
  lastAIIntervention?: Date;
}

export interface GroupAIResponse extends AgentResponse {
  groupContext?: GroupContext;
  needsGroupAction?: boolean;
  suggestGroupMatching?: boolean;
  groupInsights?: GroupInsight[];
}

export interface GroupInsight {
  type: 'participation' | 'mood' | 'progress' | 'risk' | 'connection';
  summary: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

export interface GroupDynamics {
  participationBalance: {
    activeMembers: string[];
    quietMembers: string[];
    dominatingMembers: string[];
  };
  conversationFlow: {
    averageResponseTime: number;
    conversationDepth: 'shallow' | 'moderate' | 'deep';
    topicStability: 'scattered' | 'focused' | 'repetitive';
  };
  emotionalClimate: {
    overallMood: 'positive' | 'neutral' | 'negative' | 'mixed';
    supportLevel: 'high' | 'moderate' | 'low';
    conflictLevel: 'none' | 'mild' | 'moderate' | 'high';
  };
  aiEngagement: {
    lastIntervention: Date | null;
    interventionFrequency: 'low' | 'moderate' | 'high';
    effectivenessScore: number;
  };
}

export class GroupOrchestrationService extends ProductionOrchestratorService {
  private dbService: DatabaseService;
  private toolExecutor: ToolExecutor;
  private enhancedOrchestrator: EnhancedOrchestrator;
  private groupContextCache: Map<string, GroupContext> = new Map();
  private groupSessionsMap: Map<string, string> = new Map(); // groupId -> sessionId

  constructor() {
    super();
    this.dbService = new DatabaseService();
    this.toolExecutor = new ToolExecutor();
    this.enhancedOrchestrator = new EnhancedOrchestrator();

    // Initialize database-integrated tools
    this.initializeDatabaseTools();
  }

  /**
   * Initialize database-integrated tools on startup
   */
  private async initializeDatabaseTools(): Promise<void> {
    try {
      logger.info('🔧 GroupOrchestrationService: Initializing database-integrated tools...');
      await toolDatabaseIntegration.initialize();
      logger.info('✅ GroupOrchestrationService: Database-integrated tools initialized');
    } catch (error) {
      logger.error('❌ GroupOrchestrationService: Failed to initialize database tools:', error);
    }
  }

  /**
   * Process a message within a group context with enhanced orchestration
   */
  async processGroupMessage(params: {
    groupId: string;
    memberId: string;
    message: string;
    sessionId?: string;
    messageId?: string;
  }): Promise<GroupAIResponse> {
    try {
      const { groupId, memberId, message, messageId } = params;

      // Get or create session for the group
      let sessionId = params.sessionId || this.groupSessionsMap.get(groupId);
      if (!sessionId) {
        const session = await this.startSession(memberId, groupId);
        sessionId = session.sessionId;
        this.groupSessionsMap.set(groupId, sessionId);
      }

      // Check for meta-queries about the AI system itself
      const metaResponse = await this.handleMetaQueries(message, sessionId, memberId);
      if (metaResponse) {
        const groupContext = await this.buildGroupContext(groupId);
        return {
          ...metaResponse,
          groupContext,
          needsGroupAction: false,
          groupInsights: [],
          suggestGroupMatching: false,
          metadata: {
            ...metaResponse.metadata,
            groupId,
            messageId,
            groupType: groupContext.groupType,
            memberCount: groupContext.memberCount,
            isMetaQuery: true
          }
        };
      }

      // Build group context
      const groupContext = await this.buildGroupContext(groupId);

      // Enhanced message processing with group context
      const contextualizedMessage = await this.addGroupContext(message, groupContext);

      // Process through AI orchestration
      const response = await this.processMessage({
        memberId,
        sessionId,
        content: contextualizedMessage,
        messageType: 'member'
      });

      // Analyze for group-specific insights
      const groupInsights = await this.analyzeGroupMessage(groupId, message, response);

      // Determine if group-level actions are needed
      const needsGroupAction = await this.assessGroupActionNeeds(groupContext, response);

      return {
        ...response,
        groupContext,
        needsGroupAction,
        groupInsights,
        suggestGroupMatching: this.shouldSuggestGroupMatching(groupContext, response),
        metadata: {
          ...response.metadata,
          groupId,
          messageId,
          groupType: groupContext.groupType,
          memberCount: groupContext.memberCount
        }
      };

    } catch (error) {
      logger.error('Error processing group message:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive insights for a group
   */
  async getGroupInsights(groupId: string): Promise<GroupInsight[]> {
    try {
      const sessionId = this.groupSessionsMap.get(groupId);
      if (!sessionId) {
        throw new Error('No active session for group');
      }

      // Get recent group messages
      const recentMessagesResult = await this.dbService.getMessages(groupId, 100);
      const recentMessages = recentMessagesResult.messages;
      const groupContext = await this.buildGroupContext(groupId);

      // Build context for insight agent
      const messagesContext = recentMessages
        .map(msg => `${msg.timestamp.toISOString()}: ${msg.member?.firstName || 'User'}: ${msg.content}`)
        .join('\n');

      const insightPrompt = `
Analyze this group conversation and provide insights:

Group Context:
- Type: ${groupContext.groupType}
- Members: ${groupContext.memberCount}
- Activity: ${groupContext.recentActivity}
- Mood: ${groupContext.groupMood || 'unknown'}

Recent Messages:
${messagesContext}

Provide insights on:
1. Participation patterns
2. Group mood trends
3. Progress indicators
4. Risk factors
5. Connection quality
`;

      const response = await this.callAgentDirectly('insight', insightPrompt, sessionId, 'system');

      return this.parseGroupInsights(response.response);

    } catch (error) {
      logger.error('Error getting group insights:', error);
      throw error;
    }
  }

  /**
   * Analyze group dynamics and patterns
   */
    async detectGroupDynamics(groupId: string): Promise<GroupDynamics> {
    try {
      const recentMessagesResult = await this.dbService.getMessages(groupId, 200);
      const recentMessages = recentMessagesResult.messages;
      const group = await this.dbService.getGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      // Analyze participation balance
      const participationAnalysis = this.analyzeParticipation(recentMessages, group.members);

      // Analyze conversation flow
      const conversationFlow = this.analyzeConversationFlow(recentMessages);

      // Analyze emotional climate
      const emotionalClimate = await this.analyzeEmotionalClimate(recentMessages);

      // Analyze AI engagement
      const aiEngagement = this.analyzeAIEngagement(recentMessages);

      return {
        participationBalance: participationAnalysis,
        conversationFlow,
        emotionalClimate,
        aiEngagement
      };

    } catch (error) {
      logger.error('Error detecting group dynamics:', error);
      throw error;
    }
  }

  /**
   * Handle crisis detection in group context
   */
  async handleGroupCrisis(params: {
    groupId: string;
    messageId: string;
    memberId: string;
    severity: 'mild' | 'moderate' | 'severe';
    content: string;
  }): Promise<GroupAIResponse> {
    try {
      const { groupId, messageId, memberId, severity, content } = params;

      const sessionId = this.groupSessionsMap.get(groupId);
      if (!sessionId) {
        throw new Error('No active session for group');
      }

      const groupContext = await this.buildGroupContext(groupId);

      const crisisPrompt = `
Crisis intervention needed in group chat:

Group Context:
- Type: ${groupContext.groupType}
- Members: ${groupContext.memberCount}
- Severity: ${severity}

Message requiring intervention: "${content}"

Provide:
1. Immediate supportive response
2. Safety resources
3. Group guidance
4. Escalation recommendations
`;

      const response = await this.callAgentDirectly('crisis', crisisPrompt, sessionId, memberId);

      // Update group context to reflect crisis
      groupContext.groupMood = 'crisis';
      groupContext.lastAIIntervention = new Date();
      this.groupContextCache.set(groupId, groupContext);

      return {
        ...response,
        groupContext,
        needsGroupAction: true,
        agentUsed: Array.isArray(response.agentUsed) ? response.agentUsed : [response.agentUsed],
        metadata: {
          ...response.metadata,
          crisisLevel: severity,
          requiresEscalation: severity === 'severe',
          affectedMessageId: messageId
        }
      };

    } catch (error) {
      logger.error('Error handling group crisis:', error);
      throw error;
    }
  }

  /**
   * Override to use enhanced orchestrator for available agents and tools
   */
  public getAvailableAgentsAndTools(): {
    agents: Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      tools: string[];
    }>;
    tools: Array<{
      name: string;
      description: string;
      agent: string;
    }>;
  } {
    // Use enhanced orchestrator if tool system is enabled
    if (process.env.USE_TOOL_SYSTEM === 'true') {
      return this.enhancedOrchestrator.getAvailableAgentsAndTools();
    }

    // Fall back to parent implementation
    return super.getAvailableAgentsAndTools();
  }

  /**
   * Override callAgentDirectly to use enhanced orchestrator
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
    // Use enhanced orchestrator if tool system is enabled
    if (process.env.USE_TOOL_SYSTEM === 'true') {
      const groupId = this.getGroupIdFromSession(sessionId);
      return this.enhancedOrchestrator.callAgentDirectly(
        agentId,
        message,
        sessionId,
        memberId,
        groupId,
        toolName
      );
    }

    // Fall back to parent implementation
    return super.callAgentDirectly(agentId, message, sessionId, memberId, toolName);
  }

  private getGroupIdFromSession(sessionId: string): string | undefined {
    // Reverse lookup groupId from sessionId
    for (const [groupId, sid] of this.groupSessionsMap.entries()) {
      if (sid === sessionId) {
        return groupId;
      }
    }
    return undefined;
  }

  /**
   * Process message using enhanced orchestrator with tool integration
   */
  private async processWithEnhancedOrchestrator(params: {
    memberId: string;
    sessionId: string;
    groupId?: string;
    content: string;
    messageType: 'member' | 'system';
  }): Promise<AgentResponse> {
    const result = await this.enhancedOrchestrator.processMessage({
      memberId: params.memberId,
      sessionId: params.sessionId,
      groupId: params.groupId,
      content: params.content,
      messageType: params.messageType
    });

    return {
      success: result.success,
      response: result.response,
      confidence: result.confidence,
      agentUsed: result.agentsUsed,
      needsCrisisIntervention: result.needsCrisisIntervention,
      suggestGroupMatching: result.suggestGroupMatching,
      metadata: result.metadata
    };
  }

  /**
   * Override base processMessage to include meta-query detection and multi-agent processing
   */
  async processMessage(params: {
    memberId: string;
    sessionId: string;
    content: string;
    messageType: 'member' | 'system';
  }): Promise<AgentResponse> {
    const { memberId, sessionId, content, messageType } = params;

    console.log('[GroupOrchestration] Processing message with enhanced multi-agent processing:', {
      content: content.slice(0, 100),
      messageType,
      sessionId: sessionId.slice(0, 20) + '...'
    });

    // Use enhanced orchestrator if tool system is enabled
    if (process.env.USE_TOOL_SYSTEM === 'true') {
      console.log('[GroupOrchestration] Using enhanced orchestrator with tool system');
      const groupId = this.getGroupIdFromSession(sessionId);
      return this.processWithEnhancedOrchestrator({
        memberId,
        sessionId,
        groupId,
        content,
        messageType
      });
    }

    // Check for meta-queries first
    const metaResponse = await this.handleMetaQueries(content, sessionId, memberId);
    if (metaResponse) {
      console.log('[GroupOrchestration] Meta-query detected and handled:', {
        query: content,
        responseType: metaResponse.metadata?.queryType
      });
      return metaResponse;
    }

    // Intelligent multi-agent processing - use the right agents for the job
    console.log('[GroupOrchestration] Starting intelligent multi-agent processing');

    const agentsUsed: string[] = [];
    const toolResults: any[] = [];
    let finalResponse = '';
    let highestConfidence = 0;
    let needsCrisisIntervention = false;

    try {
      const contentLower = content.toLowerCase();

      // Step 1: Always run sentiment and crisis detection for safety
      console.log('[GroupOrchestration] Step 1: Running safety checks (sentiment + crisis)');

      const [sentimentResult, crisisResult] = await Promise.all([
        this.callAgentWithTools('sentiment', content, sessionId, memberId).catch(err => {
          console.warn('[GroupOrchestration] Sentiment agent failed:', err);
          return { response: '', confidence: 0, agentUsed: [], toolResults: [] };
        }),
        this.callAgentWithTools('crisis', content, sessionId, memberId).catch(err => {
          console.warn('[GroupOrchestration] Crisis agent failed:', err);
          return { response: '', confidence: 0, agentUsed: [], toolResults: [], needsCrisisIntervention: false };
        })
      ]);

      agentsUsed.push('sentiment', 'crisis');
      if (sentimentResult.toolResults) toolResults.push(...sentimentResult.toolResults);
      if (crisisResult.toolResults) toolResults.push(...crisisResult.toolResults);

      // Check for crisis intervention
      if (crisisResult.needsCrisisIntervention) {
        console.log('[GroupOrchestration] Crisis detected - using crisis response');
        needsCrisisIntervention = true;
        finalResponse = crisisResult.response;
        highestConfidence = crisisResult.confidence;
      } else {
        // Step 2: Determine primary agent based on content
        let primaryAgent = 'facilitator'; // default

        if (contentLower.includes('progress') || contentLower.includes('how am i') || contentLower.includes('journey') || contentLower.includes('doing')) {
          primaryAgent = 'insight';
        } else if (contentLower.includes('group') || contentLower.includes('community') || contentLower.includes('others like me') || contentLower.includes('find')) {
          primaryAgent = 'matching';
        }

        console.log(`[GroupOrchestration] Step 2: Using ${primaryAgent} as primary agent`);

        // Get primary response
        const primaryResult = await this.callAgentWithTools(primaryAgent, content, sessionId, memberId);
        agentsUsed.push(primaryAgent);
        if (primaryResult.toolResults) toolResults.push(...primaryResult.toolResults);

        finalResponse = primaryResult.response;
        highestConfidence = primaryResult.confidence;

        // Step 3: Add facilitator if we used a specialized agent
        if (primaryAgent !== 'facilitator') {
          console.log('[GroupOrchestration] Step 3: Adding facilitator support');
          const facilitatorResult = await this.callAgentWithTools('facilitator', content, sessionId, memberId).catch(err => {
            console.warn('[GroupOrchestration] Facilitator agent failed:', err);
            return { response: '', confidence: 0, agentUsed: [], toolResults: [] };
          });

          agentsUsed.push('facilitator');
          if (facilitatorResult.toolResults) toolResults.push(...facilitatorResult.toolResults);

          // Combine responses intelligently
          if (facilitatorResult.response && facilitatorResult.response.length > 50) {
            finalResponse = this.combineAgentResponses(primaryResult.response, facilitatorResult.response, primaryAgent);
            highestConfidence = Math.max(primaryResult.confidence, facilitatorResult.confidence);
          }
        }
      }

      console.log('[GroupOrchestration] Multi-agent processing completed:', {
        agentsUsed,
        agentCount: agentsUsed.length,
        finalResponse: finalResponse.slice(0, 100) + '...',
        confidence: highestConfidence,
        needsCrisisIntervention,
        toolResultsCount: toolResults.length
      });

      return {
        success: true,
        response: finalResponse,
        confidence: highestConfidence,
        agentUsed: agentsUsed,
        toolResults,
        needsCrisisIntervention,
        suggestGroupMatching: agentsUsed.includes('matching'),
        metadata: {
          processingType: 'multi-agent-pipeline',
          agentCount: agentsUsed.length,
          hasToolResults: toolResults.length > 0,
          processingTime: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[GroupOrchestration] Error in multi-agent processing:', error);

      // Fallback to single agent
      const fallbackResult = await this.callAgentWithTools('facilitator', content, sessionId, memberId);
      return {
        ...fallbackResult,
        agentUsed: ['facilitator', 'fallback'],
        metadata: {
          ...fallbackResult.metadata,
          processingType: 'fallback-single-agent',
          fallbackReason: error.message
        }
      };
    }
  }

  /**
   * Handle meta-queries about the AI system itself
   */
  private async handleMetaQueries(message: string, sessionId: string, memberId: string): Promise<AgentResponse | null> {
    const lowerMessage = message.toLowerCase();

    console.log('[GroupOrchestration] Checking for meta-query:', { message: lowerMessage });

    // Detect meta-query patterns
    const isMetaQuery = this.isMetaQuery(lowerMessage);
    console.log('[GroupOrchestration] Is meta-query:', isMetaQuery);

    if (!isMetaQuery) {
      return null;
    }

    // Generate appropriate response based on query type
    let responseContent = '';
    let agentUsed = ['ai-router'];
    let confidence = 0.95;

    if (this.isAgentCountQuery(lowerMessage)) {
      responseContent = this.generateAgentCountResponse();
    } else if (this.isToolListQuery(lowerMessage)) {
      responseContent = this.generateToolListResponse();
    } else if (this.isCapabilityQuery(lowerMessage)) {
      responseContent = this.generateCapabilityResponse();
    } else if (this.isAgentListQuery(lowerMessage)) {
      responseContent = this.generateAgentListResponse();
    } else if (this.isHowItWorksQuery(lowerMessage)) {
      responseContent = this.generateSystemExplanationResponse();
    } else {
      // General meta-query response
      responseContent = this.generateGeneralMetaResponse();
    }

    return {
      success: true,
      response: responseContent,
      confidence,
      agentUsed,
      toolResults: [],
      needsCrisisIntervention: false,
      suggestGroupMatching: false,
      metadata: {
        queryType: 'meta-information',
        responseType: 'system-information',
        isAuthoritative: true
      }
    };
  }

  /**
   * Check if a message is asking about the AI system itself
   */
  private isMetaQuery(message: string): boolean {
    const metaPatterns = [
      /how many agents/i,
      /what agents/i,
      /list agents/i,
      /agents.*available/i,
      /available.*agents/i,
      /what tools/i,
      /list tools/i,
      /tools.*available/i,
      /available.*tools/i,
      /what can you do/i,
      /what are your capabilities/i,
      /how do you work/i,
      /what is your purpose/i,
      /who are you/i,
      /what ai/i,
      /about this system/i,
      /help me understand/i,
      /explain yourself/i,
      /what kind of ai/i
    ];

    console.log('[GroupOrchestration] Checking meta-query for:', message);
    const isMatch = metaPatterns.some(pattern => pattern.test(message));
    console.log('[GroupOrchestration] Meta-query match:', isMatch);
    return isMatch;
  }

  private isAgentCountQuery(message: string): boolean {
    return /how many agents|count.*agents|number.*agents/i.test(message);
  }

  private isToolListQuery(message: string): boolean {
    return /what tools|list tools|available tools|tools.*have/i.test(message);
  }

  private isCapabilityQuery(message: string): boolean {
    return /what can you do|capabilities|what.*able.*do/i.test(message);
  }

  private isAgentListQuery(message: string): boolean {
    return /what agents|list agents|which agents|available agents/i.test(message);
  }

  private isHowItWorksQuery(message: string): boolean {
    return /how.*work|how.*function|explain.*system|about.*system/i.test(message);
  }

  private generateAgentCountResponse(): string {
    return `I have **6 specialized AI agents** working together to support your group:

🤖 **Active Agents:**
• AI Router - Intelligent message routing
• Facilitator Agent (Maya) - Therapeutic support
• Sentiment Agent - Emotional analysis
• Crisis Agent - Safety monitoring
• Matching Agent - Group recommendations
• Insight Agent - Progress tracking

Each agent has specific expertise to provide the best possible support for your group's needs.`;
  }

  private generateToolListResponse(): string {
    return `Here are the **tools** each agent uses to help your group:

🔧 **AI Router Tools:**
• analyzeLLMIntent - Understand message meaning
• routeToAgent - Choose the right specialist
• provideRoutingInsight - Explain decisions

❤️ **Facilitator Tools:**
• provideSupportiveResponse - Therapeutic guidance
• validateFeelings - Emotional validation
• suggestCopingStrategies - Evidence-based techniques

📊 **Sentiment Tools:**
• analyzeSentiment - Emotional tone analysis
• detectCrisis - Safety monitoring
• assessEmotionalState - Comprehensive evaluation

🚨 **Crisis Tools:**
• provideCrisisSupport - Immediate intervention
• escalateToHuman - Professional referral
• createSafetyPlan - Personalized safety planning

🔗 **Matching Tools:**
• searchGroups - Find similar communities
• rankGroupsByRelevance - Match compatibility
• generateGroupRecommendations - Personalized suggestions

📈 **Insight Tools:**
• analyzeMemberProgress - Track growth patterns
• generateProgressInsights - Journey analysis
• identifyPatterns - Behavioral insights

All tools work together to create a comprehensive support system for your mental health journey.`;
  }

  private generateCapabilityResponse(): string {
    return `I'm an **AI-powered therapeutic support system** designed specifically for peer mental health groups. Here's what I can do:

🎯 **Core Capabilities:**
• **Intelligent Conversation** - Understand context and provide meaningful responses
• **Crisis Detection** - Monitor for concerning language and provide immediate support
• **Emotional Analysis** - Track group mood and individual sentiment
• **Therapeutic Guidance** - Offer evidence-based coping strategies and validation
• **Group Insights** - Analyze participation patterns and progress
• **Safety Monitoring** - Escalate to professionals when needed

💡 **Smart Features:**
• **Context Awareness** - Remember conversation history and group dynamics
• **Proactive Support** - Intervene when silence or distress is detected
• **Resource Sharing** - Provide relevant mental health resources
• **Progress Tracking** - Help you see growth over time
• **Group Matching** - Suggest compatible peer groups

🛡️ **Safety & Privacy:**
• **HIPAA Compliant** - Your privacy is protected
• **Professional Oversight** - Licensed therapists monitor the system
• **Crisis Protocols** - Immediate escalation for emergencies
• **Audit Trails** - All interactions are logged for safety

I'm here to support your healing journey alongside your peers, not replace human connection but enhance it with intelligent, compassionate assistance.`;
  }

  private generateAgentListResponse(): string {
    return `Meet the **AI agent team** supporting your group:

🤖 **AI Router Agent**
*The intelligent coordinator*
Routes your messages to the most helpful specialist agent based on your needs.

❤️ **Maya - Facilitator Agent**
*Your therapeutic companion*
Provides empathetic support, validates feelings, and offers evidence-based coping strategies.

📊 **Sentiment Agent**
*The emotional analyst*
Monitors group mood and individual emotional states to provide timely support.

🚨 **Crisis Agent**
*Your safety guardian*
Detects concerning language and provides immediate crisis intervention with professional resources.

🔗 **Matching Agent**
*The community connector*
Finds compatible peer groups and suggests meaningful connections based on your goals.

📈 **Insight Agent**
*Your progress companion*
Tracks your journey, identifies growth patterns, and celebrates milestones with you.

Each agent specializes in different aspects of mental health support, working together as a unified team to provide comprehensive care for your group.`;
  }

  private generateSystemExplanationResponse(): string {
    return `Here's how the **PeerBond AI system** works to support your group:

🔄 **Smart Message Processing:**
1. **Intake** - Your message is received and analyzed
2. **Routing** - AI Router determines which specialist agent can help best
3. **Analysis** - Multiple agents analyze context, sentiment, and safety
4. **Response** - The most appropriate agent generates a helpful response
5. **Monitoring** - System continuously tracks group health and progress

⚡ **Real-Time Intelligence:**
• **Context Building** - Remembers conversation history and group dynamics
• **Sentiment Tracking** - Monitors emotional climate in real-time
• **Pattern Recognition** - Identifies helpful trends and concerning signals
• **Proactive Support** - Intervenes when support is needed most

🎯 **Adaptive Responses:**
• **Personalized** - Tailored to your group's specific needs and goals
• **Evidence-Based** - Grounded in therapeutic best practices
• **Trauma-Informed** - Sensitive to mental health challenges
• **Culturally Aware** - Respectful of diverse backgrounds and experiences

🛡️ **Safety-First Design:**
• **Human Oversight** - Licensed professionals monitor all interactions
• **Crisis Detection** - Immediate alerts for concerning content
• **Professional Escalation** - Seamless handoff to human experts when needed
• **Privacy Protection** - HIPAA-compliant data handling

The system learns and adapts to better serve your group while maintaining the highest standards of safety and therapeutic effectiveness.`;
  }

  private generateGeneralMetaResponse(): string {
    return `I'm **Maya**, your AI-powered therapeutic facilitator, supported by a team of specialized agents designed for peer mental health support.

💡 **Quick Summary:**
• **6 AI agents** working together for comprehensive support
• **15+ specialized tools** for different therapeutic needs
• **Real-time safety monitoring** with crisis intervention
• **HIPAA-compliant** and professionally supervised

🤔 **Want to know more?** Try asking:
• "How many agents are there?"
• "What tools do you have?"
• "What are your capabilities?"
• "How does this system work?"

I'm here to support your group's healing journey with intelligent, compassionate assistance. What would you like to know?`;
  }

  /**
   * Execute a tool with full validation and audit logging
   */
  async executeToolSafely(
    toolName: string,
    parameters: any,
    context: {
      memberId: string;
      sessionId: string;
      groupId?: string;
      messageId?: string;
      agent: string;
    }
  ): Promise<any> {
    try {
      const toolContext: ToolContext = {
        memberId: context.memberId,
        sessionId: context.sessionId,
        groupId: context.groupId,
        messageId: context.messageId,
        timestamp: new Date(),
        agent: context.agent,
        metadata: { source: 'GroupOrchestrationService' }
      };

      console.log(`[GroupOrchestration] Executing tool: ${toolName}`, {
        agent: context.agent,
        memberId: context.memberId,
        sessionId: context.sessionId.slice(0, 20) + '...'
      });

      const result = await this.toolExecutor.executeTool(toolName, parameters, toolContext);

      if (!result.success) {
        console.error(`[GroupOrchestration] Tool execution failed: ${toolName}`, result.error);
        return null;
      }

      console.log(`[GroupOrchestration] Tool executed successfully: ${toolName}`, {
        confidence: result.confidence,
        requiresEscalation: result.requiresHumanEscalation
      });

      return result.data;
    } catch (error) {
      console.error(`[GroupOrchestration] Tool execution error: ${toolName}`, error);
      return null;
    }
  }

  /**
   * Get audit logs for a session
   */
  async getSessionAuditLogs(sessionId: string): Promise<ToolAuditLog[]> {
    return this.toolExecutor.getAuditLogs(sessionId);
  }

  /**
   * Enhanced agent calling with tool integration
   */
  async callAgentWithTools(
    agentId: string,
    message: string,
    sessionId: string,
    memberId: string,
    groupId?: string
  ): Promise<AgentResponse> {
    console.log(`[GroupOrchestration] Calling agent with tools: ${agentId}`, { message: message.slice(0, 50) });

    try {
      // First analyze intent if this is the router
      if (agentId === 'ai-router') {
        const intentResult = await this.executeToolSafely('analyzeLLMIntent', {
          message,
          conversationHistory: [],
          groupContext: groupId ? await this.buildGroupContext(groupId) : undefined
        }, {
          memberId,
          sessionId,
          groupId,
          agent: 'ai-router'
        });

        if (intentResult) {
          console.log('[GroupOrchestration] Intent analysis completed:', {
            intent: intentResult.primaryIntent,
            suggestedAgent: intentResult.suggestedAgent,
            urgency: intentResult.urgency
          });

          // Route to suggested agent if high confidence
          if (intentResult.confidence > 0.7) {
            return this.callAgentWithTools(
              intentResult.suggestedAgent,
              message,
              sessionId,
              memberId,
              groupId
            );
          }
        }
      }

      // Execute agent-specific tools
      let toolResult = null;
      const context = { memberId, sessionId, groupId, agent: agentId };

      switch (agentId) {
        case 'facilitator':
          // Analyze emotional state first
          const sentimentResult = await this.executeToolSafely('analyzeSentiment', {
            text: message
          }, { ...context, agent: 'sentiment' });

          if (sentimentResult) {
            const emotionalState = this.mapSentimentToEmotionalState(sentimentResult.overallSentiment);

            toolResult = await this.executeToolSafely('provideSupportiveResponse', {
              memberMessage: message,
              emotionalState,
              therapeuticApproach: 'validation',
              sessionContext: {
                isFirstMessage: false,
                previousTopics: [],
                memberGoals: []
              }
            }, context);
          }
          break;

        case 'sentiment':
          toolResult = await this.executeToolSafely('analyzeSentiment', {
            text: message,
            contextualFactors: {}
          }, context);
          break;

        case 'crisis':
          // First detect crisis level
          const crisisDetection = await this.executeToolSafely('detectCrisis', {
            message,
            memberHistory: [],
            contextualCues: {}
          }, { ...context, agent: 'sentiment' });

          if (crisisDetection?.crisisDetected) {
            toolResult = await this.executeToolSafely('provideCrisisSupport', {
              crisisType: 'emotional_overwhelm',
              severityLevel: crisisDetection.severityLevel,
              immediateNeeds: [],
              availableSupports: []
            }, context);
          }
          break;

        case 'insight':
          // Analyze member progress and generate insights
          toolResult = await this.executeToolSafely('analyzeMemberProgress', {
            memberMessage: message,
            conversationHistory: [],
            timeframe: '30days',
            focusAreas: ['emotional_wellbeing', 'coping_strategies', 'social_connection']
          }, context);
          break;

        case 'matching':
          // Search for relevant groups and generate recommendations
          toolResult = await this.executeToolSafely('searchGroups', {
            memberMessage: message,
            memberInterests: [],
            supportNeeds: ['peer_support', 'group_therapy'],
            location: 'online',
            groupType: 'recovery'
          }, context);
          break;
      }

      // If we have tool results, format them into a response
      if (toolResult) {
        return {
          success: true,
          response: this.formatToolResponse(agentId, toolResult),
          confidence: 0.9,
          agentUsed: [agentId],
          toolResults: [toolResult],
          needsCrisisIntervention: toolResult.requiresHumanEscalation || false,
          suggestGroupMatching: false,
          metadata: {
            toolsUsed: [agentId],
            hasToolResults: true,
            toolExecutionTime: new Date().toISOString()
          }
        };
      }

      // Fall back to parent class behavior if no tools executed
      const parentResponse = await super.callAgentDirectly(agentId, message, sessionId, memberId);
      return {
        ...parentResponse,
        agentUsed: Array.isArray(parentResponse.agentUsed) ? parentResponse.agentUsed : [parentResponse.agentUsed]
      };

    } catch (error) {
      console.error(`[GroupOrchestration] Error in callAgentWithTools:`, error);
      const parentResponse = await super.callAgentDirectly(agentId, message, sessionId, memberId);
      return {
        ...parentResponse,
        agentUsed: Array.isArray(parentResponse.agentUsed) ? parentResponse.agentUsed : [parentResponse.agentUsed]
      };
    }
  }

  /**
   * Map sentiment analysis to emotional state for facilitator tool
   */
  private mapSentimentToEmotionalState(sentiment: string): string {
    const mapping: Record<string, string> = {
      'very_negative': 'crisis',
      'negative': 'distressed',
      'neutral': 'neutral',
      'positive': 'positive',
      'very_positive': 'positive'
    };
    return mapping[sentiment] || 'neutral';
  }

  /**
   * Extract emotional context from sentiment analysis results
   */
  private extractEmotionalContext(sentimentResult: any): {
    mood: string;
    intensity: string;
    keywords: string[];
  } {
    // Default context
    let context = {
      mood: 'neutral',
      intensity: 'moderate',
      keywords: []
    };

    try {
      if (sentimentResult.toolResults && sentimentResult.toolResults.length > 0) {
        const toolData = sentimentResult.toolResults[0];
        context.mood = toolData.overallSentiment || 'neutral';
        context.intensity = toolData.intensity || 'moderate';
        context.keywords = toolData.emotionalKeywords || [];
      }
    } catch (error) {
      console.warn('[GroupOrchestration] Failed to extract emotional context:', error);
    }

    return context;
  }

  /**
   * Intelligently combine responses from multiple agents
   */
  private combineAgentResponses(primaryResponse: string, facilitatorResponse: string, primaryAgent: string): string {
    console.log('[GroupOrchestration] Combining responses from', primaryAgent, 'and facilitator');

    // If primary response is very short, use facilitator response
    if (primaryResponse.length < 50) {
      return facilitatorResponse;
    }

    // If facilitator response is very short or generic, use primary
    if (facilitatorResponse.length < 50 || facilitatorResponse.includes('Thank you for sharing')) {
      return primaryResponse;
    }

    // For insight agent, combine with therapeutic support
    if (primaryAgent === 'insight') {
      return `${primaryResponse}\n\n${facilitatorResponse}`;
    }

    // For matching agent, add therapeutic framing
    if (primaryAgent === 'matching') {
      return `${facilitatorResponse}\n\n${primaryResponse}`;
    }

    // Default: use primary response with facilitator support
    return primaryResponse;
  }

  /**
   * Format tool results into natural language response
   */
  private formatToolResponse(agentId: string, toolResult: any): string {
    switch (agentId) {
      case 'facilitator':
        return toolResult.response || 'I hear you and want to support you through this.';

      case 'sentiment':
        const sentiment = toolResult.overallSentiment;
        const emotions = toolResult.primaryEmotions?.map((e: any) => e.emotion).join(', ') || 'mixed emotions';
        return `I'm picking up on ${emotions} in what you've shared. The overall tone seems ${sentiment}. How does that feel for you?`;

      case 'crisis':
        return toolResult.immediateResponse || 'I\'m concerned about what you\'re sharing. Let me connect you with some immediate support resources.';

      case 'insight':
        const progressSummary = toolResult.progressSummary || 'your growth journey';
        const keyInsights = toolResult.keyInsights || [];
        const insightsText = keyInsights.length > 0 ? keyInsights.join('. ') : 'steady progress in your healing journey';
        return `Looking at ${progressSummary}, I can see ${insightsText}. How does this resonate with your own sense of progress?`;

      case 'matching':
        const recommendedGroups = toolResult.recommendedGroups || [];
        const groupCount = recommendedGroups.length;
        if (groupCount > 0) {
          const groupNames = recommendedGroups.slice(0, 2).map((g: any) => g.name || 'a supportive community').join(' and ');
          return `I found ${groupCount} groups that might be perfect for you, including ${groupNames}. These communities focus on peer support and shared experiences. Would you like me to help you connect with them?`;
        } else {
          return 'I can help you find supportive peer groups that match your interests and needs. What kind of community are you looking for?';
        }

      default:
        return toolResult.response || 'Thank you for sharing that with me.';
    }
  }

  // Private helper methods

  private async buildGroupContext(groupId: string): Promise<GroupContext> {
    // Check cache first
    if (this.groupContextCache.has(groupId)) {
      const cached = this.groupContextCache.get(groupId)!;
      // Refresh cache every 10 minutes
      if (Date.now() - (cached.lastAIIntervention?.getTime() || 0) < 600000) {
        return cached;
      }
    }

    try {
      const group = await this.dbService.getGroupById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

            const recentMessagesResult = await this.dbService.getMessages(groupId, 50);
      const recentMessages = recentMessagesResult.messages;

      const context: GroupContext = {
        groupId,
        groupType: group.type as 'recovery' | 'wellness' | 'general',
        memberCount: group.members.length,
        activeFacilitators: group.facilitators || [],
        recentActivity: this.assessRecentActivity(recentMessages),
        groupMood: await this.assessGroupMood(recentMessages),
        lastAIIntervention: this.getLastAIIntervention(recentMessages)
      };

      this.groupContextCache.set(groupId, context);
      return context;

    } catch (error) {
      logger.error('Error building group context:', error);
      throw error;
    }
  }

  private async addGroupContext(message: string, groupContext: GroupContext): Promise<string> {
    return `
[Group Context: ${groupContext.groupType} group with ${groupContext.memberCount} members, ${groupContext.recentActivity} activity, ${groupContext.groupMood || 'neutral'} mood]

User message: ${message}
`;
  }

  private async analyzeGroupMessage(groupId: string, message: string, response: AgentResponse): Promise<GroupInsight[]> {
    const insights: GroupInsight[] = [];

    // Check for participation encouragement needs
    if (message.length < 20) {
      insights.push({
        type: 'participation',
        summary: 'Short message detected - may indicate low engagement',
        confidence: 0.6,
        actionable: true,
        priority: 'low',
        recommendations: ['Encourage more detailed sharing', 'Ask follow-up questions']
      });
    }

    // Check for emotional indicators
    if (response.confidence < 0.5 && response.agentUsed.includes('sentiment')) {
      insights.push({
        type: 'mood',
        summary: 'Ambiguous emotional content detected',
        confidence: 0.7,
        actionable: true,
        priority: 'medium',
        recommendations: ['Provide emotional validation', 'Ask clarifying questions']
      });
    }

    return insights;
  }

  private async assessGroupActionNeeds(groupContext: GroupContext, response: AgentResponse): Promise<boolean> {
    return (
      groupContext.groupMood === 'crisis' ||
      response.needsCrisisIntervention ||
      (groupContext.recentActivity === 'low' && groupContext.memberCount > 5) ||
      response.confidence < 0.3
    );
  }

  private shouldSuggestGroupMatching(groupContext: GroupContext, response: AgentResponse): boolean {
    return (
      groupContext.memberCount < 3 ||
      (groupContext.recentActivity === 'low' && groupContext.memberCount < 8) ||
      response.agentUsed.includes('matching')
    );
  }

  private parseGroupInsights(insightText: string): GroupInsight[] {
    // Simple parsing - in production would use more sophisticated NLP
    const insights: GroupInsight[] = [];

    if (insightText.includes('participation')) {
      insights.push({
        type: 'participation',
        summary: 'Participation patterns identified',
        confidence: 0.8,
        actionable: true,
        priority: 'medium'
      });
    }

    if (insightText.includes('mood') || insightText.includes('emotional')) {
      insights.push({
        type: 'mood',
        summary: 'Emotional climate analysis available',
        confidence: 0.7,
        actionable: true,
        priority: 'high'
      });
    }

    return insights;
  }

  private assessRecentActivity(messages: any[]): 'high' | 'moderate' | 'low' {
    const now = new Date();
    const last24Hours = messages.filter(msg =>
      now.getTime() - new Date(msg.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    if (last24Hours.length > 20) return 'high';
    if (last24Hours.length > 5) return 'moderate';
    return 'low';
  }

  private async assessGroupMood(messages: any[]): Promise<'positive' | 'neutral' | 'concerning' | 'crisis'> {
    // Simple keyword-based mood assessment
    const recentContent = messages.slice(0, 10).map(m => m.content.toLowerCase()).join(' ');

    const concerningKeywords = ['sad', 'depressed', 'hopeless', 'crisis', 'help', 'struggling'];
    const positiveKeywords = ['good', 'better', 'progress', 'grateful', 'thankful', 'improving'];

    const concerningCount = concerningKeywords.filter(word => recentContent.includes(word)).length;
    const positiveCount = positiveKeywords.filter(word => recentContent.includes(word)).length;

    if (concerningCount > 3) return 'crisis';
    if (concerningCount > 1) return 'concerning';
    if (positiveCount > 2) return 'positive';
    return 'neutral';
  }

  private getLastAIIntervention(messages: any[]): Date | null {
    const aiMessage = messages.find(msg => msg.type === 'ai_facilitator' || msg.memberId === 'ai-facilitator');
    return aiMessage ? new Date(aiMessage.timestamp) : null;
  }

  private analyzeParticipation(messages: any[], members: string[]) {
    const participationCounts = new Map<string, number>();

    messages.forEach(msg => {
      const count = participationCounts.get(msg.memberId) || 0;
      participationCounts.set(msg.memberId, count + 1);
    });

    const sortedParticipation = Array.from(participationCounts.entries())
      .sort(([,a], [,b]) => b - a);

    const totalMessages = messages.length;
    const averagePerMember = totalMessages / members.length;

    return {
      activeMembers: sortedParticipation
        .filter(([, count]) => count > averagePerMember)
        .map(([memberId]) => memberId),
      quietMembers: members.filter(memberId =>
        (participationCounts.get(memberId) || 0) < averagePerMember * 0.5
      ),
      dominatingMembers: sortedParticipation
        .filter(([, count]) => count > averagePerMember * 2)
        .map(([memberId]) => memberId)
    };
  }

  private analyzeConversationFlow(messages: any[]) {
    const timestamps = messages.map(msg => new Date(msg.timestamp).getTime());
    const intervals = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i-1] - timestamps[i]);
    }

    const averageResponseTime = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return {
      averageResponseTime: averageResponseTime / 1000 / 60, // in minutes
      conversationDepth: (messages.length > 50 ? 'deep' : messages.length > 20 ? 'moderate' : 'shallow') as 'deep' | 'moderate' | 'shallow',
      topicStability: 'focused' as 'focused' | 'scattered' | 'repetitive'
    };
  }

  private async analyzeEmotionalClimate(messages: any[]) {
    // Simple sentiment analysis placeholder
    return {
      overallMood: 'neutral' as const,
      supportLevel: 'moderate' as const,
      conflictLevel: 'none' as const
    };
  }

  private analyzeAIEngagement(messages: any[]) {
    const aiMessages = messages.filter(msg =>
      msg.type === 'ai_facilitator' || msg.memberId === 'ai-facilitator'
    );

    return {
      lastIntervention: aiMessages.length > 0 ? new Date(aiMessages[0].timestamp) : null,
      interventionFrequency: (aiMessages.length > 10 ? 'high' : aiMessages.length > 3 ? 'moderate' : 'low') as 'high' | 'moderate' | 'low',
      effectivenessScore: 0.75 // Would calculate based on member responses
    };
  }
}