import { BaseProvider } from './base';
import { CompletionOptions, CompletionResponse, Message, ToolDefinition } from './types';

export class AnthropicProvider extends BaseProvider {
  name = 'anthropic';
  private anthropic: any;

  constructor(config: any) {
    super(config);
    this.initializeClient();
  }

  private async initializeClient() {
    // TODO: Install @anthropic-ai/sdk package
    // const Anthropic = (await import('@anthropic-ai/sdk')).default;
    // this.anthropic = new Anthropic({
    //   apiKey: this.config.apiKey,
    //   baseURL: this.config.baseUrl
    // });
  }

  async chat(options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.anthropic) {
      await this.initializeClient();
    }

    return this.retry(async () => {
      const response = await this.anthropic.messages.create({
        model: options.model || this.config.defaultModel || 'claude-3-opus-20240229',
        messages: this.convertMessagesToAnthropic(options.messages),
        tools: options.tools ? this.convertToolsToAnthropic(options.tools) : undefined,
        temperature: options.temperature,
        max_tokens: options.maxTokens || 4096,
        stream: false
      });

      return this.convertAnthropicResponse(response);
    });
  }

  async *streamChat(options: CompletionOptions): AsyncIterableIterator<CompletionResponse> {
    if (!this.anthropic) {
      await this.initializeClient();
    }

    const stream = await this.anthropic.messages.create({
      model: options.model || this.config.defaultModel || 'claude-3-opus-20240229',
      messages: this.convertMessagesToAnthropic(options.messages),
      tools: options.tools ? this.convertToolsToAnthropic(options.tools) : undefined,
      temperature: options.temperature,
      max_tokens: options.maxTokens || 4096,
      stream: true
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' || chunk.type === 'message_delta') {
        yield this.convertAnthropicStreamChunk(chunk);
      }
    }
  }

  private convertMessagesToAnthropic(messages: Message[]) {
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    return {
      system: systemMessage?.content,
      messages: otherMessages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'member',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.toolCallId,
              content: msg.content
            }]
          };
        }

        if (msg.toolCalls) {
          return {
            role: 'assistant',
            content: msg.toolCalls.map(tc => ({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments
            }))
          };
        }

        return {
          role: msg.role,
          content: msg.content
        };
      })
    };
  }

  private convertToolsToAnthropic(tools: ToolDefinition[]) {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters
    }));
  }

  private convertAnthropicResponse(response: any): CompletionResponse {
    const message: Message = {
      role: 'assistant',
      content: ''
    };

    const toolCalls: any[] = [];

    for (const content of response.content) {
      if (content.type === 'text') {
        message.content += content.text;
      } else if (content.type === 'tool_use') {
        toolCalls.push({
          id: content.id,
          name: content.name,
          arguments: content.input
        });
      }
    }

    if (toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    return {
      id: response.id,
      choices: [{
        message,
        finishReason: response.stop_reason === 'tool_use' ? 'tool_calls' : 'stop'
      }],
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    };
  }

  private convertAnthropicStreamChunk(chunk: any): CompletionResponse {
    const message: Message = {
      role: 'assistant',
      content: ''
    };

    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      message.content = chunk.delta.text;
    }

    return {
      id: chunk.id || 'stream',
      choices: [{
        message,
        finishReason: 'stop'
      }]
    };
  }
}