/**
 * Sentiment Agent - Analyzes emotional content and detects crisis indicators
 * Provides comprehensive emotional assessment for safety monitoring
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class SentimentAgent extends BaseAgent {
  constructor() {
    super({
      id: 'sentiment',
      name: 'Sentiment Agent',
      description: 'Analyzes emotional content and detects crisis indicators for safety',
      availableTools: ['analyzeSentiment', 'detectCrisis']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0;
    let needsCrisisIntervention = false;

    try {
      // Step 1: Analyze sentiment
      const sentimentParams = {
        text: message,
        contextualFactors: {
          timeOfDay: new Date().getHours() < 6 || new Date().getHours() > 22 ? 'late_night' : 'normal',
          groupDynamics: undefined,
          recentEvents: []
        }
      };

      const sentimentResult = await this.executeTool('analyzeSentiment', sentimentParams, context);
      toolsUsed.push('analyzeSentiment');
      toolResults.push(sentimentResult);

      let emotionalScore = 0;
      let overallSentiment = 'neutral';
      let primaryEmotions: any[] = [];
      let riskFactors: string[] = [];
      let protectiveFactors: string[] = [];

      if (sentimentResult.success && sentimentResult.data) {
        const data = sentimentResult.data;
        emotionalScore = data.emotionalScore || 0;
        overallSentiment = data.overallSentiment || 'neutral';
        primaryEmotions = data.primaryEmotions || [];
        riskFactors = data.riskFactors || [];
        protectiveFactors = data.protectiveFactors || [];
      }

      // Step 2: Detect crisis if sentiment is concerning
      let crisisLevel = 'none';
      let immediateActions: string[] = [];
      
      if (emotionalScore < -0.5 || riskFactors.length > 0) {
        const crisisParams = {
          message,
          memberHistory: [],
          contextualCues: {
            timePattern: sentimentParams.contextualFactors.timeOfDay,
            behavioralChanges: []
          }
        };

        const crisisResult = await this.executeTool('detectCrisis', crisisParams, context);
        toolsUsed.push('detectCrisis');
        toolResults.push(crisisResult);

        if (crisisResult.success && crisisResult.data) {
          const crisisData = crisisResult.data;
          needsCrisisIntervention = crisisData.crisisDetected || false;
          crisisLevel = crisisData.severityLevel || 'none';
          immediateActions = crisisData.immediateActions || [];
          
          // Add crisis-specific risk factors
          if (crisisData.riskFactors) {
            riskFactors.push(...crisisData.riskFactors);
          }
        }
      }

      // Build comprehensive response
      response = this.buildSentimentAnalysisResponse({
        overallSentiment,
        emotionalScore,
        primaryEmotions,
        riskFactors,
        protectiveFactors,
        crisisLevel,
        immediateActions,
        needsCrisisIntervention
      });

      confidence = Math.max(sentimentResult.confidence || 0.8, 0.75);

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          emotionalScore,
          overallSentiment,
          crisisLevel,
          needsCrisisIntervention,
          riskFactors,
          protectiveFactors,
          primaryEmotions: primaryEmotions.map(e => e.emotion).slice(0, 3)
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.5,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private buildSentimentAnalysisResponse(analysis: {
    overallSentiment: string;
    emotionalScore: number;
    primaryEmotions: any[];
    riskFactors: string[];
    protectiveFactors: string[];
    crisisLevel: string;
    immediateActions: string[];
    needsCrisisIntervention: boolean;
  }): string {
    let response = '';

    // Crisis response takes priority
    if (analysis.needsCrisisIntervention) {
      response = `⚠️ **Important Safety Notice**\n\n`;
      response += `I'm deeply concerned about what you're sharing. Your safety is my top priority right now.\n\n`;
      
      if (analysis.immediateActions.length > 0) {
        response += `**Immediate Support Available:**\n`;
        analysis.immediateActions.forEach(action => {
          response += `• ${action}\n`;
        });
        response += '\n';
      }

      response += `**Crisis Resources:**\n`;
      response += `• National Suicide Prevention Lifeline: **988** (24/7)\n`;
      response += `• Crisis Text Line: Text **HOME** to **741741**\n`;
      response += `• Emergency Services: **911**\n\n`;
      
      response += `Please reach out for support. You don't have to go through this alone. 💙`;
      
      return response;
    }

    // Non-crisis sentiment analysis
    response = `**Emotional Analysis Summary**\n\n`;

    // Overall sentiment
    const sentimentEmoji = {
      'very_positive': '😊',
      'positive': '🙂',
      'neutral': '😐',
      'negative': '😔',
      'very_negative': '😢'
    };
    
    response += `• **Overall Mood**: ${this.formatSentiment(analysis.overallSentiment)} ${sentimentEmoji[analysis.overallSentiment] || ''}\n`;
    response += `• **Emotional Intensity**: ${this.formatIntensity(analysis.emotionalScore)}\n`;

    // Primary emotions
    if (analysis.primaryEmotions.length > 0) {
      response += `• **Key Emotions Detected**: `;
      const topEmotions = analysis.primaryEmotions
        .slice(0, 3)
        .map(e => `${e.emotion} (${Math.round(e.intensity * 100)}%)`)
        .join(', ');
      response += topEmotions + '\n';
    }

    // Risk and protective factors
    if (analysis.riskFactors.length > 0 || analysis.protectiveFactors.length > 0) {
      response += '\n**Wellbeing Indicators:**\n';
      
      if (analysis.protectiveFactors.length > 0) {
        response += `✅ Strengths: ${analysis.protectiveFactors.join(', ')}\n`;
      }
      
      if (analysis.riskFactors.length > 0) {
        response += `⚠️ Areas of concern: ${analysis.riskFactors.join(', ')}\n`;
      }
    }

    // Recommendations based on sentiment
    response += '\n**Support Suggestions:**\n';
    
    if (analysis.emotionalScore < -0.3) {
      response += `• Consider trying some grounding techniques or breathing exercises\n`;
      response += `• Connecting with your support network might be helpful\n`;
      response += `• Remember that these feelings are temporary, even when they feel overwhelming\n`;
    } else if (analysis.emotionalScore > 0.3) {
      response += `• Keep nurturing these positive feelings\n`;
      response += `• Consider journaling about what's going well\n`;
      response += `• Share your wins with your support community\n`;
    } else {
      response += `• Stay connected with your feelings as they evolve\n`;
      response += `• Regular check-ins can help maintain emotional balance\n`;
      response += `• You're doing great by staying aware of your emotional state\n`;
    }

    return response;
  }

  private formatSentiment(sentiment: string): string {
    const sentimentMap = {
      'very_positive': 'Very Positive',
      'positive': 'Positive',
      'neutral': 'Neutral',
      'negative': 'Negative', 
      'very_negative': 'Very Negative'
    };
    
    return sentimentMap[sentiment] || sentiment;
  }

  private formatIntensity(score: number): string {
    const absScore = Math.abs(score);
    
    if (absScore >= 0.8) return 'Very High';
    if (absScore >= 0.6) return 'High';
    if (absScore >= 0.4) return 'Moderate';
    if (absScore >= 0.2) return 'Low';
    return 'Minimal';
  }

  protected getErrorResponse(): string {
    return `I'm working on understanding the emotional tone of your message, but I'm experiencing some technical difficulties.

Your feelings are important, and I want to make sure I'm providing appropriate support. In the meantime:

• If you're in crisis, please call 988 or text HOME to 741741
• If this is not urgent, I'm still here to listen and support you

Please feel free to continue sharing, and I'll do my best to help.`;
  }
}