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
      availableTools: ['logMood', 'escalateCrisis']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0.85;

    try {
      // Step 1: Analyze sentiment and emotional state
      const emotionalAnalysis = this.analyzeEmotionalContent(message);
      const { mood, score, primaryEmotions, riskFactors } = emotionalAnalysis;

      logger.info(`[${this.name}] Emotional analysis:`, {
        mood,
        score,
        primaryEmotions,
        riskFactors
      });

      // Step 2: Log mood for tracking
      const logMoodParams = {
        mood,
        score,
        note: message.substring(0, 200), // First 200 chars as note
        timestamp: new Date().toISOString(),
        memberId: context.memberId
      };

      const logResult = await this.executeTool('logMood', logMoodParams, context);
      toolsUsed.push('logMood');
      toolResults.push(logResult);

      // Step 3: Check if crisis escalation is needed
      const needsCrisisIntervention = this.checkCrisisIndicators(message, score, riskFactors);
      
      if (needsCrisisIntervention) {
        const escalateParams = {
          memberId: context.memberId,
          sessionId: context.sessionId,
          severity: this.determineCrisisSeverity(score, riskFactors),
          triggerMessage: message,
          riskFactors,
          immediateThreats: this.identifyImmediateThreats(message),
          timestamp: new Date().toISOString()
        };

        const escalateResult = await this.executeTool('escalateCrisis', escalateParams, context);
        toolsUsed.push('escalateCrisis');
        toolResults.push(escalateResult);

        // Generate crisis response
        response = this.generateCrisisResponse(escalateResult.success);
        confidence = 0.95; // High confidence for crisis situations
      } else {
        // Generate sentiment feedback response
        response = this.generateSentimentFeedback(emotionalAnalysis);
      }

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          mood,
          emotionalScore: score,
          primaryEmotions,
          riskFactors,
          crisisEscalated: needsCrisisIntervention,
          moodLogged: logResult.success
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

  private analyzeEmotionalContent(message: string): {
    mood: string;
    score: number;
    primaryEmotions: string[];
    riskFactors: string[];
    protectiveFactors: string[];
  } {
    const lowerMessage = message.toLowerCase();
    let score = 0;
    const emotions: string[] = [];
    const riskFactors: string[] = [];
    const protectiveFactors: string[] = [];

    // Analyze negative indicators
    const negativeWords = {
      severe: ['suicide', 'kill myself', 'end it all', 'can\'t go on', 'no point living'],
      high: ['hopeless', 'worthless', 'hate myself', 'can\'t cope', 'give up'],
      moderate: ['depressed', 'anxious', 'scared', 'lonely', 'overwhelmed'],
      mild: ['sad', 'worried', 'stressed', 'tired', 'frustrated']
    };

    // Check for negative emotions
    Object.entries(negativeWords).forEach(([severity, words]) => {
      words.forEach(word => {
        if (lowerMessage.includes(word)) {
          emotions.push(word);
          switch(severity) {
            case 'severe': 
              score -= 0.9;
              riskFactors.push(`Severe distress indicator: "${word}"`);
              break;
            case 'high': 
              score -= 0.6;
              riskFactors.push(`High distress: "${word}"`);
              break;
            case 'moderate': score -= 0.3; break;
            case 'mild': score -= 0.15; break;
          }
        }
      });
    });

    // Analyze positive indicators
    const positiveWords = ['better', 'happy', 'grateful', 'hopeful', 'calm', 'peaceful', 'content'];
    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        emotions.push(word);
        score += 0.2;
        protectiveFactors.push(`Positive emotion: ${word}`);
      }
    });

    // Check for protective factors
    if (lowerMessage.includes('support') || lowerMessage.includes('help')) {
      protectiveFactors.push('Seeking support');
      score += 0.1;
    }
    if (lowerMessage.includes('trying') || lowerMessage.includes('working on')) {
      protectiveFactors.push('Active coping');
      score += 0.1;
    }

    // Normalize score to -1 to 1 range
    score = Math.max(-1, Math.min(1, score));

    // Determine mood based on score
    let mood: string;
    if (score < -0.6) mood = 'crisis';
    else if (score < -0.3) mood = 'distressed';
    else if (score < 0.1) mood = 'low';
    else if (score < 0.4) mood = 'neutral';
    else if (score < 0.7) mood = 'positive';
    else mood = 'very_positive';

    return {
      mood,
      score,
      primaryEmotions: emotions.slice(0, 3),
      riskFactors,
      protectiveFactors
    };
  }

  private checkCrisisIndicators(message: string, score: number, riskFactors: string[]): boolean {
    // Crisis threshold based on CLAUDE.md: threshold < -0.6
    if (score < -0.6) return true;
    
    // Check for explicit crisis language
    const crisisWords = ['suicide', 'kill myself', 'end it', 'die', 'harm myself'];
    const lowerMessage = message.toLowerCase();
    
    return crisisWords.some(word => lowerMessage.includes(word));
  }

  private determineCrisisSeverity(score: number, riskFactors: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (score < -0.9 || riskFactors.some(rf => rf.includes('Severe distress'))) {
      return 'critical';
    } else if (score < -0.7) {
      return 'high';
    } else if (score < -0.6) {
      return 'medium';
    }
    return 'low';
  }

  private identifyImmediateThreats(message: string): string[] {
    const threats: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('plan') || lowerMessage.includes('method')) {
      threats.push('Possible suicide plan mentioned');
    }
    if (lowerMessage.includes('goodbye') || lowerMessage.includes('final')) {
      threats.push('Finality language detected');
    }
    if (lowerMessage.includes('pills') || lowerMessage.includes('weapon')) {
      threats.push('Means mentioned');
    }
    
    return threats;
  }

  private generateCrisisResponse(escalationSuccess: boolean): string {
    if (escalationSuccess) {
      return `🆘 **Crisis Support Activated**

I've noticed you're going through an extremely difficult time, and I'm deeply concerned about your safety. 

**Immediate help is on the way:**
✅ Our crisis team has been notified
✅ A trained counselor will contact you shortly
✅ Your safety is our top priority

**While you wait, please:**
📞 Call **988** for immediate support (Suicide & Crisis Lifeline)
💬 Text **HOME** to **741741** (Crisis Text Line)
🆘 If in immediate danger, call **911**

You are not alone. We are here for you. 💙`;
    } else {
      return `I'm very concerned about what you're sharing. Your safety matters deeply.

**Please reach out for immediate support:**
• National Suicide Prevention Lifeline: **988**
• Crisis Text Line: Text **HOME** to **741741**
• Emergency Services: **911**

You deserve support and you don't have to face this alone. 💙`;
    }
  }

  private generateSentimentFeedback(analysis: any): string {
    const { mood, score, primaryEmotions, protectiveFactors } = analysis;
    
    let response = '';
    
    // Only provide feedback for significant emotional content
    if (Math.abs(score) < 0.2 && primaryEmotions.length === 0) {
      return ''; // No response for neutral messages
    }
    
    if (score < -0.3) {
      response = `I'm noticing you're experiencing some difficult emotions right now. `;
      if (primaryEmotions.length > 0) {
        response += `You mentioned feeling ${primaryEmotions.join(', ')}. `;
      }
      response += `Your feelings are valid and it's okay to not be okay sometimes.\n\n`;
      
      if (protectiveFactors.length > 0) {
        response += `I'm glad to see that you're ${protectiveFactors[0].toLowerCase()}. That shows real strength. `;
      }
      
      response += `Remember, support is always available when you need it.`;
    } else if (score > 0.3) {
      response = `It's wonderful to hear some positive notes in your message. `;
      if (primaryEmotions.length > 0) {
        response += `Feeling ${primaryEmotions.join(', ')} is something to celebrate. `;
      }
      response += `Keep nurturing these positive moments - they're important for your wellbeing.`;
    }
    
    return response;
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