import { BaseProvider } from './base';
import { CompletionOptions, CompletionResponse, Message, ToolDefinition } from './types';

export class GeminiProvider extends BaseProvider {
  name = 'gemini';
  private model: any;

  constructor(config: any) {
    super(config);
    this.initializeClient();
  }

  private async initializeClient() {
    // TODO: Install @google/generative-ai package
    // const { GoogleGenerativeAI } = await import('@google/generative-ai');
    // this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    // this.model = this.genAI.getGenerativeModel({
    //   model: this.config.defaultModel || 'gemini-pro'
    // });
  }

  async chat(options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.model) {
      await this.initializeClient();
    }

    return this.retry(async () => {
      const chat = this.model.startChat({
        history: this.convertMessagesToGemini(options.messages.slice(0, -1)),
        tools: options.tools ? this.convertToolsToGemini(options.tools) : undefined,
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens
        }
      });

      const lastMessage = options.messages[options.messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);

      return this.convertGeminiResponse(result);
    });
  }

  async *streamChat(options: CompletionOptions): AsyncIterableIterator<CompletionResponse> {
    if (!this.model) {
      await this.initializeClient();
    }

    const chat = this.model.startChat({
      history: this.convertMessagesToGemini(options.messages.slice(0, -1)),
      tools: options.tools ? this.convertToolsToGemini(options.tools) : undefined,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens
      }
    });

    const lastMessage = options.messages[options.messages.length - 1];
    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      yield this.convertGeminiStreamChunk(chunk);
    }
  }

  private convertMessagesToGemini(messages: Message[]) {
    return messages.map(msg => {
      if (msg.role === 'system') {
        return {
          role: 'member',
          parts: [{ text: `System: ${msg.content}` }]
        };
      }

      if (msg.role === 'tool') {
        return {
          role: 'member',
          parts: [{
            functionResponse: {
              name: msg.toolCallId,
              response: JSON.parse(msg.content)
            }
          }]
        };
      }

      if (msg.toolCalls) {
        return {
          role: 'model',
          parts: msg.toolCalls.map(tc => ({
            functionCall: {
              name: tc.name,
              args: tc.arguments
            }
          }))
        };
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'member',
        parts: [{ text: msg.content }]
      };
    });
  }

  private convertToolsToGemini(tools: ToolDefinition[]) {
    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    }];
  }

  private convertGeminiResponse(response: any): CompletionResponse {
    const candidate = response.response.candidates[0];
    const message: Message = {
      role: 'assistant',
      content: ''
    };

    const toolCalls: any[] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        message.content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random()}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args
        });
      }
    }

    if (toolCalls.length > 0) {
      message.toolCalls = toolCalls;
    }

    return {
      id: `gemini_${Date.now()}`,
      choices: [{
        message,
        finishReason: candidate.finishReason === 'STOP' ? 'stop' :
                     candidate.finishReason === 'MAX_TOKENS' ? 'length' : 'stop'
      }],
      usage: response.response.usageMetadata ? {
        promptTokens: response.response.usageMetadata.promptTokenCount,
        completionTokens: response.response.usageMetadata.candidatesTokenCount,
        totalTokens: response.response.usageMetadata.totalTokenCount
      } : undefined
    };
  }

  private convertGeminiStreamChunk(chunk: any): CompletionResponse {
    const message: Message = {
      role: 'assistant',
      content: chunk.text() || ''
    };

    return {
      id: `gemini_stream_${Date.now()}`,
      choices: [{
        message,
        finishReason: 'stop'
      }]
    };
  }
}