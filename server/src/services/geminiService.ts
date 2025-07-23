import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { Message, Group, User } from '../types';

export interface GeminiFacilitatorResponse {
  message: string;
  actionItems?: any[];
  insights?: any[];
  confidenceScore: number;
  reasoning?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY not provided. AI features will be disabled.');
      this.genAI = null;
      this.model = null;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 512,
      },
    });
  }

  async generateFacilitatorResponse(
    userMessage: Message,
    recentMessages: Message[],
    group: Group,
    activeUsers: any[]
  ): Promise<any> {
    try {
      // Check if AI service is available
      if (!this.genAI || !this.model) {
        console.log('Gemini AI service not available, using fallback response');
        return this.getFallbackResponse(userMessage.content);
      }

      const contextMessages = recentMessages.slice(-5).map(msg =>
        `${msg.userId === 'ai-facilitator' ? 'Maya (AI Facilitator)' : 'User'}: ${msg.content}`
      ).join('\n');

      const prompt = `You are Maya, an AI therapeutic facilitator for a ${group.type} support group called "${group.name}".

YOUR ROLE AS A THERAPEUTIC TOOL:
- You are a selective, thoughtful facilitator - not a chatty AI
- You respond ONLY when you can add meaningful therapeutic value
- Your responses should be purposeful, not conversational filler
- Think like a skilled therapist who speaks carefully and intentionally
- Quality over quantity - every word should serve a therapeutic purpose

CURRENT SITUATION:
- Group has ${activeUsers.length} active members
- Recent conversation context:
${contextMessages}

- Latest message from user: "${userMessage.content}"

RESPONSE CRITERIA (you should ONLY respond if the message involves):
1. **Crisis/Distress** - Someone needs immediate support or intervention
2. **Direct Request** - Someone explicitly asks for facilitator input
3. **Therapeutic Moment** - A teachable moment for growth or insight
4. **Group Dynamics** - Need to redirect conversation or include others
5. **Milestone Celebration** - Significant achievement worth acknowledging

YOUR RESPONSE STYLE:
- **Concise** (1-2 sentences maximum)
- **Purposeful** - every word serves a therapeutic function
- **Professional yet warm** - like a skilled therapist
- **Question-focused** - encourage self-reflection and peer support
- **Trauma-informed** - validate without overwhelming

PREFERRED RESPONSES:
- "What's coming up for you as you share this?"
- "I'm hearing [emotion] - how is the group holding space for you right now?"
- "Thank you for that courage. What support do you need?"
- "[Name], how are you experiencing this conversation?"
- "What wisdom would you offer someone in a similar situation?"

Remember: Silence is therapeutic. Let the group process and support each other. Only speak when your voice adds essential therapeutic value.

Response:`;

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI API timeout')), 10000) // 10 second timeout
      );

      const result = await Promise.race([
        this.model.generateContent(prompt),
        timeoutPromise
      ]);

      const response = result.response;
      const text = response.text();

      return {
        message: text.trim(),
        confidenceScore: 0.8,
        actionItems: [],
        insights: [],
        reasoning: 'AI facilitator response generated'
      };

    } catch (error) {
      logger.error('Error generating facilitator response:', error);

      // Return a helpful fallback response instead of null
      return {
        message: "Thank you for sharing. How are you feeling right now, and what support do you need?",
        confidenceScore: 0.3,
        actionItems: [],
        insights: [],
        reasoning: 'Fallback response - AI API unavailable'
      };
    }
  }

  private buildFacilitatorPrompt(
    userMessage: Message,
    recentMessages: Message[],
    group: Group,
    activeUsers: User[]
  ): string {
    const conversationContext = recentMessages
      .slice(-5)
      .map(msg => `${msg.type === 'ai_facilitator' ? 'AI Facilitator' : 'Member'}: ${msg.content}`)
      .join('\n');

    const currentMessage = `Member: ${userMessage.content}`;

    return `You are Maya, an AI facilitator for PeerBond, a mental health and recovery support platform. You're facilitating a ${group.type} support group with ${activeUsers.length} members.

CRITICAL GUIDELINES:
- Be warm, empathetic, and supportive
- Use person-first language
- Never provide medical advice or diagnose
- Encourage professional help when appropriate
- Keep responses concise (1-3 sentences)
- Focus on group dynamics and emotional support
- Validate feelings and experiences
- Ask open-ended questions to encourage sharing

GROUP CONTEXT:
- Type: ${group.type} support group
- Active members: ${activeUsers.length}
- Group description: ${group.description}

RECENT CONVERSATION:
${conversationContext}

CURRENT MESSAGE:
${currentMessage}

RESPONSE REQUIREMENTS:
- Respond as Maya, the AI facilitator
- Address the current message appropriately
- Consider the emotional tone and content
- If crisis language is detected (suicide, self-harm), respond with immediate support and suggest crisis resources
- If someone shares struggles, offer empathy and ask supportive questions
- If someone shares progress, celebrate and encourage
- Help maintain group discussion flow
- Suggest action items if relevant (format as "ACTION_ITEM: description")
- Generate insights if patterns emerge (format as "INSIGHT: observation")

Your response:`;
  }

  private parseGeminiResponse(text: string): { message: string; actionItems?: any[]; insights?: any[] } {
    const lines = text.split('\n');
    let message = '';
    const actionItems: any[] = [];
    const insights: any[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('ACTION_ITEM:')) {
        const description = trimmedLine.replace('ACTION_ITEM:', '').trim();
        actionItems.push({
          id: Date.now().toString() + Math.random(),
          description,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
          status: 'pending',
          createdBy: 'ai',
          createdAt: new Date()
        });
      } else if (trimmedLine.startsWith('INSIGHT:')) {
        const observation = trimmedLine.replace('INSIGHT:', '').trim();
        insights.push({
          id: Date.now().toString() + Math.random(),
          title: 'Group Insight',
          description: observation,
          category: 'recommendation',
          generatedAt: new Date()
        });
      } else if (trimmedLine && !trimmedLine.startsWith('ACTION_ITEM:') && !trimmedLine.startsWith('INSIGHT:')) {
        message += (message ? ' ' : '') + trimmedLine;
      }
    }

    return {
      message: message || text.trim(),
      actionItems: actionItems.length > 0 ? actionItems : undefined,
      insights: insights.length > 0 ? insights : undefined
    };
  }

  private calculateConfidence(userMessage: Message, response: string): number {
    let confidence = 0.7; // Base confidence

    // Increase confidence for crisis responses
    const crisisKeywords = ['crisis', 'help', 'support', 'resources', 'professional'];
    const hasCrisisResponse = crisisKeywords.some(keyword =>
      response.toLowerCase().includes(keyword)
    );

    const crisisIndicators = [
      'want to die', 'kill myself', 'hurt myself', 'suicide', 'end it all',
      'hopeless', 'worthless', 'give up', 'can\'t go on'
    ];

    const hasCrisisContent = crisisIndicators.some(indicator =>
      userMessage.content.toLowerCase().includes(indicator)
    );

    if (hasCrisisContent && hasCrisisResponse) {
      confidence += 0.2;
    }

    // Increase confidence for appropriate response length
    const responseLength = response.length;
    if (responseLength > 50 && responseLength < 300) {
      confidence += 0.1;
    }

    // Decrease confidence if response seems generic
    const genericPhrases = ['how are you', 'tell me more', 'that\'s interesting'];
    const hasGenericResponse = genericPhrases.some(phrase =>
      response.toLowerCase().includes(phrase)
    );

    if (hasGenericResponse) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  async checkCrisisLanguage(message: string): Promise<boolean> {
    try {
      const prompt = `Analyze this message for crisis or self-harm indicators.
      Respond only with "YES" if the message contains concerning language about suicide, self-harm, or immediate danger.
      Respond with "NO" if the message does not contain crisis indicators.

      Message: "${message}"

      Response:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim().toUpperCase();

      return response === 'YES';
    } catch (error) {
      logger.error('Error checking crisis language:', error);
      // Fall back to keyword detection
      const crisisKeywords = [
        'want to die', 'kill myself', 'hurt myself', 'suicide', 'end it all',
        'hopeless', 'worthless', 'give up', 'can\'t go on'
      ];

      return crisisKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
      );
    }
  }

  async generateWelcomeMessage(group: Group): Promise<string> {
    try {
      const prompt = `Generate a warm welcome message for a ${group.type} support group called "${group.name}".
      Keep it brief (1-2 sentences), welcoming, and appropriate for a mental health support context.
      You are Maya, the AI facilitator.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Error generating welcome message:', error);
      return `Welcome to ${group.name}! I'm Maya, your AI facilitator. This is a safe space for sharing and supporting each other on our wellness journeys.`;
    }
  }

  async generateCheckInPrompt(group: Group): Promise<string> {
    try {
      const prompt = `Generate a brief check-in prompt for a ${group.type} support group.
      Ask how everyone is feeling or doing today in a supportive way. Keep it 1-2 sentences.
      You are Maya, the AI facilitator.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Error generating check-in prompt:', error);
      return "How is everyone feeling today? Remember, sharing what you're comfortable with is perfectly fine.";
    }
  }

  private getFallbackResponse(content: string): any {
    const lowerContent = content.toLowerCase();

    // Intelligent fallback responses based on content analysis
    let message = "Thank you for sharing. How are you feeling right now?";

    if (lowerContent.includes('anxious') || lowerContent.includes('anxiety') || lowerContent.includes('worried')) {
      message = "I hear that you're feeling anxious. What's one small thing that might help you feel more grounded right now?";
    } else if (lowerContent.includes('depressed') || lowerContent.includes('sad') || lowerContent.includes('down')) {
      message = "Thank you for trusting us with how you're feeling. What support do you need from the group today?";
    } else if (lowerContent.includes('help') || lowerContent.includes('support') || lowerContent.includes('need')) {
      message = "What kind of support would be most helpful for you right now?";
    } else if (lowerContent.includes('group') || lowerContent.includes('match') || lowerContent.includes('connect')) {
      message = "I'd love to help you connect with supportive people. What type of support are you most interested in?";
    } else if (lowerContent.includes('crisis') || lowerContent.includes('emergency') || lowerContent.includes('hurt myself')) {
      message = "I'm concerned about you. Please reach out to a crisis helpline immediately. You deserve support and care.";
    }

    return {
      message,
      confidenceScore: 0.6,
      actionItems: [],
      insights: [],
      reasoning: 'Fallback response - AI service unavailable'
    };
  }
}