import { z } from 'zod';
import { Tool, ToolContext, ToolResult } from './types';

export abstract class BaseTool<TArgs = any, TResult = any> implements Tool<TArgs, TResult> {
  abstract name: string;
  abstract description: string;
  abstract schema: z.ZodType<TArgs>;
  permissions?: string[];
  rateLimit?: { requests: number; window: number };

  async execute(args: TArgs, context: ToolContext): Promise<ToolResult<TResult>> {
    try {
      // Validate arguments
      const validatedArgs = await this.schema.parseAsync(args);
      
      // Optional additional validation
      if (this.validate) {
        const isValid = await this.validate(validatedArgs, context);
        if (!isValid) {
          return {
            success: false,
            error: 'Validation failed'
          };
        }
      }

      // Execute the tool logic
      const result = await this.run(validatedArgs, context);
      
      return {
        success: true,
        data: result,
        metadata: {
          executedAt: new Date().toISOString(),
          executedBy: context.agentId
        }
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Invalid arguments: ${error.errors.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  protected abstract run(args: TArgs, context: ToolContext): Promise<TResult>;

  async validate?(args: TArgs, context: ToolContext): Promise<boolean>;
}