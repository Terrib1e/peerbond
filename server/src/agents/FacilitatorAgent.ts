/**
 * Facilitator Agent (Maya) - Primary therapeutic conversation handler
 * Provides empathetic support using evidence-based approaches
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class FacilitatorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'facilitator',
      name: 'Facilitator Agent (Maya)',
      description: 'Primary therapeutic conversation handler providing empathetic support',
      availableTools: ['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies']
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

    try {
      // Step 1: Analyze emotional content
      const emotionalState = this.analyzeEmotionalState(message);
      const therapeuticApproach = this.selectTherapeuticApproach(message, emotionalState);

      logger.info(`[${this.name}] Emotional analysis:`, { 
        emotionalState, 
        therapeuticApproach 
      });

      // Step 2: Generate supportive response
      const supportParams = {
        memberMessage: message,
        emotionalState,
        therapeuticApproach,
        sessionContext: {
          isFirstMessage: context.messageId ? false : true,
          previousTopics: [],
          memberGoals: []
        }
      };

      const supportResult = await this.executeTool('provideSupportiveResponse', supportParams, context);
      toolsUsed.push('provideSupportiveResponse');
      toolResults.push(supportResult);

      if (supportResult.success && supportResult.data) {
        response = supportResult.data.response;
        confidence = supportResult.confidence || 0.85;

        // Add follow-up suggestions if provided
        if (supportResult.data.followUpSuggestions && supportResult.data.followUpSuggestions.length > 0) {
          response += '\n\n' + this.formatFollowUpQuestion(supportResult.data.followUpSuggestions[0]);
        }
      }

      // Step 3: Validate feelings if strong emotions detected
      if (this.needsEmotionalValidation(emotionalState, message)) {
        const emotionExpressed = this.extractPrimaryEmotion(message);
        const intensityLevel = this.assessEmotionalIntensity(message);

        const validationParams = {
          emotionExpressed,
          intensityLevel,
          context: message,
          validationType: this.determineValidationType(emotionalState)
        };

        const validationResult = await this.executeTool('validateFeelings', validationParams, context);
        toolsUsed.push('validateFeelings');
        toolResults.push(validationResult);

        if (validationResult.success && validationResult.data) {
          // Prepend validation to response
          response = validationResult.data.validationResponse + '\n\n' + response;
          confidence = Math.max(confidence, validationResult.confidence || 0.9);
        }
      }

      // Step 4: Suggest coping strategies if distress is high
      if (emotionalState === 'distressed' || emotionalState === 'crisis') {
        const stressors = this.identifyStressors(message);
        
        const copingParams = {
          stressors,
          memberStrengths: [],
          preferredApproaches: ['cognitive', 'mindfulness'],
          urgencyLevel: emotionalState === 'crisis' ? 'crisis_management' : 'active_coping'
        };

        const copingResult = await this.executeTool('suggestCopingStrategies', copingParams, context);
        toolsUsed.push('suggestCopingStrategies');
        toolResults.push(copingResult);

        if (copingResult.success && copingResult.data) {
          // Add coping strategy to response
          const strategy = copingResult.data.strategies[0];
          if (strategy) {
            response += `\n\n💙 **Quick Support**: ${strategy.description}`;
          }
        }
      }

      // Add warmth and connection
      response = this.addTherapeuticWarmth(response, emotionalState);

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          emotionalState,
          therapeuticApproach,
          validationProvided: toolsUsed.includes('validateFeelings'),
          copingStrategiesOffered: toolsUsed.includes('suggestCopingStrategies')
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.7,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private analyzeEmotionalState(message: string): 'positive' | 'neutral' | 'distressed' | 'crisis' {
    const lowerMessage = message.toLowerCase();
    
    // Crisis indicators
    const crisisWords = ['suicide', 'kill myself', 'end it', 'can\'t go on', 'no point'];
    if (crisisWords.some(word => lowerMessage.includes(word))) {
      return 'crisis';
    }

    // Distress indicators
    const distressWords = ['depressed', 'anxious', 'hopeless', 'overwhelmed', 'struggling', 'can\'t cope'];
    if (distressWords.some(word => lowerMessage.includes(word))) {
      return 'distressed';
    }

    // Positive indicators
    const positiveWords = ['better', 'good', 'happy', 'grateful', 'progress', 'improved'];
    if (positiveWords.some(word => lowerMessage.includes(word))) {
      return 'positive';
    }

    return 'neutral';
  }

  private selectTherapeuticApproach(
    message: string, 
    emotionalState: string
  ): 'cbt' | 'dbt' | 'mindfulness' | 'validation' | 'motivational' {
    const lowerMessage = message.toLowerCase();

    // Crisis situations need validation first
    if (emotionalState === 'crisis') {
      return 'validation';
    }

    // Cognitive distortions suggest CBT
    if (lowerMessage.includes('always') || lowerMessage.includes('never') || 
        lowerMessage.includes('should') || lowerMessage.includes('must')) {
      return 'cbt';
    }

    // Emotional dysregulation suggests DBT
    if (lowerMessage.includes('out of control') || lowerMessage.includes('can\'t handle')) {
      return 'dbt';
    }

    // Stress/anxiety suggests mindfulness
    if (lowerMessage.includes('anxious') || lowerMessage.includes('stressed')) {
      return 'mindfulness';
    }

    // Ambivalence suggests motivational
    if (lowerMessage.includes('but') || lowerMessage.includes('maybe') || 
        lowerMessage.includes('don\'t know')) {
      return 'motivational';
    }

    // Default to validation
    return 'validation';
  }

  private needsEmotionalValidation(emotionalState: string, message: string): boolean {
    // Always validate in crisis or distressed states
    if (emotionalState === 'crisis' || emotionalState === 'distressed') {
      return true;
    }

    // Check for emotional expressions
    const emotionalWords = ['feel', 'feeling', 'felt', 'scared', 'angry', 'sad', 'hurt', 'frustrated'];
    return emotionalWords.some(word => message.toLowerCase().includes(word));
  }

  private extractPrimaryEmotion(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    const emotions = {
      'anxiety': ['anxious', 'worried', 'nervous', 'scared', 'panic'],
      'sadness': ['sad', 'depressed', 'down', 'hopeless', 'empty'],
      'anger': ['angry', 'mad', 'frustrated', 'irritated', 'annoyed'],
      'shame': ['ashamed', 'guilty', 'worthless', 'failure', 'stupid'],
      'loneliness': ['lonely', 'alone', 'isolated', 'disconnected']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return emotion;
      }
    }

    return 'distress';
  }

  private assessEmotionalIntensity(message: string): number {
    const lowerMessage = message.toLowerCase();
    
    // High intensity indicators
    const highIntensity = ['very', 'extremely', 'so', 'really', 'completely', 'totally', 'absolutely'];
    const intensityCount = highIntensity.filter(word => lowerMessage.includes(word)).length;
    
    // Exclamation marks indicate intensity
    const exclamationCount = (message.match(/!/g) || []).length;
    
    // All caps words indicate intensity
    const capsWords = message.match(/\b[A-Z]{2,}\b/g) || [];
    
    // Calculate intensity (1-10 scale)
    let intensity = 5; // baseline
    intensity += Math.min(intensityCount * 2, 3);
    intensity += Math.min(exclamationCount, 2);
    intensity += Math.min(capsWords.length, 2);
    
    return Math.min(intensity, 10);
  }

  private determineValidationType(emotionalState: string): 'normalize' | 'affirm' | 'reframe' | 'acknowledge' {
    switch (emotionalState) {
      case 'crisis':
        return 'acknowledge';
      case 'distressed':
        return 'normalize';
      case 'positive':
        return 'affirm';
      default:
        return 'acknowledge';
    }
  }

  private identifyStressors(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const stressors: string[] = [];

    const stressorPatterns = {
      'Work/career pressure': ['work', 'job', 'boss', 'deadline', 'career'],
      'Relationship difficulties': ['relationship', 'partner', 'family', 'friend'],
      'Financial stress': ['money', 'bills', 'debt', 'afford', 'financial'],
      'Health concerns': ['health', 'sick', 'pain', 'illness', 'doctor'],
      'Major life changes': ['moving', 'divorce', 'death', 'loss', 'change'],
      'Academic pressure': ['school', 'exam', 'study', 'grades', 'college'],
      'Social anxiety': ['people', 'social', 'crowd', 'party', 'meeting']
    };

    Object.entries(stressorPatterns).forEach(([stressor, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        stressors.push(stressor);
      }
    });

    return stressors.length > 0 ? stressors : ['General life stress'];
  }

  private formatFollowUpQuestion(question: string): string {
    // Add gentle framing to follow-up questions
    const frames = [
      `I'm curious - ${question}`,
      `If you're comfortable sharing, ${question}`,
      `${question}`,
      `I wonder - ${question}`
    ];
    
    return frames[Math.floor(Math.random() * frames.length)];
  }

  private addTherapeuticWarmth(response: string, emotionalState: string): string {
    // Add appropriate closing based on emotional state
    const closings = {
      'crisis': '\n\nI\'m here with you, and your safety matters deeply to me. 💙',
      'distressed': '\n\nYou\'re not alone in this. I\'m here to support you. 🤗',
      'neutral': '\n\nI\'m here whenever you need to talk. 😊',
      'positive': '\n\nIt\'s wonderful to hear these positive moments! Keep nurturing them. 🌟'
    };

    // Only add closing if response doesn't already have one
    if (!response.includes('💙') && !response.includes('🤗') && !response.includes('😊')) {
      return response + (closings[emotionalState] || closings.neutral);
    }

    return response;
  }

  protected getErrorResponse(): string {
    return `I'm here and I want to support you. While I'm having a technical moment, please know that what you're sharing is important. 

Could you tell me a bit more about what's on your mind? Sometimes just putting feelings into words can help, and I'm here to listen without judgment.

If you're in crisis, please reach out to:
• Crisis Text Line: Text HOME to 741741
• National Suicide Prevention Lifeline: 988`;
  }
}