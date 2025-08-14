import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';
import { Message, Group, Member } from '../types';

export interface GeminiFacilitatorResponse {
  message: string;
  actionItems?: any[];
  insights?: any[];
  confidenceScore: number;
  reasoning?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null;
  private model: any;

  constructor() {
    // Check for both GEMINI_API_KEY and GOOGLE_API_KEY for backwards compatibility
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn('Warning: GEMINI_API_KEY or GOOGLE_API_KEY not provided. AI features will be disabled.');
      console.warn('Please set either GEMINI_API_KEY or GOOGLE_API_KEY in your .env file');
      this.genAI = null;
      this.model = null;
      return;
    }
    console.log('✅ Gemini API initialized successfully');

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
    memberMessage: Message,
    recentMessages: Message[],
    group: Group,
    activeMembers: any[]
  ): Promise<any> {
    try {
      // Check if AI service is available
      if (!this.genAI || !this.model) {
        console.log('Gemini AI service not available, using fallback response');
        return this.getFallbackResponse(memberMessage.content);
      }

      const contextMessages = recentMessages.slice(-5).map(msg =>
        `${msg.memberId === 'ai-facilitator' ? 'Maya (AI Facilitator)' : 'User'}: ${msg.content}`
      ).join('\n');

      const prompt = `You are Maya, an AI therapeutic facilitator for a ${group.type} support group called "${group.name}".

YOUR ROLE AS A THERAPEUTIC TOOL:
- You are a selective, thoughtful facilitator - not a chatty AI
- You respond ONLY when you can add meaningful therapeutic value
- Your responses should be purposeful, not conversational filler
- Think like a skilled therapist who speaks carefully and intentionally
- Quality over quantity - every word should serve a therapeutic purpose

CURRENT SITUATION:
- Group has ${activeMembers.length} active members
- Recent conversation context:
${contextMessages}

- Latest message from member: "${memberMessage.content}"

RESPONSE CRITERIA (you should ONLY respond if the message involves):
1. **Crisis/Distress** - Someone needs immediate support or intervention
2. **Direct Request** - Someone explicitly asks for facilitator input
3. **Therapeutic Moment** - A teachable moment for growth or insight
4. **Group Dynamics** - Need to redirect conversation or include others
5. **Milestone Celebration** - Significant achievement worth acknowledging

YOUR RESPONSE STYLE:
- **Concise but helpful** (2-3 sentences that provide actual support)
- **Purposeful** - every word serves a therapeutic function
- **Professional yet warm** - like a skilled therapist
- **Solution-oriented** - provide actionable guidance when appropriate
- **Trauma-informed** - validate and offer practical help

PREFERRED RESPONSE PATTERNS:
- Validate their experience + offer a specific coping strategy
- Acknowledge their courage + provide perspective or insight
- Reflect their emotion + suggest a helpful technique or approach
- Recognize their struggle + offer encouragement with practical next steps
- Celebrate their progress + reinforce their strengths

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
    memberMessage: Message,
    recentMessages: Message[],
    group: Group,
    activeMembers: Member[]
  ): string {
    const conversationContext = recentMessages
      .slice(-5)
      .map(msg => `${msg.type === 'ai_facilitator' ? 'AI Facilitator' : 'Member'}: ${msg.content}`)
      .join('\n');

    const currentMessage = `Member: ${memberMessage.content}`;

    return `You are Maya, an AI facilitator for PeerBond, a mental health and recovery support platform. You're facilitating a ${group.type} support group with ${activeMembers.length} members.

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
- Active members: ${activeMembers.length}
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

  private calculateConfidence(memberMessage: Message, response: string): number {
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
      memberMessage.content.toLowerCase().includes(indicator)
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

  async generateResponse(prompt: string): Promise<string> {
    try {
      // Check if AI service is available
      if (!this.genAI || !this.model) {
        console.log('Gemini AI service not available, using intelligent fallback');
        // Extract key information from the prompt to provide a more relevant response
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('crisis') || promptLower.includes('suicide')) {
          return "I'm deeply concerned about what you're sharing. Your life has value and there are people who want to help. Please contact the 988 Suicide & Crisis Lifeline immediately (call or text 988). You don't have to face this alone. Let's also connect you with a crisis counselor right away.";
        } else if (promptLower.includes('anxiety') || promptLower.includes('anxious')) {
          return "I hear the anxiety you're experiencing. Let's try a grounding technique together: Take a slow breath in for 4 counts, hold for 4, and exhale for 6. This activates your parasympathetic nervous system. What's the main source of worry right now? Breaking it down can help make it feel more manageable.";
        } else if (promptLower.includes('depression') || promptLower.includes('sad')) {
          return "I can feel the weight of what you're carrying. Depression makes everything feel harder, and your feelings are valid. One small step can make a difference - could you do one tiny self-care act today? Even brushing your teeth or drinking water counts. You don't have to do this alone.";
        } else if (promptLower.includes('coping') || promptLower.includes('strategies')) {
          return "Here are some evidence-based coping strategies you can try right now: 1) Box breathing (4-4-4-4 counts), 2) Progressive muscle relaxation - tense and release each muscle group, 3) The 5-4-3-2-1 grounding technique using your senses, 4) Write down three things you're grateful for, no matter how small. Which resonates with you?";
        } else {
          return "I hear you and I'm here to support you. What you're experiencing matters, and it takes courage to reach out. Let's work through this together - what feels most important to address right now? Sometimes just naming what we're feeling can be the first step toward healing.";
        }
      }

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Error generating response:', error);
      return 'I understand you\'re looking for support. While I\'m not able to provide a detailed response right now, please know that your feelings are valid and support is available.';
    }
  }

  private getFallbackResponse(content: string): any {
    const lowerContent = content.toLowerCase();

    // Intelligent fallback responses based on content analysis
    let message = "";
    
    // Detect emotional states and provide appropriate responses
    if (lowerContent.includes('anxious') || lowerContent.includes('anxiety') || lowerContent.includes('worried')) {
      message = "I can hear the anxiety in what you're sharing. That feeling of worry can be so overwhelming. Let's try something together - take a deep breath in for 4 counts, hold for 4, and out for 6. This activates your parasympathetic nervous system and can help calm those anxious feelings. What specific worry is weighing on you most right now?";
    } else if (lowerContent.includes('sad') || lowerContent.includes('depressed') || lowerContent.includes('down')) {
      message = "I hear the sadness in your words, and I want you to know it's okay to feel this way. Depression can make everything feel heavy and dark. One small step that might help: can you name one tiny thing you could do today that might bring even a moment of relief? Sometimes starting with the smallest action can create a ripple of change.";
    } else if (lowerContent.includes('angry') || lowerContent.includes('frustrated') || lowerContent.includes('mad')) {
      message = "Your frustration is completely valid - anger often signals that something important to us is being threatened or violated. Let's channel that energy constructively. Try this: tense all your muscles for 5 seconds, then release. This can help discharge some of that physical tension. What boundary or need isn't being respected right now?";
    } else if (lowerContent.includes('lonely') || lowerContent.includes('alone') || lowerContent.includes('isolated')) {
      message = "Feeling lonely is one of the most painful human experiences, and I'm glad you're reaching out here. Connection is a basic human need. Even this moment of sharing helps break that isolation. What's one small way you could connect with someone today - even a text or a smile to a stranger?";
    } else if (lowerContent.includes('scared') || lowerContent.includes('afraid') || lowerContent.includes('fear')) {
      message = "Fear is your mind's way of trying to protect you, though sometimes it overprotects. Let's ground you in the present moment: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This helps your nervous system recognize you're safe right now. What specific fear feels biggest?";
    } else if (lowerContent.includes('overwhelmed') || lowerContent.includes('too much') || lowerContent.includes('can\'t handle')) {
      message = "When everything feels like too much, our nervous system gets flooded. Let's break this down together. First, just focus on your breath - you don't have to fix everything right now. Can you identify just ONE thing that needs attention today? We'll start there and take it step by step.";
    } else if (lowerContent.includes('suicide') || lowerContent.includes('kill myself') || lowerContent.includes('end it')) {
      message = "I'm deeply concerned about what you're sharing. Your life has value, and there are people who want to help you through this crisis. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) right now. You don't have to face this alone. Can you tell me what's brought you to this point?";
    } else if (lowerContent.includes('progress') || lowerContent.includes('better') || lowerContent.includes('improvement')) {
      message = "It's wonderful to hear about your progress! Every step forward, no matter how small, is worth celebrating. Growth isn't always linear, so be proud of how far you've come. What specific change have you noticed that feels most meaningful to you?";
    } else {
      // Default supportive response
      message = "Thank you for sharing that with me. It takes courage to open up about what you're experiencing. I'm here to support you through this. Can you tell me more about what this feels like for you right now?";
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