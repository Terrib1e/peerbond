/**
 * Personalization Agent - Adapts interactions based on member preferences and history
 * Provides personalized content and adaptive communication styles
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class PersonalizationAgent extends BaseAgent {
  constructor() {
    super({
      id: 'personalization',
      name: 'Personalization Agent',
      description: 'Adapts interactions based on member preferences and behavioral patterns',
      availableTools: ['updateMemberPreferences', 'adaptToMember', 'generatePersonalizedContent']
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
      // Analyze the personalization request
      const personalizationRequest = this.analyzePersonalizationRequest(message);
      
      logger.info(`[${this.name}] Processing personalization request`, {
        requestType: personalizationRequest.type,
        memberId: context.memberId,
        hasPreferences: !!personalizationRequest.preferences,
        contentType: personalizationRequest.contentType
      });

      // Step 1: Update member preferences if provided
      if (personalizationRequest.preferences && Object.keys(personalizationRequest.preferences).length > 0) {
        const updateParams = {
          memberId: context.memberId,
          preferences: personalizationRequest.preferences,
          source: personalizationRequest.source || 'explicit'
        };

        const updateResult = await this.executeTool('updateMemberPreferences', updateParams, context);
        toolsUsed.push('updateMemberPreferences');
        toolResults.push(updateResult);

        if (updateResult.success && updateResult.data) {
          response += `I've updated your preferences! I learned ${updateResult.data.preferencesCount} new things about how you like to receive support. `;
        }
      }

      // Step 2: Adapt communication style to member
      const currentContext = this.determineCurrentContext(message, personalizationRequest);
      const adaptationParams = {
        memberId: context.memberId,
        interactionHistory: [], // TODO: Get from member history
        currentContext,
        adaptationAreas: this.identifyAdaptationAreas(personalizationRequest)
      };

      const adaptationResult = await this.executeTool('adaptToMember', adaptationParams, context);
      toolsUsed.push('adaptToMember');
      toolResults.push(adaptationResult);

      let adaptedApproach = 'supportive';
      let recommendedTone = 'warm';
      let avoidanceList: string[] = [];

      if (adaptationResult.success && adaptationResult.data) {
        adaptedApproach = adaptationResult.data.adaptedApproach;
        recommendedTone = adaptationResult.data.recommendedTone;
        avoidanceList = adaptationResult.data.avoidanceList || [];
        confidence = Math.max(confidence, adaptationResult.data.confidence || 0.8);
      }

      // Step 3: Generate personalized content if requested
      if (personalizationRequest.needsContent) {
        const contentParams = {
          memberId: context.memberId,
          contentType: personalizationRequest.contentType || 'encouragement',
          memberProfile: {
            challenges: personalizationRequest.challenges || [],
            strengths: personalizationRequest.strengths || [],
            preferences: personalizationRequest.preferences ? Object.keys(personalizationRequest.preferences) : [],
            learningStyle: personalizationRequest.learningStyle
          },
          contextualFactors: {
            recentMood: this.inferMoodFromMessage(message),
            timeOfDay: this.getTimeOfDay(),
            availableTime: personalizationRequest.availableTime
          }
        };

        const contentResult = await this.executeTool('generatePersonalizedContent', contentParams, context);
        toolsUsed.push('generatePersonalizedContent');
        toolResults.push(contentResult);

        if (contentResult.success && contentResult.data) {
          response += contentResult.data.content;
          
          // Add follow-up suggestions if provided
          if (contentResult.data.followUpSuggestions && contentResult.data.followUpSuggestions.length > 0) {
            response += '\n\n' + this.formatFollowUpSuggestions(contentResult.data.followUpSuggestions);
          }
        }
      } else {
        // Generate adaptive response based on analysis
        response += this.generateAdaptiveResponse(
          personalizationRequest,
          adaptedApproach,
          recommendedTone,
          avoidanceList
        );
      }

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          personalizationRequest,
          adaptedApproach,
          recommendedTone,
          avoidanceList,
          preferencesUpdated: toolsUsed.includes('updateMemberPreferences'),
          contentGenerated: toolsUsed.includes('generatePersonalizedContent')
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

  private analyzePersonalizationRequest(message: string): any {
    const lowerMessage = message.toLowerCase();
    let requestType = 'general';
    let needsContent = false;
    let preferences: any = {};
    let contentType: string | undefined;
    let source = 'explicit';

    // Detect preference updates
    if (lowerMessage.includes('prefer') || lowerMessage.includes('like') || lowerMessage.includes('want')) {
      requestType = 'preference_update';
      preferences = this.extractPreferences(message);
    }

    // Detect content requests
    if (lowerMessage.includes('help me') || lowerMessage.includes('suggest') || lowerMessage.includes('recommend')) {
      needsContent = true;
      contentType = this.inferContentType(message);
    }

    // Detect adaptation requests
    if (lowerMessage.includes('adapt') || lowerMessage.includes('adjust') || lowerMessage.includes('change')) {
      requestType = 'adaptation';
    }

    // Extract member profile information
    const challenges = this.extractChallenges(message);
    const strengths = this.extractStrengths(message);
    const learningStyle = this.inferLearningStyle(message);
    const availableTime = this.extractAvailableTime(message);

    return {
      type: requestType,
      needsContent,
      contentType,
      preferences,
      challenges,
      strengths,
      learningStyle,
      availableTime,
      source
    };
  }

  private extractPreferences(message: string): any {
    const preferences: any = {};
    const lowerMessage = message.toLowerCase();

    // Communication style preferences
    if (lowerMessage.includes('gentle') || lowerMessage.includes('soft')) {
      preferences.communicationStyle = 'gentle';
    } else if (lowerMessage.includes('direct') || lowerMessage.includes('straightforward')) {
      preferences.communicationStyle = 'direct';
    } else if (lowerMessage.includes('encouraging') || lowerMessage.includes('motivating')) {
      preferences.communicationStyle = 'encouraging';
    }

    // Support type preferences
    const supportPreferences: string[] = [];
    if (lowerMessage.includes('validation') || lowerMessage.includes('understand')) {
      supportPreferences.push('validation');
    }
    if (lowerMessage.includes('advice') || lowerMessage.includes('suggestion')) {
      supportPreferences.push('practical_advice');
    }
    if (lowerMessage.includes('resource') || lowerMessage.includes('information')) {
      supportPreferences.push('resources');
    }
    if (lowerMessage.includes('connect') || lowerMessage.includes('others')) {
      supportPreferences.push('peer_connection');
    }

    if (supportPreferences.length > 0) {
      preferences.preferredSupport = supportPreferences;
    }

    // Trigger words to avoid
    const triggerWords: string[] = [];
    if (lowerMessage.includes('avoid') || lowerMessage.includes('don\'t like')) {
      const avoidPattern = /avoid|don't like|triggers?.*(?:me|anxiety|panic)/gi;
      const matches = message.match(avoidPattern);
      if (matches) {
        // Simple extraction - in production this would be more sophisticated
        if (lowerMessage.includes('negative')) triggerWords.push('negative language');
        if (lowerMessage.includes('pressure')) triggerWords.push('pressure language');
        if (lowerMessage.includes('failure')) triggerWords.push('failure language');
      }
    }

    if (triggerWords.length > 0) {
      preferences.triggerWords = triggerWords;
    }

    // Notification preferences
    if (lowerMessage.includes('daily') || lowerMessage.includes('every day')) {
      preferences.notificationSettings = { frequency: 'daily' };
    } else if (lowerMessage.includes('weekly') || lowerMessage.includes('once a week')) {
      preferences.notificationSettings = { frequency: 'weekly' };
    }

    return preferences;
  }

  private inferContentType(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('coping') || lowerMessage.includes('manage') || lowerMessage.includes('strategy')) {
      return 'coping_strategy';
    }
    if (lowerMessage.includes('encourage') || lowerMessage.includes('motivate') || lowerMessage.includes('inspire')) {
      return 'encouragement';
    }
    if (lowerMessage.includes('learn') || lowerMessage.includes('understand') || lowerMessage.includes('information')) {
      return 'educational';
    }
    if (lowerMessage.includes('reflect') || lowerMessage.includes('think about') || lowerMessage.includes('consider')) {
      return 'reflection_prompt';
    }
    if (lowerMessage.includes('resource') || lowerMessage.includes('tool') || lowerMessage.includes('help')) {
      return 'resource';
    }

    return 'encouragement'; // Default
  }

  private extractChallenges(message: string): string[] {
    const challenges: string[] = [];
    const lowerMessage = message.toLowerCase();

    const challengePatterns = {
      'anxiety': ['anxiety', 'anxious', 'worry', 'panic'],
      'depression': ['depressed', 'depression', 'sad', 'hopeless'],
      'stress': ['stress', 'overwhelmed', 'pressure'],
      'relationships': ['relationship', 'social', 'connect', 'lonely'],
      'self-esteem': ['confidence', 'self-worth', 'doubt', 'failure'],
      'trauma': ['trauma', 'ptsd', 'triggered'],
      'addiction': ['addiction', 'substance', 'drinking', 'drugs']
    };

    Object.entries(challengePatterns).forEach(([challenge, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        challenges.push(challenge);
      }
    });

    return challenges;
  }

  private extractStrengths(message: string): string[] {
    const strengths: string[] = [];
    const lowerMessage = message.toLowerCase();

    const strengthPatterns = {
      'resilience': ['bounce back', 'recover', 'overcome', 'survived'],
      'self-awareness': ['understand myself', 'recognize', 'aware', 'insight'],
      'determination': ['determined', 'persistent', 'won\'t give up'],
      'empathy': ['empathy', 'understand others', 'caring', 'compassionate'],
      'creativity': ['creative', 'artistic', 'imagination'],
      'problem-solving': ['solve', 'figure out', 'analyze', 'logical']
    };

    Object.entries(strengthPatterns).forEach(([strength, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        strengths.push(strength);
      }
    });

    return strengths;
  }

  private inferLearningStyle(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('visual') || lowerMessage.includes('see') || lowerMessage.includes('image')) {
      return 'visual';
    }
    if (lowerMessage.includes('audio') || lowerMessage.includes('listen') || lowerMessage.includes('hear')) {
      return 'auditory';
    }
    if (lowerMessage.includes('hands-on') || lowerMessage.includes('practice') || lowerMessage.includes('do')) {
      return 'kinesthetic';
    }
    if (lowerMessage.includes('read') || lowerMessage.includes('write') || lowerMessage.includes('text')) {
      return 'reading';
    }

    return undefined;
  }

  private extractAvailableTime(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('5') && lowerMessage.includes('minute')) return '5_minutes';
    if (lowerMessage.includes('15') && lowerMessage.includes('minute')) return '15_minutes';
    if (lowerMessage.includes('30') && lowerMessage.includes('minute')) return '30_minutes';
    if (lowerMessage.includes('hour')) return '1_hour';
    if (lowerMessage.includes('quick') || lowerMessage.includes('brief')) return '5_minutes';
    if (lowerMessage.includes('short')) return '15_minutes';

    return undefined;
  }

  private determineCurrentContext(message: string, request: any): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('crisis') || lowerMessage.includes('emergency')) return 'crisis';
    if (lowerMessage.includes('celebrate') || lowerMessage.includes('achievement')) return 'celebration';
    if (lowerMessage.includes('learn') || lowerMessage.includes('understand')) return 'learning';
    if (lowerMessage.includes('routine') || lowerMessage.includes('check-in')) return 'routine_check';
    
    return 'seeking_support';
  }

  private identifyAdaptationAreas(request: any): string[] {
    const areas: string[] = ['tone'];

    if (request.preferences?.communicationStyle) {
      areas.push('approach');
    }
    if (request.learningStyle) {
      areas.push('examples');
    }
    if (request.availableTime) {
      areas.push('pacing');
    }
    if (request.challenges?.length > 0) {
      areas.push('depth');
    }

    return areas;
  }

  private inferMoodFromMessage(message: string): string {
    const lowerMessage = message.toLowerCase();

    const positiveWords = ['good', 'better', 'happy', 'excited', 'grateful'];
    const negativeWords = ['bad', 'worse', 'sad', 'anxious', 'frustrated'];

    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'late_night';
  }

  private generateAdaptiveResponse(
    request: any,
    approach: string,
    tone: string,
    avoidanceList: string[]
  ): string {
    let response = '';

    // Adapt greeting based on tone
    const greetings = {
      'warm': "I'm so glad you reached out! ",
      'gentle': "Thank you for sharing with me. ",
      'direct': "I understand what you're looking for. ",
      'encouraging': "It's wonderful that you're taking this step! "
    };

    response += greetings[tone] || greetings.warm;

    // Adapt main content based on approach
    if (approach === 'supportive') {
      response += "I'm here to provide personalized support that fits your unique needs and preferences. ";
    } else if (approach === 'educational') {
      response += "Let me help you learn and understand in a way that works best for you. ";
    } else if (approach === 'collaborative') {
      response += "We'll work together to find approaches that resonate with your style and goals. ";
    }

    // Add personalization acknowledgment
    if (request.preferences && Object.keys(request.preferences).length > 0) {
      response += "I've noted your preferences and will adapt my communication style accordingly. ";
    }

    // Mention learning style if detected
    if (request.learningStyle) {
      const styleMessages = {
        'visual': "Since you prefer visual learning, I can include diagrams and visual examples in our conversations.",
        'auditory': "Given your auditory learning preference, I'll focus on clear explanations and verbal techniques.",
        'kinesthetic': "I understand you learn best through hands-on practice, so I'll suggest actionable exercises.",
        'reading': "Since you prefer reading, I can provide detailed written resources and text-based materials."
      };
      response += styleMessages[request.learningStyle] + " ";
    }

    // Add time-sensitive message if applicable
    if (request.availableTime) {
      const timeMessages = {
        '5_minutes': "I'll keep things concise since you have limited time.",
        '15_minutes': "I'll provide focused suggestions that fit your 15-minute window.",
        '30_minutes': "We have good time to explore your needs in depth.",
        '1_hour': "Great! We have plenty of time to dive deep into personalized strategies."
      };
      response += timeMessages[request.availableTime] + " ";
    }

    response += "\n\nWhat would you like to focus on today? I'm here to adapt to whatever approach feels most helpful for you.";

    return response;
  }

  private formatFollowUpSuggestions(suggestions: string[]): string {
    if (suggestions.length === 0) return '';
    
    let formatted = "Here are some personalized next steps for you:\n";
    suggestions.forEach((suggestion, index) => {
      formatted += `${index + 1}. ${suggestion}\n`;
    });
    
    return formatted;
  }

  protected getErrorResponse(): string {
    return `I'm having some technical difficulties with personalizing our interaction right now, but I still want to help you!

I can provide general support while I work on understanding your specific preferences better. What would you like to talk about today?

In the meantime, feel free to let me know:
• How you prefer to receive support (gentle, direct, encouraging)
• Any topics or words you'd like me to avoid
• Whether you prefer short or detailed responses
• Your current mood and what would be most helpful

I'm here to adapt to your needs in whatever way I can.`;
  }
}

export default PersonalizationAgent;