export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface CompletionOptions {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CompletionResponse {
  id: string;
  choices: Array<{
    message: Message;
    finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface LLMProvider {
  name: string;
  chat(options: CompletionOptions): Promise<CompletionResponse>;
  streamChat?(options: CompletionOptions): AsyncIterableIterator<CompletionResponse>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}