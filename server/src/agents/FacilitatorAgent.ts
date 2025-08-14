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
      availableTools: ['provideSupportiveResponse', 'validateFeelings', 'suggestCopingStrategies', 'postMessage', 'createActionItem', 'summarizeSession']
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
      // Step 1: Analyze emotional content and context
      const emotionalState = this.analyzeEmotionalState(message);
      const therapeuticApproach = this.selectTherapeuticApproach(message, emotionalState);
      const needsActionItem = this.checkIfActionItemNeeded(message, emotionalState);

      logger.info(`[${this.name}] Processing message:`, { 
        emotionalState, 
        therapeuticApproach,
        needsActionItem
      });

      // Step 2: Generate sophisticated therapeutic response using tools
      let therapeuticResponses: string[] = [];

      // Use provideSupportiveResponse tool for main therapeutic response
      const supportParams = {
        memberMessage: message,
        emotionalState,
        therapeuticApproach,
        previousContext: context.metadata?.sessionContext || 'Individual support session'
      };

      const supportResult = await this.executeTool('provideSupportiveResponse', supportParams, context);
      toolsUsed.push('provideSupportiveResponse');
      toolResults.push(supportResult);
      
      if (supportResult.success && supportResult.data?.response) {
        therapeuticResponses.push(supportResult.data.response);
      }

      // Use validateFeelings tool for emotional validation
      const validationParams = {
        memberMessage: message,
        identifiedEmotions: this.extractEmotionsFromMessage(message),
        intensity: this.assessEmotionalIntensity(message),
        context: emotionalState
      };

      const validationResult = await this.executeTool('validateFeelings', validationParams, context);
      toolsUsed.push('validateFeelings');
      toolResults.push(validationResult);

      if (validationResult.success && validationResult.data?.validationResponse) {
        therapeuticResponses.push(validationResult.data.validationResponse);
      }

      // Use suggestCopingStrategies tool for practical help
      const copingParams = {
        memberMessage: message,
        stressors: this.identifyStressors(message),
        urgencyLevel: emotionalState === 'crisis' ? 'crisis_management' : 'standard'
      };

      const copingResult = await this.executeTool('suggestCopingStrategies', copingParams, context);
      toolsUsed.push('suggestCopingStrategies');
      toolResults.push(copingResult);

      if (copingResult.success && copingResult.data?.response) {
        therapeuticResponses.push(copingResult.data.response);
      }

      // Combine all therapeutic responses into a cohesive message
      response = this.combineTherapeuticResponses(therapeuticResponses, emotionalState);
      
      // Step 3: Post message to the thread
      const postMessageParams = {
        groupId: context.groupId || 'default_group',
        memberId: context.memberId,
        content: response,
        messageType: 'text' as const,
        threadId: context.sessionId,
        metadata: {
          emotionalState,
          therapeuticApproach,
          agentId: this.id
        }
      };

      const postResult = await this.executeTool('postMessage', postMessageParams, context);
      toolsUsed.push('postMessage');
      toolResults.push(postResult);

      // Step 4: Create action item if needed
      if (needsActionItem) {
        const actionItems = this.identifyActionItems(message, emotionalState);
        
        for (const item of actionItems) {
          const actionParams = {
            groupId: context.groupId || 'default_group',
            assigneeId: context.memberId,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueDate: item.dueDate,
            category: item.category,
            createdBy: this.id
          };

          const actionResult = await this.executeTool('createActionItem', actionParams, context);
          toolsUsed.push('createActionItem');
          toolResults.push(actionResult);

          if (actionResult.success) {
            response += `\n\n📋 I've created an action item for you: "${item.title}"`;
          }
        }
      }

      // Step 5: Summarize session if it's ending or significant
      if (this.shouldSummarizeSession(message, context)) {
        const summaryParams = {
          groupId: context.groupId || 'default_group',
          sessionId: context.sessionId,
          includeParticipants: true,
          includeKeyTopics: true,
          includeActionItems: needsActionItem,
          summaryType: 'detailed' as const,
          audienceType: 'therapist' as const
        };

        const summaryResult = await this.executeTool('summarizeSession', summaryParams, context);
        toolsUsed.push('summarizeSession');
        toolResults.push(summaryResult);
      }

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          emotionalState,
          therapeuticApproach,
          actionItemsCreated: needsActionItem,
          messagePersisted: toolsUsed.includes('postMessage')
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

  private extractEmotionsFromMessage(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const emotions: string[] = [];
    
    const emotionMap = {
      'anxiety': ['anxious', 'worried', 'nervous', 'scared', 'panic', 'overwhelming'],
      'sadness': ['sad', 'depressed', 'down', 'hopeless', 'empty', 'grief'],
      'anger': ['angry', 'mad', 'frustrated', 'irritated', 'annoyed', 'furious'],
      'shame': ['ashamed', 'guilty', 'worthless', 'failure', 'stupid', 'embarrassed'],
      'loneliness': ['lonely', 'alone', 'isolated', 'disconnected', 'abandoned'],
      'fear': ['afraid', 'terrified', 'fearful', 'scared', 'worried'],
      'stress': ['stressed', 'overwhelmed', 'pressure', 'burnout', 'exhausted']
    };

    for (const [emotion, keywords] of Object.entries(emotionMap)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        emotions.push(emotion);
      }
    }

    return emotions.length > 0 ? emotions : ['general distress'];
  }

  private combineTherapeuticResponses(responses: string[], emotionalState: string): string {
    if (responses.length === 0) {
      return this.getErrorResponse();
    }

    // Filter out empty responses
    const validResponses = responses.filter(r => r && r.trim().length > 0);
    
    if (validResponses.length === 0) {
      return this.getErrorResponse();
    }

    // If only one response, return it with warmth
    if (validResponses.length === 1) {
      return this.addTherapeuticWarmth(validResponses[0], emotionalState);
    }

    // Combine multiple responses thoughtfully
    let combinedResponse = '';
    
    // Start with supportive/validation response if available
    if (validResponses.length >= 2) {
      combinedResponse = validResponses[0] + '\n\n' + validResponses[1];
    }
    
    // Add coping strategies as a separate section if available
    if (validResponses.length >= 3) {
      combinedResponse += '\n\n**Here are some strategies that might help:**\n\n' + validResponses[2];
    }

    return this.addTherapeuticWarmth(combinedResponse, emotionalState);
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

  private generateTherapeuticResponse(
    message: string, 
    emotionalState: string, 
    approach: string
  ): string {
    let response = '';

    // Start with validation if needed
    if (this.needsEmotionalValidation(emotionalState, message)) {
      const emotion = this.extractPrimaryEmotion(message);
      response += this.getValidationResponse(emotion, emotionalState);
    }

    // Add therapeutic content based on approach
    switch (approach) {
      case 'cbt':
        response += this.getCBTResponse(message);
        break;
      case 'dbt':
        response += this.getDBTResponse(message);
        break;
      case 'mindfulness':
        response += this.getMindfulnessResponse(message);
        break;
      case 'motivational':
        response += this.getMotivationalResponse(message);
        break;
      default:
        response += this.getValidationFocusedResponse(message);
    }

    // Add coping suggestions for distressed states
    if (emotionalState === 'distressed' || emotionalState === 'crisis') {
      response += '\n\n' + this.getCopingSuggestion(emotionalState);
    }

    // Add warmth and connection
    response = this.addTherapeuticWarmth(response, emotionalState);

    return response;
  }

  private getValidationResponse(emotion: string, emotionalState: string): string {
    const validations = {
      'anxiety': "I can hear how anxious you're feeling right now. That must be really overwhelming.",
      'sadness': "I hear the sadness in your words. It's okay to feel this way.",
      'anger': "I can sense your frustration. It's completely valid to feel angry about this.",
      'shame': "I hear how hard you're being on yourself. These feelings are difficult to carry.",
      'loneliness': "I can feel how isolated you're feeling. You're not alone in this moment.",
      'distress': "I can tell you're going through something really difficult right now."
    };

    return (validations[emotion] || validations.distress) + '\n\n';
  }

  private getCBTResponse(message: string): string {
    const cognitiveDistortions = this.identifyCognitiveDistortions(message);
    if (cognitiveDistortions.length > 0) {
      return `I notice you mentioned "${cognitiveDistortions[0]}". Sometimes our thoughts can feel very real and absolute, but they might not tell the whole story. What evidence do you have for and against this thought?`;
    }
    return "Let's explore this thought together. What specific situation triggered these feelings?";
  }

  private getDBTResponse(message: string): string {
    return "It sounds like you're experiencing some intense emotions. Let's try a DBT skill called TIPP - have you tried splashing cold water on your face or taking slow, deep breaths? These can help regulate intense emotions in the moment.";
  }

  private getMindfulnessResponse(message: string): string {
    return "When anxiety feels overwhelming, grounding ourselves in the present can help. Try this with me: Name 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. This can help anchor you to the here and now.";
  }

  private getMotivationalResponse(message: string): string {
    return "I hear some uncertainty in what you're sharing. On a scale of 1-10, how important is making this change to you? And how confident do you feel about being able to do it?";
  }

  private getValidationFocusedResponse(message: string): string {
    return "Thank you for sharing this with me. It takes courage to open up about what you're experiencing. How are you taking care of yourself through this?";
  }

  private getCopingSuggestion(emotionalState: string): string {
    if (emotionalState === 'crisis') {
      return "💙 **Immediate Support**: Please consider reaching out to a crisis helpline (988) or your therapist. Your safety is the top priority.";
    }
    return "💙 **Quick Coping**: Try the 4-7-8 breathing technique: Breathe in for 4 counts, hold for 7, exhale for 8. This activates your body's relaxation response.";
  }

  private identifyCognitiveDistortions(message: string): string[] {
    const distortions: string[] = [];
    const lowerMessage = message.toLowerCase();

    // All-or-nothing thinking
    const absoluteWords = ['always', 'never', 'everyone', 'no one', 'everything', 'nothing'];
    absoluteWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        const index = lowerMessage.indexOf(word);
        const context = message.substring(Math.max(0, index - 20), Math.min(message.length, index + 30));
        distortions.push(context.trim());
      }
    });

    return distortions;
  }

  private checkIfActionItemNeeded(message: string, emotionalState: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check for commitment language
    const commitmentWords = ['will try', 'going to', 'plan to', 'want to', 'need to', 'should'];
    const hasCommitment = commitmentWords.some(word => lowerMessage.includes(word));
    
    // Check for specific goals or tasks
    const taskWords = ['exercise', 'meditate', 'journal', 'call', 'schedule', 'practice'];
    const hasTask = taskWords.some(word => lowerMessage.includes(word));
    
    return hasCommitment && hasTask;
  }

  private identifyActionItems(message: string, emotionalState: string): Array<any> {
    const items: Array<any> = [];
    const lowerMessage = message.toLowerCase();

    // Exercise-related
    if (lowerMessage.includes('exercise') || lowerMessage.includes('walk')) {
      items.push({
        title: 'Daily Movement Practice',
        description: 'Take a 15-minute walk or do light exercise',
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        category: 'self_care'
      });
    }

    // Meditation/mindfulness
    if (lowerMessage.includes('meditate') || lowerMessage.includes('mindfulness')) {
      items.push({
        title: 'Mindfulness Practice',
        description: 'Practice 5-10 minutes of meditation or mindful breathing',
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        category: 'therapeutic'
      });
    }

    // Journaling
    if (lowerMessage.includes('journal') || lowerMessage.includes('write')) {
      items.push({
        title: 'Reflection Journal',
        description: 'Write about your thoughts and feelings for 10 minutes',
        priority: emotionalState === 'distressed' ? 'high' : 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        category: 'therapeutic'
      });
    }

    return items;
  }

  private shouldSummarizeSession(message: string, context: ToolContext): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Check for session ending indicators
    const endingWords = ['goodbye', 'bye', 'thank you', 'thanks', 'see you', 'talk later'];
    const isEnding = endingWords.some(word => lowerMessage.includes(word));
    
    // TODO: Check if session has been long enough (would need message count from context)
    
    return isEnding;
  }

  private extractKeyThemes(message: string): string[] {
    const themes: string[] = [];
    const lowerMessage = message.toLowerCase();

    const themePatterns = {
      'anxiety': ['anxiety', 'anxious', 'worry', 'panic'],
      'depression': ['depressed', 'sad', 'hopeless'],
      'relationships': ['relationship', 'partner', 'family'],
      'work-stress': ['work', 'job', 'career'],
      'self-esteem': ['confidence', 'self-worth', 'failure'],
      'trauma': ['trauma', 'ptsd', 'triggered']
    };

    Object.entries(themePatterns).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        themes.push(theme);
      }
    });

    return themes;
  }

  private calculateOverallSentiment(emotionalState: string): number {
    const sentimentMap = {
      'crisis': -1.0,
      'distressed': -0.6,
      'neutral': 0.0,
      'positive': 0.8
    };
    
    return sentimentMap[emotionalState] || 0.0;
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