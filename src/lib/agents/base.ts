import { Agent, AgentConfig, AgentSession } from './types';
import { Message, ToolCall } from '../providers/types';
import { ProviderRegistry } from '../providers';
import { ToolRegistry } from '../tools/registry';
import { ToolContext } from '../tools/types';
import { nanoid } from 'nanoid';

export abstract class BaseAgent implements Agent {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract systemPrompt: string;
  abstract tools: string[];
  abstract model: string;
  abstract provider: string;
  
  config: AgentConfig;
  private sessions = new Map<string, AgentSession>();

  constructor(config: AgentConfig = {}) {
    this.config = {
      temperature: 0.7,
      maxTokens: 4096,
      stream: false,
      memoryLimit: 20,
      persistSession: true,
      ...config
    };
  }

  async createSession(userId: string, initialContext?: Record<string, any>): Promise<AgentSession> {
    const session: AgentSession = {
      id: nanoid(),
      agentId: this.id,
      userId,
      messages: [{
        role: 'system',
        content: this.systemPrompt
      }],
      context: initialContext || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<AgentSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async processMessage(
    sessionId: string,
    userMessage: string,
    context?: Record<string, any>
  ): Promise<{ message: string; toolResults?: any[] }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message
    session.messages.push({
      role: 'user',
      content: userMessage
    });

    // Update context
    if (context) {
      session.context = { ...session.context, ...context };
    }

    // Get LLM provider
    const provider = ProviderRegistry.get(this.provider as any);
    
    // Prepare tools
    const availableTools = this.tools
      .map(toolName => ToolRegistry.get(toolName))
      .filter(Boolean)
      .map(tool => ({
        name: tool!.name,
        description: tool!.description,
        parameters: this.convertZodToJsonSchema(tool!.schema)
      }));

    // Call LLM
    const response = await provider.chat({
      model: this.model,
      messages: this.trimMessages(session.messages),
      tools: availableTools,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });

    const choice = response.choices[0];
    const assistantMessage = choice.message;
    
    // Handle tool calls
    const toolResults: any[] = [];
    if (assistantMessage.toolCalls) {
      for (const toolCall of assistantMessage.toolCalls) {
        const result = await this.executeTool(toolCall, session);
        toolResults.push({
          toolCall,
          result
        });

        // Add tool result to conversation
        session.messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: toolCall.id
        });
      }

      // Get final response after tool execution
      const finalResponse = await provider.chat({
        model: this.model,
        messages: this.trimMessages(session.messages),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      session.messages.push(finalResponse.choices[0].message);
      session.updatedAt = new Date();

      return {
        message: finalResponse.choices[0].message.content,
        toolResults
      };
    } else {
      // No tool calls, just return the message
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();

      return {
        message: assistantMessage.content
      };
    }
  }

  private async executeTool(toolCall: ToolCall, session: AgentSession) {
    const toolContext: ToolContext = {
      userId: session.userId,
      sessionId: session.id,
      agentId: this.id,
      timestamp: new Date(),
      metadata: session.context
    };

    return await ToolRegistry.execute(
      toolCall.name,
      toolCall.arguments,
      toolContext
    );
  }

  private trimMessages(messages: Message[]): Message[] {
    const limit = this.config.memoryLimit || 20;
    
    if (messages.length <= limit) {
      return messages;
    }

    // Keep system message and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    const recentMessages = otherMessages.slice(-limit + systemMessages.length);

    return [...systemMessages, ...recentMessages];
  }

  private convertZodToJsonSchema(_schema: any): any {
    // Simplified conversion - use proper library in production
    return {
      type: 'object',
      properties: {},
      required: []
    };
  }

  async streamMessage(
    sessionId: string,
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    if (!this.config.stream) {
      const result = await this.processMessage(sessionId, userMessage);
      onChunk(result.message);
      return;
    }

    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.messages.push({
      role: 'user',
      content: userMessage
    });

    const provider = ProviderRegistry.get(this.provider as any);
    
    if (!provider.streamChat) {
      throw new Error(`Provider ${this.provider} doesn't support streaming`);
    }

    const stream = provider.streamChat({
      model: this.model,
      messages: this.trimMessages(session.messages),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });

    let fullResponse = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.message.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    session.messages.push({
      role: 'assistant',
      content: fullResponse
    });
    
    session.updatedAt = new Date();
  }

  async clearSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async listSessions(userId: string): Promise<AgentSession[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId);
  }
}