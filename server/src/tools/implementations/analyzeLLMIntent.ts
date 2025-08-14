/**
 * Analyze LLM Intent Tool Implementation
 * Analyzes member message intent to determine appropriate agent routing
 */

import { z } from 'zod';
import { AnalyzeLLMIntentTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function analyzeLLMIntent(
  params: z.infer<typeof AnalyzeLLMIntentTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { message, conversationHistory, groupContext } = params;

    logger.info('[analyzeLLMIntent] Analyzing message intent', {
      messageLength: message.length,
      hasHistory: !!conversationHistory?.length,
      hasGroupContext: !!groupContext,
      agent: context.agent
    });

    // Analyze message content for intent classification
    const intentAnalysis = analyzeMessageContent(message);
    const urgencyLevel = assessUrgency(message, intentAnalysis);
    const suggestedAgent = selectBestAgent(intentAnalysis, urgencyLevel);
    
    // Factor in conversation history if available
    let contextualAdjustment = '';
    if (conversationHistory && conversationHistory.length > 0) {
      contextualAdjustment = analyzeConversationHistory(conversationHistory);
    }

    // Generate reasoning for the routing decision
    const reasoning = generateRoutingReasoning(intentAnalysis, suggestedAgent, urgencyLevel, contextualAdjustment);

    // Calculate confidence based on various factors
    const confidence = calculateConfidence(intentAnalysis, urgencyLevel, conversationHistory?.length || 0);

    return {
      success: true,
      data: {
        primaryIntent: intentAnalysis.primaryIntent,
        confidence,
        suggestedAgent,
        reasoning,
        urgency: urgencyLevel
      },
      confidence,
      metadata: {
        intentAnalysis,
        messageLength: message.length,
        contextFactors: {
          hasHistory: !!conversationHistory?.length,
          hasGroupContext: !!groupContext,
          contextualAdjustment
        }
      }
    };

  } catch (error) {
    logger.error('[analyzeLLMIntent] Error analyzing intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze message intent',
      confidence: 0.3
    };
  }
}

interface IntentAnalysis {
  primaryIntent: 'support_seeking' | 'crisis' | 'sharing' | 'question' | 'social' | 'meta_query';
  indicators: string[];
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'crisis';
  topicCategory: string[];
}

function analyzeMessageContent(message: string): IntentAnalysis {
  const lowerMessage = message.toLowerCase();
  const indicators: string[] = [];
  let primaryIntent: IntentAnalysis['primaryIntent'] = 'support_seeking';
  let emotionalTone: IntentAnalysis['emotionalTone'] = 'neutral';
  const topicCategory: string[] = [];

  // Crisis detection (highest priority)
  const crisisWords = ['suicide', 'kill myself', 'end it', 'die', 'harm myself', 'can\'t go on'];
  if (crisisWords.some(word => lowerMessage.includes(word))) {
    primaryIntent = 'crisis';
    emotionalTone = 'crisis';
    indicators.push('Crisis language detected');
    topicCategory.push('crisis');
  }

  // Support seeking indicators
  const supportWords = ['help', 'support', 'struggling', 'difficult', 'hard', 'overwhelmed', 'anxious', 'depressed'];
  const supportCount = supportWords.filter(word => lowerMessage.includes(word)).length;
  if (supportCount > 0) {
    if (primaryIntent !== 'crisis') primaryIntent = 'support_seeking';
    indicators.push(`Support seeking (${supportCount} indicators)`);
  }

  // Question indicators
  const questionWords = ['how', 'what', 'when', 'where', 'why', 'can you', 'could you', '?'];
  const questionCount = questionWords.filter(word => lowerMessage.includes(word)).length;
  if (questionCount > 1 && primaryIntent === 'support_seeking') {
    primaryIntent = 'question';
    indicators.push('Question format detected');
  }

  // Social/sharing indicators
  const socialWords = ['today', 'yesterday', 'happened', 'feeling', 'felt', 'experienced'];
  const socialCount = socialWords.filter(word => lowerMessage.includes(word)).length;
  if (socialCount > 1 && primaryIntent === 'support_seeking') {
    primaryIntent = 'sharing';
    indicators.push('Experience sharing detected');
  }

  // Meta query (asking about the platform/groups)
  const metaWords = ['group', 'join', 'platform', 'how does this work', 'what is', 'available'];
  const metaCount = metaWords.filter(word => lowerMessage.includes(word)).length;
  if (metaCount > 0) {
    if (primaryIntent === 'support_seeking') primaryIntent = 'meta_query';
    indicators.push('Platform/service inquiry');
    topicCategory.push('platform');
  }

  // Emotional tone analysis
  const positiveWords = ['better', 'good', 'happy', 'grateful', 'progress'];
  const negativeWords = ['bad', 'worse', 'terrible', 'hopeless', 'stuck'];
  
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  
  if (emotionalTone !== 'crisis') {
    if (positiveCount > negativeCount && positiveCount > 0) {
      emotionalTone = 'positive';
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      emotionalTone = 'negative';
    }
  }

  // Topic categorization
  const topicMap = {
    'anxiety': ['anxiety', 'anxious', 'worried', 'panic', 'stress'],
    'depression': ['depressed', 'sad', 'hopeless', 'empty'],
    'relationships': ['relationship', 'partner', 'family', 'friend'],
    'work': ['work', 'job', 'career', 'boss', 'colleague'],
    'health': ['health', 'illness', 'pain', 'medical'],
    'trauma': ['trauma', 'abuse', 'ptsd', 'flashback']
  };

  Object.entries(topicMap).forEach(([topic, keywords]) => {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      topicCategory.push(topic);
    }
  });

  return {
    primaryIntent,
    indicators,
    emotionalTone,
    topicCategory
  };
}

function assessUrgency(message: string, analysis: IntentAnalysis): 'low' | 'medium' | 'high' | 'critical' {
  if (analysis.emotionalTone === 'crisis') return 'critical';
  
  const urgentWords = ['urgent', 'emergency', 'immediate', 'right now', 'can\'t wait'];
  const highWords = ['very', 'extremely', 'really', 'so'];
  
  const lowerMessage = message.toLowerCase();
  
  if (urgentWords.some(word => lowerMessage.includes(word))) return 'high';
  if (analysis.emotionalTone === 'negative' && highWords.some(word => lowerMessage.includes(word))) return 'high';
  if (analysis.emotionalTone === 'negative') return 'medium';
  if (analysis.primaryIntent === 'support_seeking') return 'medium';
  
  return 'low';
}

function selectBestAgent(analysis: IntentAnalysis, urgency: string): 'facilitator' | 'sentiment' | 'crisis' | 'matching' | 'insight' {
  // Crisis takes absolute priority
  if (analysis.emotionalTone === 'crisis' || urgency === 'critical') {
    return 'crisis';
  }

  // Route based on primary intent
  switch (analysis.primaryIntent) {
    case 'crisis':
      return 'crisis';
    
    case 'meta_query':
      if (analysis.topicCategory.includes('platform')) {
        return 'matching'; // Group/platform questions go to matching
      }
      return 'facilitator';
    
    case 'question':
      if (analysis.topicCategory.some(cat => ['anxiety', 'depression', 'trauma'].includes(cat))) {
        return 'facilitator'; // Therapeutic questions
      }
      return 'facilitator';
    
    case 'sharing':
      if (analysis.emotionalTone === 'negative' || urgency === 'high') {
        return 'sentiment'; // Negative sharing needs sentiment analysis
      }
      return 'facilitator';
    
    case 'support_seeking':
      if (urgency === 'high' || analysis.emotionalTone === 'negative') {
        return 'sentiment'; // High urgency support needs sentiment analysis first
      }
      return 'facilitator';
    
    default:
      return 'facilitator';
  }
}

function analyzeConversationHistory(history: string[]): string {
  if (history.length === 0) return '';
  
  const recentMessages = history.slice(-3); // Last 3 messages
  const themes: string[] = [];
  
  // Look for recurring themes
  const themeWords = {
    'ongoing_crisis': ['crisis', 'emergency', 'urgent'],
    'progress_tracking': ['better', 'worse', 'progress', 'improvement'],
    'group_interest': ['group', 'join', 'connect', 'people'],
    'therapeutic_work': ['therapy', 'coping', 'technique', 'strategy']
  };
  
  Object.entries(themeWords).forEach(([theme, words]) => {
    const mentions = recentMessages.filter(msg => 
      words.some(word => msg.toLowerCase().includes(word))
    ).length;
    
    if (mentions >= 2) {
      themes.push(theme);
    }
  });
  
  if (themes.length > 0) {
    return `Conversation history shows recurring themes: ${themes.join(', ')}`;
  }
  
  return 'No significant patterns in recent conversation history';
}

function generateRoutingReasoning(
  analysis: IntentAnalysis, 
  suggestedAgent: string, 
  urgency: string,
  contextualAdjustment: string
): string {
  let reasoning = `Detected ${analysis.primaryIntent} intent with ${analysis.emotionalTone} emotional tone. `;
  
  reasoning += `Primary indicators: ${analysis.indicators.join(', ')}. `;
  
  if (analysis.topicCategory.length > 0) {
    reasoning += `Topics mentioned: ${analysis.topicCategory.join(', ')}. `;
  }
  
  reasoning += `Urgency level: ${urgency}. `;
  
  // Agent-specific reasoning
  const agentReasons: Record<string, string> = {
    'crisis': 'Crisis intervention required due to safety concerns',
    'sentiment': 'Emotional analysis needed to assess support needs',
    'facilitator': 'Therapeutic conversation appropriate for general support',
    'matching': 'Group matching services needed for connection requests',
    'insight': 'Progress analysis requested for therapeutic insights'
  };
  
  reasoning += agentReasons[suggestedAgent] || 'Default therapeutic support routing';
  
  if (contextualAdjustment) {
    reasoning += ` Context: ${contextualAdjustment}.`;
  }
  
  return reasoning;
}

function calculateConfidence(
  analysis: IntentAnalysis, 
  urgency: string, 
  historyLength: number
): number {
  let confidence = 0.7; // Base confidence
  
  // Strong indicators boost confidence
  if (analysis.indicators.length >= 3) confidence += 0.15;
  else if (analysis.indicators.length >= 2) confidence += 0.1;
  
  // Clear emotional tone boosts confidence
  if (analysis.emotionalTone === 'crisis') confidence += 0.2;
  else if (analysis.emotionalTone !== 'neutral') confidence += 0.1;
  
  // Clear urgency boosts confidence
  if (urgency === 'critical' || urgency === 'high') confidence += 0.1;
  
  // Conversation history provides context
  if (historyLength > 0) confidence += 0.05;
  
  // Topic specificity helps
  if (analysis.topicCategory.length > 0) confidence += 0.05;
  
  return Math.min(confidence, 0.95); // Cap at 95%
}

export default {
  name: AnalyzeLLMIntentTool.name,
  description: AnalyzeLLMIntentTool.description,
  agent: AnalyzeLLMIntentTool.agent,
  execute: analyzeLLMIntent
};