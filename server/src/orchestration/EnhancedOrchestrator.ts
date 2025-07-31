/**
 * Enhanced Orchestrator - Integrates new agent system with tool execution
 * Replaces hardcoded agent logic with proper tool-based implementation
 */

import { AgentFactory } from '../agents/AgentFactory';
import { BaseAgent } from '../agents/BaseAgent';
import { ToolContext } from '../tools/schemas';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface OrchestrationResult {
  success: boolean;
  response: string;
  confidence: number;
  agentsUsed: string[];
  toolsUsed: string[];
  needsCrisisIntervention?: boolean;
  suggestGroupMatching?: boolean;
  metadata?: Record<string, any>;
}

export class EnhancedOrchestrator {
  private agentFactory: AgentFactory;

  constructor() {
    this.agentFactory = AgentFactory.getInstance();
  }

  /**
   * Process a message using the agent system with tool execution
   */
  public async processMessage(params: {
    memberId: string;
    sessionId: string;
    groupId?: string;
    messageId?: string;
    content: string;
    messageType?: 'member' | 'system';
  }): Promise<OrchestrationResult> {
    const { memberId, sessionId, groupId, messageId, content, messageType = 'member' } = params;

    const context: Omit<ToolContext, 'agent'> = {
      memberId,
      sessionId,
      groupId,
      messageId: messageId || `msg_${Date.now()}_${uuidv4()}`,
      timestamp: new Date(),
      metadata: { messageType }
    };

    logger.info('[EnhancedOrchestrator] Processing message', {
      sessionId,
      messageLength: content.length,
      messageType
    });

    const agentsUsed: string[] = [];
    const allToolsUsed: string[] = [];
    let finalResponse = '';
    let highestConfidence = 0;
    let needsCrisisIntervention = false;
    let suggestGroupMatching = false;
    const metadata: Record<string, any> = {};

    try {
      // Step 1: Always run sentiment analysis for safety
      const sentimentAgent = this.agentFactory.getAgent('sentiment');
      if (sentimentAgent) {
        const sentimentResult = await sentimentAgent.execute(content, context);
        agentsUsed.push('sentiment');
        allToolsUsed.push(...sentimentResult.toolsUsed);

        if (sentimentResult.metadata) {
          metadata.emotionalScore = sentimentResult.metadata.emotionalScore;
          metadata.overallSentiment = sentimentResult.metadata.overallSentiment;
          metadata.crisisLevel = sentimentResult.metadata.crisisLevel;

          // Check if crisis intervention needed
          if (sentimentResult.metadata.needsCrisisIntervention ||
              sentimentResult.metadata.crisisLevel === 'severe' ||
              sentimentResult.metadata.crisisLevel === 'imminent') {
            needsCrisisIntervention = true;
          }
        }
      }

      // Step 2: If crisis detected, use crisis agent
      if (needsCrisisIntervention) {
        const crisisAgent = this.agentFactory.getAgent('crisis');
        if (crisisAgent) {
          const crisisResult = await crisisAgent.execute(content, context);
          agentsUsed.push('crisis');
          allToolsUsed.push(...crisisResult.toolsUsed);
          finalResponse = crisisResult.response;
          highestConfidence = crisisResult.confidence;

          if (crisisResult.metadata) {
            metadata.crisisResponse = crisisResult.metadata;
          }
        }
      } else {
        // Step 3: Route to appropriate agent based on content
        const primaryAgent = this.selectPrimaryAgent(content);

        if (primaryAgent) {
          const agent = this.agentFactory.getAgent(primaryAgent as any);
          if (agent) {
            const result = await agent.execute(content, context);
            agentsUsed.push(primaryAgent);
            allToolsUsed.push(...result.toolsUsed);
            finalResponse = result.response;
            highestConfidence = result.confidence;

            if (result.metadata) {
              metadata[primaryAgent] = result.metadata;
            }

            // Check if group matching was suggested
            if (primaryAgent === 'matching' ||
                content.toLowerCase().includes('group') ||
                content.toLowerCase().includes('community')) {
              suggestGroupMatching = true;
            }
          }
        }

        // Step 4: If no specific agent matched, use facilitator as default
        if (!finalResponse) {
          const facilitatorAgent = this.agentFactory.getAgent('facilitator');
          if (facilitatorAgent) {
            const result = await facilitatorAgent.execute(content, context);
            agentsUsed.push('facilitator');
            allToolsUsed.push(...result.toolsUsed);
            finalResponse = result.response;
            highestConfidence = result.confidence;

            if (result.metadata) {
              metadata.facilitator = result.metadata;
            }
          }
        }
      }

      // Ensure we have a response
      if (!finalResponse) {
        finalResponse = "I'm here to support you. Could you tell me more about what's on your mind?";
        highestConfidence = 0.5;
        agentsUsed.push('fallback');
      }

      logger.info('[EnhancedOrchestrator] Processing complete', {
        agentsUsed,
        toolsUsed: allToolsUsed,
        confidence: highestConfidence,
        needsCrisisIntervention,
        suggestGroupMatching
      });

      return {
        success: true,
        response: finalResponse,
        confidence: highestConfidence,
        agentsUsed,
        toolsUsed: allToolsUsed,
        needsCrisisIntervention,
        suggestGroupMatching,
        metadata
      };

    } catch (error) {
      logger.error('[EnhancedOrchestrator] Error processing message:', error);

      return {
        success: false,
        response: "I'm here to support you. Let me know how I can help.",
        confidence: 0.1,
        agentsUsed: ['error'],
        toolsUsed: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Select the primary agent based on message content
   */
  private selectPrimaryAgent(content: string): string | null {
    const lowerContent = content.toLowerCase();

    // Group/matching requests
    if (lowerContent.includes('group') ||
        lowerContent.includes('community') ||
        lowerContent.includes('connect') ||
        lowerContent.includes('find others') ||
        lowerContent.includes('peer support')) {
      return 'matching';
    }

    // Progress/insight requests
    if (lowerContent.includes('progress') ||
        lowerContent.includes('journey') ||
        lowerContent.includes('how am i doing') ||
        lowerContent.includes('growth') ||
        lowerContent.includes('pattern')) {
      return 'insight';
    }

    // Emotional support (default to facilitator)
    if (lowerContent.includes('feel') ||
        lowerContent.includes('anxious') ||
        lowerContent.includes('depressed') ||
        lowerContent.includes('stressed') ||
        lowerContent.includes('help')) {
      return 'facilitator';
    }

    // Default to facilitator for general conversation
    return 'facilitator';
  }

  /**
   * Call a specific agent directly
   */
  public async callAgentDirectly(
    agentId: string,
    message: string,
    sessionId: string,
    memberId: string,
    groupId?: string,
    toolName?: string
  ): Promise<{
    success: boolean;
    response: string;
    agentUsed: string;
    toolsUsed?: string[];
    confidence: number;
    metadata?: any;
  }> {
    const context: Omit<ToolContext, 'agent'> = {
      memberId,
      sessionId,
      groupId,
      messageId: `msg_${Date.now()}_${uuidv4()}`,
      timestamp: new Date(),
      metadata: { directCall: true, requestedTool: toolName }
    };

    try {
      const agent = this.agentFactory.getAgent(agentId as any);

      if (!agent) {
        throw new Error(`Agent '${agentId}' not found`);
      }

      const result = await agent.execute(message, context);

      return {
        success: result.toolsUsed.length > 0,
        response: result.response,
        agentUsed: agentId,
        toolsUsed: result.toolsUsed,
        confidence: result.confidence,
        metadata: result.metadata
      };

    } catch (error) {
      logger.error('[EnhancedOrchestrator] Error in direct agent call:', error);

      return {
        success: false,
        response: `Error calling agent ${agentId}: ${error.message}`,
        agentUsed: 'error',
        toolsUsed: [],
        confidence: 0,
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Get available agents and their tools
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
    const agentInfo = this.agentFactory.getAgentInfo();

    // Transform agent info to match expected format
    const agents = agentInfo.map(info => ({
      id: info.id,
      name: info.name,
      description: info.description,
      capabilities: this.getAgentCapabilities(info.id),
      tools: info.availableTools
    }));

    // Extract all tools from agents
    const tools: any[] = [];
    agentInfo.forEach(agent => {
      agent.availableTools.forEach(toolName => {
        tools.push({
          name: toolName,
          description: this.getToolDescription(toolName),
          agent: agent.id
        });
      });
    });

    return { agents, tools };
  }

  private getAgentCapabilities(agentId: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      'matching': ['group_matching', 'peer_connection', 'community_building'],
      'facilitator': ['therapeutic_support', 'emotional_validation', 'coping_strategies'],
      'sentiment': ['sentiment_analysis', 'crisis_detection', 'emotional_assessment'],
      'insight': ['progress_tracking', 'pattern_analysis', 'growth_insights'],
      'crisis': ['crisis_intervention', 'safety_planning', 'emergency_response']
    };

    return capabilityMap[agentId] || [];
  }

  private getToolDescription(toolName: string): string {
    const descriptionMap: Record<string, string> = {
      // Matching tools
      'searchGroups': 'Search for groups matching specific criteria',
      'rankGroupsByRelevance': 'Rank groups by match score to member needs',
      'generateGroupRecommendations': 'Create personalized group recommendations',

      // Facilitator tools
      'provideSupportiveResponse': 'Generate empathetic, therapeutic responses',
      'validateFeelings': 'Acknowledge and validate member emotions',
      'suggestCopingStrategies': 'Recommend evidence-based coping techniques',

      // Sentiment tools
      'analyzeSentiment': 'Analyze emotional tone and sentiment score',
      'detectCrisis': 'Identify crisis keywords and risk levels',

      // Insight tools
      'analyzeMemberProgress': 'Analyze patterns in member\'s conversation and growth',
      'generateProgressInsights': 'Provide insights about member\'s journey',
      'identifyPatterns': 'Identify behavioral and emotional patterns',

      // Crisis tools
      'provideCrisisSupport': 'Provide immediate crisis intervention and safety resources',
      'escalateToHuman': 'Escalate to human crisis counselor when needed'
    };

    return descriptionMap[toolName] || 'Tool for agent operations';
  }
}