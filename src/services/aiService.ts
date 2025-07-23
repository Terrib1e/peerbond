import { Message, User, ActionItem, Insight } from '@/types';
import { db } from '@/lib/database';

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface AIToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface AIResponse {
  content: string;
  toolCalls?: AIToolCall[];
  confidence: number;
  reasoning?: string;
}

export interface ConversationContext {
  groupId: string;
  messages: Message[];
  participants: User[];
  groupType: string;
  sessionDuration: number;
  lastFacilitatorMessage?: Date;
}

export class AIService {
  private static readonly TOOLS: AITool[] = [
    {
      name: 'create_action_item',
      description: 'Create an action item for a group member to complete',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Description of the action item' },
          assignedTo: { type: 'string', description: 'User ID to assign the action item to' },
          dueDate: { type: 'string', description: 'Due date in ISO format' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['description', 'assignedTo', 'dueDate'],
      },
    },
    {
      name: 'generate_insight',
      description: 'Generate an insight about group dynamics or individual progress',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the insight' },
          description: { type: 'string', description: 'Detailed description of the insight' },
          category: { type: 'string', enum: ['progress', 'concern', 'milestone', 'recommendation'] },
          relevantMembers: { type: 'array', items: { type: 'string' }, description: 'User IDs relevant to this insight' },
        },
        required: ['title', 'description', 'category'],
      },
    },
    {
      name: 'suggest_resources',
      description: 'Suggest helpful resources based on conversation context',
      parameters: {
        type: 'object',
        properties: {
          resourceType: { type: 'string', enum: ['article', 'exercise', 'technique', 'app', 'book'] },
          title: { type: 'string', description: 'Title of the resource' },
          description: { type: 'string', description: 'Why this resource is helpful' },
          url: { type: 'string', description: 'URL to the resource (if available)' },
        },
        required: ['resourceType', 'title', 'description'],
      },
    },
    {
      name: 'analyze_sentiment',
      description: 'Analyze the emotional tone of recent messages',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to analyze' },
          timeframe: { type: 'string', enum: ['current', 'recent', 'session'] },
        },
        required: ['userId'],
      },
    },
    {
      name: 'check_wellness',
      description: 'Check in on a specific user\'s wellness',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID to check on' },
          concern: { type: 'string', description: 'Specific concern to address' },
        },
        required: ['userId'],
      },
    },
  ];

  private static async simulateAIResponse(
    context: ConversationContext,
    _prompt: string
  ): Promise<AIResponse> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // const recentMessages = context.messages.slice(-5);
    // Analyze context and determine appropriate response
    const response = await this.generateContextualResponse(context, _prompt);

    return response;
  }

  private static async generateContextualResponse(
    context: ConversationContext,
    _prompt: string
  ): Promise<AIResponse> {
    const { groupType, messages, participants } = context;
    const recentMessages = messages.slice(-3);

    // Determine if we should use tools based on context
    const shouldCreateActionItem = this.shouldCreateActionItem(recentMessages);
    const shouldGenerateInsight = this.shouldGenerateInsight(messages, participants);
    const shouldSuggestResources = this.shouldSuggestResources(recentMessages, groupType);

    let content = '';
    const toolCalls: AIToolCall[] = [];

    // Generate base response
    content = await this.generateBaseResponse(context);

    // Add tool calls if appropriate
    if (shouldCreateActionItem) {
      const actionItemCall = this.generateActionItemCall(recentMessages, participants);
      if (actionItemCall) toolCalls.push(actionItemCall);
    }

    if (shouldGenerateInsight) {
      const insightCall = this.generateInsightCall(messages, participants);
      if (insightCall) toolCalls.push(insightCall);
    }

    if (shouldSuggestResources) {
      const resourceCall = this.generateResourceCall(recentMessages, groupType);
      if (resourceCall) toolCalls.push(resourceCall);
    }

    return {
      content,
      toolCalls,
      confidence: 0.85,
      reasoning: `Analyzed ${messages.length} messages from ${participants.length} participants in ${groupType} group`,
    };
  }

  private static async generateBaseResponse(context: ConversationContext): Promise<string> {
    const { groupType, messages } = context;
    const recentMessages = messages.slice(-3);

    // Analyze recent message content
    const topics = this.extractTopics(recentMessages);
    const emotions = this.analyzeEmotions(recentMessages);
    const needsSupport = this.identifyNeedsSupport(recentMessages);

    // Generate appropriate response based on context
    if (needsSupport.length > 0) {
      return this.generateSupportiveResponse(needsSupport, topics);
    }

    if (emotions.positive > emotions.negative) {
      return this.generateEncouragingResponse(topics);
    }

    if (topics.includes('challenge') || topics.includes('difficulty')) {
      return this.generateCopingResponse(groupType);
    }

    return this.generateGeneralResponse(groupType, topics);
  }

  private static extractTopics(messages: Message[]): string[] {
    const topics: string[] = [];
    const topicKeywords = {
      anxiety: ['anxious', 'worried', 'panic', 'stress', 'nervous'],
      depression: ['sad', 'down', 'hopeless', 'empty', 'dark'],
      recovery: ['sober', 'clean', 'relapse', 'recovery', 'addiction'],
      progress: ['better', 'improvement', 'progress', 'growing', 'healing'],
      challenge: ['difficult', 'hard', 'struggle', 'tough', 'overwhelming'],
      gratitude: ['grateful', 'thankful', 'appreciate', 'blessing', 'lucky'],
      coping: ['cope', 'manage', 'handle', 'deal', 'strategy'],
    };

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          topics.push(topic);
        }
      });
    });

    return [...new Set(topics)];
  }

  private static analyzeEmotions(messages: Message[]): { positive: number; negative: number; neutral: number } {
    const emotions = { positive: 0, negative: 0, neutral: 0 };

    const positiveWords = ['happy', 'good', 'great', 'better', 'progress', 'grateful', 'strong', 'hope'];
    const negativeWords = ['sad', 'bad', 'worse', 'difficult', 'hard', 'struggle', 'pain', 'worry'];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      let messageEmotion = 0;

      positiveWords.forEach(word => {
        if (content.includes(word)) messageEmotion++;
      });

      negativeWords.forEach(word => {
        if (content.includes(word)) messageEmotion--;
      });

      if (messageEmotion > 0) emotions.positive++;
      else if (messageEmotion < 0) emotions.negative++;
      else emotions.neutral++;
    });

    return emotions;
  }

  private static identifyNeedsSupport(messages: Message[]): string[] {
    const needsSupport: string[] = [];
    const supportIndicators = [
      'need help', 'struggling', 'overwhelmed', 'can\'t handle', 'giving up',
      'hopeless', 'alone', 'scared', 'don\'t know what to do'
    ];

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      if (supportIndicators.some(indicator => content.includes(indicator))) {
        needsSupport.push(msg.userId);
      }
    });

    return [...new Set(needsSupport)];
  }

  private static generateSupportiveResponse(_needsSupport: string[], _topics: string[]): string {
    const responses = [
      "I can hear that you're going through a tough time right now. Your feelings are valid, and it's okay to struggle sometimes.",
      "Thank you for sharing what's on your heart. It takes courage to be vulnerable, and this group is here to support you.",
      "Remember that difficult moments are part of the journey. You've shown strength by reaching out to this group.",
      "Your honesty helps create a safe space for everyone. What's one small step you could take today to care for yourself?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private static generateEncouragingResponse(_topics: string[]): string {
    const responses = [
      "It's wonderful to hear the positive energy in this group today. Keep building on this momentum!",
      "I'm noticing some real progress in your sharing. How does it feel to recognize this growth?",
      "The support you're showing each other is truly inspiring. This is what community looks like.",
      "Your resilience is shining through. What's helping you maintain this positive perspective?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private static generateCopingResponse(groupType: string): string {
    const responses = {
      recovery: [
        "Challenges are part of recovery. What coping strategies have worked for you in the past?",
        "Remember your 'why' - the reasons you started this journey. They're still valid today.",
        "One day at a time, one moment at a time. You don't have to handle everything at once.",
      ],
      anxiety: [
        "When anxiety feels overwhelming, try grounding yourself. Name 5 things you can see, 4 you can touch, 3 you can hear.",
        "Your breath is always with you as an anchor. Try taking three deep, slow breaths.",
        "Anxiety is temporary, even when it doesn't feel like it. You've gotten through difficult moments before.",
      ],
      depression: [
        "Depression can make everything feel harder. What's one tiny thing you can do today to care for yourself?",
        "Your presence here, even when it's hard, is an act of self-care. That matters.",
        "Small steps count. Progress isn't always linear, and that's okay.",
      ],
      general: [
        "Difficult times teach us about our strength. What resources can you draw on right now?",
        "You're not alone in this. What support do you need from the group today?",
        "Challenges are opportunities to practice resilience. What's one thing you're learning about yourself?",
      ],
    };

    const groupResponses = responses[groupType as keyof typeof responses] || responses.general;
    return groupResponses[Math.floor(Math.random() * groupResponses.length)];
  }

  private static generateGeneralResponse(_groupType: string, _topics: string[]): string {
    const responses = [
      "I'm glad to see everyone engaging with each other. How is everyone feeling about our discussion today?",
      "There's a lot of wisdom being shared in this group. What resonates most with you?",
      "Thank you all for creating such a supportive environment. What would you like to explore further?",
      "I'm noticing some common themes in what you're sharing. How do these connect to your goals?",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Tool generation methods
  private static shouldCreateActionItem(messages: Message[]): boolean {
    const actionKeywords = ['goal', 'plan', 'try', 'commit', 'practice', 'work on'];
    return messages.some(msg =>
      actionKeywords.some(keyword => msg.content.toLowerCase().includes(keyword))
    );
  }

  private static shouldGenerateInsight(messages: Message[], _participants: User[]): boolean {
    return messages.length > 10 && _participants.length > 2;
  }

  private static shouldSuggestResources(messages: Message[], _groupType: string): boolean {
    const resourceKeywords = ['help', 'resource', 'technique', 'strategy', 'learn'];
    return messages.some(msg =>
      resourceKeywords.some(keyword => msg.content.toLowerCase().includes(keyword))
    );
  }

  private static generateActionItemCall(messages: Message[], participants: User[]): AIToolCall | null {
    const lastMessage = messages[messages.length - 1];
    const user = participants.find(p => p.id === lastMessage.userId);

    if (!user) return null;

    const actionDescriptions = [
      'Practice the breathing technique we discussed for 5 minutes daily',
      'Write in a gratitude journal for 3 days',
      'Take a 10-minute walk outside',
      'Check in with a friend or family member',
      'Practice one mindfulness exercise',
    ];

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    return {
      tool: 'create_action_item',
      parameters: {
        description: actionDescriptions[Math.floor(Math.random() * actionDescriptions.length)],
        assignedTo: user.id,
        dueDate: dueDate.toISOString(),
        priority: 'medium',
      },
    };
  }

  private static generateInsightCall(_messages: Message[], participants: User[]): AIToolCall | null {
    const insights = [
      {
        title: 'Strong Group Cohesion',
        description: 'Group members are consistently supporting each other and building on shared experiences.',
        category: 'progress',
      },
      {
        title: 'Increased Vulnerability',
        description: 'Participants are sharing more personal experiences, indicating growing trust.',
        category: 'milestone',
      },
      {
        title: 'Consistent Engagement',
        description: 'All group members are participating regularly, showing commitment to the process.',
        category: 'progress',
      },
    ];

    const insight = insights[Math.floor(Math.random() * insights.length)];

    return {
      tool: 'generate_insight',
      parameters: {
        ...insight,
        relevantMembers: participants.map(p => p.id),
      },
    };
  }

  private static generateResourceCall(_messages: Message[], groupType: string): AIToolCall | null {
    const resources = {
      recovery: [
        {
          resourceType: 'app',
          title: 'Recovery Dharma',
          description: 'Community-based approach to recovery with Buddhist-inspired practices',
        },
        {
          resourceType: 'technique',
          title: 'HALT Check-in',
          description: 'Ask yourself: Am I Hungry, Angry, Lonely, or Tired? Address basic needs first',
        },
      ],
      anxiety: [
        {
          resourceType: 'exercise',
          title: '5-4-3-2-1 Grounding Technique',
          description: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste',
        },
        {
          resourceType: 'technique',
          title: 'Box Breathing',
          description: 'Inhale for 4, hold for 4, exhale for 4, hold for 4. Repeat 4 times',
        },
      ],
      depression: [
        {
          resourceType: 'exercise',
          title: 'Three Good Things',
          description: 'Each evening, write down three things that went well and why',
        },
        {
          resourceType: 'technique',
          title: 'Behavioral Activation',
          description: 'Schedule one small, meaningful activity each day, even when motivation is low',
        },
      ],
    };

    const groupResources = resources[groupType as keyof typeof resources] || resources.anxiety;
    const resource = groupResources[Math.floor(Math.random() * groupResources.length)];

    return {
      tool: 'suggest_resources',
      parameters: resource,
    };
  }

  // Public API methods
  static async generateResponse(
    context: ConversationContext,
    prompt?: string
  ): Promise<AIResponse> {
    const defaultPrompt = "Generate an appropriate facilitator response based on the conversation context.";
    return this.simulateAIResponse(context, prompt || defaultPrompt);
  }

  static async executeTool(toolCall: AIToolCall, context: ConversationContext): Promise<any> {
    const { tool, parameters } = toolCall;

    switch (tool) {
      case 'create_action_item':
        return this.executeCreateActionItem(parameters, context);

      case 'generate_insight':
        return this.executeGenerateInsight(parameters, context);

      case 'suggest_resources':
        return this.executeSuggestResources(parameters, context);

      case 'analyze_sentiment':
        return this.executeAnalyzeSentiment(parameters, context);

      case 'check_wellness':
        return this.executeCheckWellness(parameters, context);

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  private static async executeCreateActionItem(parameters: any, context: ConversationContext): Promise<ActionItem> {
    const actionItem = await db.addActionItem(context.groupId, {
      groupId: context.groupId,
      assignedTo: parameters.assignedTo,
      description: parameters.description,
      dueDate: new Date(parameters.dueDate),
      status: 'pending',
      createdBy: 'ai-facilitator',
    });

    return actionItem;
  }

  private static async executeGenerateInsight(parameters: any, context: ConversationContext): Promise<Insight> {
    const insight = await db.addInsight(context.groupId, {
      groupId: context.groupId,
      title: parameters.title,
      description: parameters.description,
      category: parameters.category,
      relevantMembers: parameters.relevantMembers || [],
    });

    return insight;
  }

  private static async executeSuggestResources(parameters: any, _context: ConversationContext): Promise<any> {
    // In a real implementation, this would save to a resources database
    return {
      id: `resource_${Date.now()}`,
      ...parameters,
      suggestedAt: new Date(),
    };
  }

  private static async executeAnalyzeSentiment(parameters: any, context: ConversationContext): Promise<any> {
    const userMessages = context.messages.filter(msg => msg.userId === parameters.userId);
    const emotions = this.analyzeEmotions(userMessages);

    return {
      userId: parameters.userId,
      sentiment: emotions,
      analyzedAt: new Date(),
    };
  }

  private static async executeCheckWellness(parameters: any, _context: ConversationContext): Promise<any> {
    // In a real implementation, this would trigger a wellness check workflow
    return {
      userId: parameters.userId,
      concern: parameters.concern,
      checkInitiated: true,
      checkedAt: new Date(),
    };
  }

  static getAvailableTools(): AITool[] {
    return this.TOOLS;
  }
}