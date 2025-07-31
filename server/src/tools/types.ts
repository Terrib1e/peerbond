import { z } from 'zod';

export interface ToolContext {
  memberId: string;
  sessionId: string;
  agentId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Tool<TArgs = any, TResult = any> {
  name: string;
  description: string;
  schema: z.ZodType<TArgs>;
  permissions?: string[];
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
  execute(args: TArgs, context: ToolContext): Promise<ToolResult<TResult>>;
  validate?(args: TArgs, context: ToolContext): Promise<boolean>;
}

export interface ToolExecutionLog {
  id: string;
  toolName: string;
  agentId: string;
  memberId: string;
  sessionId: string;
  timestamp: Date;
  duration: number;
  args: any;
  result: ToolResult;
  error?: string;
}

export interface ToolAuthorization {
  principal: string;
  tool: string;
  scope: string[];
  conditions?: {
    timeWindow?: [Date, Date];
    rateLimit?: number;
    dataClassification?: string[];
    requiresMFA?: boolean;
  };
}

export type ToolMiddleware = (
  tool: Tool,
  args: any,
  context: ToolContext,
  next: () => Promise<ToolResult>
) => Promise<ToolResult>;