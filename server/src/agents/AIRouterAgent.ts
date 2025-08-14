/**
 * AI Router Agent - Intelligent message routing and intent analysis
 * Routes messages to the most appropriate specialized agent based on content analysis
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class AIRouterAgent extends BaseAgent {
  constructor() {
    super({
      id: 'ai-router',
      name: 'AI Router Agent',
      description: 'Routes messages to appropriate specialized agents based on intent analysis',
      availableTools: ['analyzeLLMIntent', 'routeToAgent']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0.9;

    try {
      // Step 1: Analyze message intent
      const intentParams = {
        message,
        conversationHistory: [], // TODO: Get from context
        groupContext: context.groupId ? {
          groupType: 'general' as const,
          memberCount: 5, // TODO: Get actual count
          recentActivity: 'moderate' as const
        } : undefined
      };

      const intentResult = await this.executeTool('analyzeLLMIntent', intentParams, context);
      toolsUsed.push('analyzeLLMIntent');
      toolResults.push(intentResult);

      let selectedAgent = 'facilitator'; // Default fallback
      let routingReason = 'Default routing to facilitator';
      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';

      if (intentResult.success && intentResult.data) {
        const { primaryIntent, suggestedAgent, reasoning, urgency: detectedUrgency } = intentResult.data;

        selectedAgent = suggestedAgent;
        routingReason = reasoning;
        urgency = detectedUrgency;
        confidence = intentResult.data.confidence || 0.9;

        logger.info(`[${this.name}] Intent analysis completed`, {
          primaryIntent,
          suggestedAgent,
          urgency,
          confidence
        });
      }

      // Step 2: Route to the selected agent
      const routingParams = {
        targetAgent: selectedAgent as 'facilitator' | 'sentiment' | 'crisis' | 'matching' | 'insight' | 'other' | 'none',
        message,
        routingReason,
        priority: this.mapUrgencyToPriority(urgency)
      };

      const routingResult = await this.executeTool('routeToAgent', routingParams, context);
      toolsUsed.push('routeToAgent');
      toolResults.push(routingResult);

      if (routingResult.success && routingResult.data) {
        const { routingSuccess, agentResponse, fallbackAgent } = routingResult.data;

        if (routingSuccess && agentResponse) {
          response = agentResponse;
        } else if (fallbackAgent) {
          response = `I've routed your message to our ${fallbackAgent} for the best support. They'll be able to help you with this.`;
          logger.warn(`[${this.name}] Fallback routing to ${fallbackAgent}`, {
            originalAgent: selectedAgent,
            reason: 'Primary routing failed'
          });
        } else {
          response = this.getDefaultResponse(selectedAgent);
        }
      } else {
        response = this.getDefaultResponse(selectedAgent);
      }

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          selectedAgent,
          routingReason,
          urgency,
          routingSuccess: routingResult.success,
          intentAnalysis: intentResult.data
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.3,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private mapUrgencyToPriority(urgency: string): 'low' | 'medium' | 'high' | 'urgent' {
    const urgencyMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'urgent'
    };

    return urgencyMap[urgency] || 'medium';
  }

  private getDefaultResponse(agent: string): string {
    const agentResponses: Record<string, string> = {
      'facilitator': "I'm here to provide supportive conversation and therapeutic guidance. How are you feeling today?",
      'sentiment': "I'm analyzing the emotional context of your message to better understand how you're doing.",
      'crisis': "I'm connecting you with immediate crisis support resources. Your safety is our top priority.",
      'matching': "I'll help you find the perfect peer support group that matches your needs and goals.",
      'insight': "Let me analyze your progress and provide insights into your therapeutic journey."
    };

    return agentResponses[agent] || agentResponses.facilitator;
  }

  protected getErrorResponse(): string {
    return `I'm having trouble understanding your message right now, but I want to make sure you get the support you need.

Let me route you to our main therapeutic assistant who can help with a wide range of concerns.

If this is an emergency, please call 988 (Suicide & Crisis Lifeline) or 911 immediately.`;
  }
}

export default AIRouterAgent;