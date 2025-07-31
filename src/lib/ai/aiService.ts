import OpenAI from 'openai';
import { AIAgent, AIContext, AITool, therapeuticFacilitatorAgent } from './agents';
import { Message } from '@/types';

interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private openai: OpenAI | null = null;
  private config: AIServiceConfig;
  private agents: Map<string, AIAgent> = new Map();

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      ...config
    };

    // Initialize OpenAI if API key is available
    if (config.apiKey || process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        dangerouslyAllowBrowser: true // Only for development
      });
    }

    // Register available agents
    this.registerAgent(therapeuticFacilitatorAgent);
  }

  registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(agentId: string): AIAgent | undefined {
    return this.agents.get(agentId);
  }

  async generateResponse(
    messages: Message[],
    context: AIContext,
    agentId: string = 'therapeutic_facilitator'
  ): Promise<{
    content: string;
    toolCalls?: any[];
    metadata?: any;
  }> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check if we should activate this agent
    if (agent.triggerConditions && !agent.triggerConditions(context)) {
      throw new Error(`Agent ${agentId} conditions not met`);
    }

    // If OpenAI is not available, use mock responses
    if (!this.openai) {
      return this.generateMockResponse(messages, context);
    }

    try {
      const formattedMessages = this.formatMessagesForOpenAI(messages, agent);
      const tools = this.formatToolsForOpenAI(agent.tools);

      const completion = await this.openai.chat.completions.create({
        model: this.config.model!,
        messages: formattedMessages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: 'auto',
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('No response from OpenAI');
      }

      let result: any = {
        content: message.content || '',
        metadata: {
          model: this.config.model,
          usage: completion.usage,
          agentId
        }
      };

      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolResults = await this.executeToolCalls(message.tool_calls, context, agent);
        result.toolCalls = toolResults;

        // Generate follow-up response based on tool results
        const followUpResponse = await this.generateFollowUpResponse(
          formattedMessages,
          message,
          toolResults
        );

        result.content = followUpResponse;
      }

      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateMockResponse(messages, context);
    }
  }

  private formatMessagesForOpenAI(messages: Message[], agent: AIAgent): any[] {
    const systemMessage = {
      role: 'system',
      content: agent.systemPrompt
    };

    const memberMessages = messages
      .filter(msg => msg.type === 'member')
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: 'member',
        content: msg.content,
        name: msg.memberId.replace(/[^a-zA-Z0-9_]/g, '_') // Clean member ID for OpenAI
      }));

    return [systemMessage, ...memberMessages];
  }

  private formatToolsForOpenAI(tools: AITool[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  private async executeToolCalls(
    toolCalls: any[],
    context: AIContext,
    agent: AIAgent
  ): Promise<any[]> {
    const results = [];

    for (const toolCall of toolCalls) {
      const tool = agent.tools.find(t => t.name === toolCall.function.name);
      if (!tool) {
        console.error(`Tool ${toolCall.function.name} not found`);
        continue;
      }

      try {
        const parameters = JSON.parse(toolCall.function.arguments);
        const result = await tool.execute(parameters, context);

        results.push({
          toolCall,
          result,
          tool: tool.name
        });

        // Handle special actions
        if (result.action === 'crisis_intervention') {
          await this.handleCrisisIntervention(result, context);
        }
      } catch (error) {
        console.error(`Error executing tool ${tool.name}:`, error);
        results.push({
          toolCall,
          error: error instanceof Error ? error.message : String(error),
          tool: tool.name
        });
      }
    }

    return results;
  }

  private async generateFollowUpResponse(
    originalMessages: any[],
    aiMessage: any,
    _toolResults: any[]
  ): Promise<string> {
    if (!this.openai) {
      return this.generateMockFollowUp(_toolResults);
    }

    const toolResultsMessage = {
      role: 'assistant',
      content: aiMessage.content || '',
      tool_calls: aiMessage.tool_calls
    };

    const toolResultMessages = _toolResults.map(result => ({
      role: 'tool',
      tool_call_id: result.toolCall.id,
      content: JSON.stringify(result.result)
    }));

    const followUpMessages = [
      ...originalMessages,
      toolResultsMessage,
      ...toolResultMessages
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.config.model!,
      messages: followUpMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    return completion.choices[0]?.message?.content || 'I\'ve processed your request and am here to help.';
  }

  private async handleCrisisIntervention(result: any, context: AIContext): Promise<void> {
    // Log crisis intervention for admin review
    console.warn('CRISIS INTERVENTION TRIGGERED:', {
      memberId: context.member.id,
      riskLevel: result.riskLevel,
      timestamp: new Date(),
      context: 'AI_DETECTION'
    });

    // In a real system, this would:
    // 1. Alert human moderators immediately
    // 2. Send crisis resources to the member
    // 3. Potentially contact emergency services if configured
    // 4. Create a safety plan with the member
  }

  // Mock responses when OpenAI is not available
  private async generateMockResponse(
    messages: Message[],
    _context: AIContext
  ): Promise<any> {
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content?.toLowerCase() || '';

    // Crisis keywords
    if (content.includes('suicide') || content.includes('hurt myself') || content.includes('kill myself')) {
      return {
        content: `I'm very concerned about what you've shared. Your safety is the most important thing right now. Please reach out to:

🚨 **Immediate Help:**
• National Suicide Prevention Lifeline: **988**
• Crisis Text Line: Text **HOME** to **741741**
• Emergency Services: **911**

You don't have to go through this alone. There are people who want to help you. Would you like me to help you create a safety plan or connect you with additional resources?`,
        toolCalls: [{
          tool: 'assess_crisis_risk',
          result: {
            action: 'crisis_intervention',
            riskLevel: 'high',
            emergencyContacts: ['988', '741741', '911']
          }
        }],
        metadata: { mockResponse: true }
      };
    }

    // Goal setting keywords
    if (content.includes('goal') || content.includes('want to') || content.includes('hope to')) {
      return {
        content: `It sounds like you're thinking about setting some goals - that's wonderful! Having clear, achievable goals can really help with motivation and progress.

What specific area would you like to focus on? I can help you break it down into manageable steps that feel less overwhelming. Some people find it helpful to start with small, daily goals that build toward bigger changes.

Would you like me to help you create a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)?`,
        metadata: { mockResponse: true }
      };
    }

    // Mood/feelings keywords
    if (content.includes('feel') || content.includes('mood') || content.includes('sad') || content.includes('anxious')) {
      return {
        content: `Thank you for sharing how you're feeling. It takes courage to be open about our emotions.

On a scale of 1-10, how would you rate your mood today? Sometimes it helps to track these patterns so we can identify what helps and what might be triggering difficult feelings.

Remember that all feelings are valid and temporary. What's one small thing that has helped you feel even a little bit better recently?`,
        metadata: { mockResponse: true }
      };
    }

    // General supportive response
    return {
      content: `Thank you for sharing with the group. I'm here to support you and help facilitate our conversation.

${this.getRandomSupportiveResponse()}

How is everyone else feeling about this? Remember, this is a safe space where we can support each other through both challenges and victories.`,
      metadata: { mockResponse: true }
    };
  }

  private generateMockFollowUp(_toolResults: any[]): string {
    const responses = [
      "I've processed your information and I'm here to continue supporting you.",
      "Based on what you've shared, I have some thoughts that might be helpful.",
      "Thank you for trusting me with this information. Let's work through this together.",
      "I'm glad you're reaching out. Here's how I can help..."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private getRandomSupportiveResponse(): string {
    const responses = [
      "It sounds like you're going through something difficult. You're not alone in this.",
      "I appreciate you being vulnerable with the group. That takes real strength.",
      "What you're experiencing is valid, and it's okay to feel the way you do.",
      "Recovery and wellness are journeys with ups and downs - you're doing the best you can.",
      "This community is here to support you through whatever you're facing."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Method to check if AI should respond to a message
  shouldRespond(
    messages: Message[],
    context: AIContext,
    agentId: string = 'therapeutic_facilitator'
  ): boolean {
    const agent = this.getAgent(agentId);
    if (!agent) return false;

    // Check trigger conditions
    if (agent.triggerConditions && !agent.triggerConditions(context)) {
      return false;
    }

    const recentMessages = messages.slice(-5);
    // Replace findLast with compatible alternative
    const lastAIMessage = [...recentMessages].reverse().find((m: Message) => m.type === 'ai_facilitator');

    // Don't respond if AI just responded
    if (lastAIMessage && recentMessages.indexOf(lastAIMessage) >= recentMessages.length - 2) {
      return false;
    }

    // Respond to crisis keywords immediately
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage?.content?.toLowerCase() || '';
    const crisisKeywords = ['suicide', 'hurt myself', 'kill myself', 'end it all', 'can\'t go on'];

    if (crisisKeywords.some(keyword => content.includes(keyword))) {
      return true;
    }

    // Respond periodically or when specifically mentioned
    const messagesSinceLastAI = lastAIMessage
      ? recentMessages.slice(recentMessages.indexOf(lastAIMessage) + 1).length
      : recentMessages.length;

    return messagesSinceLastAI >= 3 || content.includes('@ai') || content.includes('dr. alex');
  }
}

// Create a singleton instance
export const aiService = new AIService({
  // API key will be loaded from environment variables
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 800
});