/**
 * Route To Agent Tool Implementation
 * Routes messages to the most appropriate specialized agent
 */

import { z } from 'zod';
import { RouteToAgentTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function routeToAgent(
  params: z.infer<typeof RouteToAgentTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { targetAgent, message, routingReason, priority } = params;

    logger.info('[routeToAgent] Routing message to agent', {
      targetAgent,
      messageLength: message.length,
      priority,
      agent: context.agent
    });

    // Validate agent availability
    const availableAgents = ['facilitator', 'sentiment', 'crisis', 'matching', 'insight'];
    if (!availableAgents.includes(targetAgent)) {
      logger.warn(`[routeToAgent] Invalid target agent: ${targetAgent}`);
      return {
        success: false,
        error: `Invalid target agent: ${targetAgent}`,
        confidence: 0.5,
        data: {
          routingSuccess: false,
          fallbackAgent: 'facilitator',
          routingMetadata: {
            error: 'Invalid agent specified',
            availableAgents
          }
        }
      };
    }

    // Simulate agent routing (in production, this would involve actual agent instantiation)
    const routingSuccess = await simulateAgentRouting(targetAgent, message, priority);
    
    let agentResponse = '';
    let fallbackAgent: string | undefined;
    
    if (routingSuccess) {
      // Generate appropriate response based on target agent
      agentResponse = generateAgentResponse(targetAgent, message, priority);
    } else {
      // Determine fallback agent
      fallbackAgent = determineFallbackAgent(targetAgent, priority);
      agentResponse = generateFallbackResponse(fallbackAgent, targetAgent);
      
      logger.warn(`[routeToAgent] Routing failed, using fallback`, {
        originalAgent: targetAgent,
        fallbackAgent,
        priority
      });
    }

    // Log routing metrics for monitoring
    const routingMetadata = {
      originalAgent: targetAgent,
      routingReason,
      priority,
      routingSuccess,
      responseTime: Math.floor(Math.random() * 500) + 100, // Simulate response time
      fallbackUsed: !routingSuccess,
      timestamp: new Date().toISOString()
    };

    return {
      success: true,
      data: {
        routingSuccess,
        agentResponse,
        fallbackAgent,
        routingMetadata
      },
      confidence: routingSuccess ? 0.9 : 0.7,
      metadata: {
        targetAgent,
        actualAgent: routingSuccess ? targetAgent : fallbackAgent,
        routingReason,
        routingLatency: routingMetadata.responseTime
      }
    };

  } catch (error) {
    logger.error('[routeToAgent] Error routing to agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to route message to agent',
      confidence: 0.3,
      data: {
        routingSuccess: false,
        fallbackAgent: 'facilitator',
        routingMetadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    };
  }
}

async function simulateAgentRouting(
  targetAgent: string, 
  message: string, 
  priority: string
): Promise<boolean> {
  // Simulate agent availability and load balancing
  const agentLoadFactors: Record<string, number> = {
    'facilitator': 0.95, // High availability
    'sentiment': 0.90,   // Good availability  
    'crisis': 0.98,      // Critical availability
    'matching': 0.85,    // Moderate availability
    'insight': 0.80      // Lower availability (more complex processing)
  };

  // Priority affects routing success
  const priorityBonus: Record<string, number> = {
    'urgent': 0.05,
    'high': 0.03,
    'medium': 0.01,
    'low': 0.0
  };

  const baseSuccessProbability = agentLoadFactors[targetAgent] || 0.8;
  const priorityAdjustment = priorityBonus[priority] || 0.0;
  const finalProbability = Math.min(baseSuccessProbability + priorityAdjustment, 0.99);

  // Simulate routing delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

  return Math.random() < finalProbability;
}

function generateAgentResponse(
  targetAgent: string, 
  message: string, 
  priority: string
): string {
  const agentResponses: Record<string, (msg: string, prio: string) => string> = {
    'facilitator': (msg, prio) => {
      if (prio === 'urgent' || prio === 'high') {
        return "I can hear that you're going through something significant right now. I'm here to provide support and help you work through these feelings. What's the most important thing you'd like to talk about?";
      }
      return "Thank you for sharing with me. I'm here to listen and support you. How are you feeling right now, and what would be most helpful for you today?";
    },
    
    'sentiment': (msg, prio) => {
      if (prio === 'urgent') {
        return "I'm analyzing the emotional content of your message and I can sense you're experiencing intense feelings right now. Let me help assess your emotional state and connect you with appropriate support.";
      }
      return "I'm going to analyze the emotional tone of your message to better understand how you're feeling and determine the best way to support you.";
    },
    
    'crisis': (msg, prio) => {
      return "I'm connecting you with immediate crisis support. Your safety is our absolute priority. While I prepare crisis resources for you, please know that help is available and you don't have to face this alone.";
    },
    
    'matching': (msg, prio) => {
      if (msg.toLowerCase().includes('group') || msg.toLowerCase().includes('join')) {
        return "I'll help you find the perfect peer support group that matches your needs and goals. Let me search our available groups and provide you with personalized recommendations.";
      }
      return "I can help you connect with others who share similar experiences and goals. Let me find some group options that would be a good fit for you.";
    },
    
    'insight': (msg, prio) => {
      return "I'll analyze your progress and provide insights into your therapeutic journey. Let me review your patterns and growth to help you understand your progress and identify opportunities for continued development.";
    }
  };

  const responseGenerator = agentResponses[targetAgent];
  return responseGenerator ? responseGenerator(message, priority) : 
    "I'm here to help you. Let me understand your needs better so I can provide the most appropriate support.";
}

function determineFallbackAgent(targetAgent: string, priority: string): string {
  // Crisis situations always fall back to crisis agent if available
  if (priority === 'urgent') {
    return targetAgent === 'crisis' ? 'facilitator' : 'crisis';
  }

  // High priority falls back to facilitator or sentiment
  if (priority === 'high') {
    if (targetAgent === 'facilitator') return 'sentiment';
    return 'facilitator';
  }

  // Default fallback patterns
  const fallbackMap: Record<string, string> = {
    'facilitator': 'sentiment',
    'sentiment': 'facilitator', 
    'crisis': 'facilitator',
    'matching': 'facilitator',
    'insight': 'facilitator'
  };

  return fallbackMap[targetAgent] || 'facilitator';
}

function generateFallbackResponse(fallbackAgent: string, originalAgent: string): string {
  const fallbackResponses: Record<string, Record<string, string>> = {
    'facilitator': {
      'sentiment': "I'm here to provide therapeutic support while our emotional analysis system is processing your message. How are you feeling right now?",
      'crisis': "I'm here to provide immediate support while connecting you with crisis resources. Your wellbeing is important to me.",
      'matching': "I'm here to help while our group matching service is processing your request. I can provide support and discuss what you're looking for.",
      'insight': "I'm here to support you while our insights system prepares your analysis. What would you like to explore about your journey?"
    },
    'sentiment': {
      'facilitator': "I'm analyzing your emotional state to provide the most appropriate support. Let me understand how you're feeling.",
      'crisis': "I'm assessing your emotional needs while crisis support is being prepared. How intense are the feelings you're experiencing?",
      'matching': "I'm evaluating your emotional context to help with group matching. What kind of support environment appeals to you?",
      'insight': "I'm analyzing your current emotional state as part of your progress assessment. How would you describe your feelings lately?"
    },
    'crisis': {
      'facilitator': "I'm providing immediate support while connecting you with crisis resources. You're not alone in this.",
      'sentiment': "I'm here for crisis support while emotional analysis is being completed. What immediate support do you need?",
      'matching': "I'm providing crisis support. Let's focus on your immediate safety and wellbeing first.",
      'insight': "I'm here for immediate support. Your safety comes first before any analysis or insights."
    }
  };

  const fallbackResponse = fallbackResponses[fallbackAgent]?.[originalAgent];
  return fallbackResponse || 
    `I'm here to help you while our ${originalAgent} service is temporarily unavailable. How can I support you right now?`;
}

export default {
  name: RouteToAgentTool.name,
  description: RouteToAgentTool.description,
  agent: RouteToAgentTool.agent,
  execute: routeToAgent
};