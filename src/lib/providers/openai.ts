import { BaseProvider } from './base';
import { CompletionOptions, CompletionResponse, Message, ToolDefinition } from './types';

export class OpenAIProvider extends BaseProvider {
  name = 'openai';
  private openai: any;

  constructor(config: any) {
    super(config);
    this.initializeClient();
  }

  private async initializeClient() {
    const OpenAI = (await import('openai')).default;
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl
    });
  }

  async chat(options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.openai) {
      await this.initializeClient();
    }

    return this.retry(async () => {
      const response = await this.openai.chat.completions.create({
        model: options.model || this.config.defaultModel || 'gpt-4o',
        messages: this.normalizeMessages(options.messages),
        tools: options.tools ? this.convertToolsToOpenAI(options.tools) : undefined,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        stream: false
      });

      return this.convertOpenAIResponse(response);
    });
  }

  async *streamChat(options: CompletionOptions): AsyncIterableIterator<CompletionResponse> {
    if (!this.openai) {
      await this.initializeClient();
    }

    const stream = await this.openai.chat.completions.create({
      model: options.model || this.config.defaultModel || 'gpt-4o',
      messages: this.normalizeMessages(options.messages),
      tools: options.tools ? this.convertToolsToOpenAI(options.tools) : undefined,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.choices[0]?.delta) {
        yield this.convertOpenAIStreamChunk(chunk);
      }
    }
  }

  private convertToolsToOpenAI(tools: ToolDefinition[]) {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  }

  private convertOpenAIResponse(response: any): CompletionResponse {
    const choice = response.choices[0];
    const message: Message = {
      role: choice.message.role,
      content: choice.message.content || ''
    };

    if (choice.message.tool_calls) {
      message.toolCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments)
      }));
    }

    return {
      id: response.id,
      choices: [{
        message,
        finishReason: choice.finish_reason
      }],
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      } : undefined
    };
  }

  private convertOpenAIStreamChunk(chunk: any): CompletionResponse {
    const delta = chunk.choices[0].delta;
    const message: Message = {
      role: delta.role || 'assistant',
      content: delta.content || ''
    };

    if (delta.tool_calls) {
      message.toolCalls = delta.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name || '',
        arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      }));
    }

    return {
      id: chunk.id,
      choices: [{
        message,
        finishReason: chunk.choices[0].finish_reason || 'stop'
      }]
    };
  }
}