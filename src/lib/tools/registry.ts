import { Tool, ToolContext, ToolResult, ToolMiddleware, ToolAuthorization } from './types';
import { ToolDefinition } from '../providers/types';

export class ToolRegistry {
  private static tools = new Map<string, Tool>();
  private static middlewares: ToolMiddleware[] = [];
  private static authorizations = new Map<string, ToolAuthorization[]>();

  static register(tool: Tool) {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  static unregister(name: string) {
    this.tools.delete(name);
  }

  static get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  static getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  static addMiddleware(middleware: ToolMiddleware) {
    this.middlewares.push(middleware);
  }

  static setAuthorization(toolName: string, authorizations: ToolAuthorization[]) {
    this.authorizations.set(toolName, authorizations);
  }

  static async execute(
    toolName: string,
    args: any,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`
      };
    }

    // Check authorization
    const isAuthorized = await this.checkAuthorization(tool, context);
    if (!isAuthorized) {
      return {
        success: false,
        error: 'Unauthorized to use this tool'
      };
    }

    // Build middleware chain
    const executeChain = this.middlewares.reduceRight<() => Promise<ToolResult>>(
      (next, middleware) => async () => middleware(tool, args, context, next),
      async () => tool.execute(args, context)
    );

    return executeChain();
  }

  static async checkAuthorization(tool: Tool, context: ToolContext): Promise<boolean> {
    const authorizations = this.authorizations.get(tool.name);
    if (!authorizations || authorizations.length === 0) {
      // No specific authorization required
      return true;
    }

    // Check if any authorization matches
    for (const auth of authorizations) {
      if (auth.principal === context.agentId || auth.principal === '*') {
        // Check additional conditions
        if (auth.conditions) {
          const now = new Date();
          
          // Time window check
          if (auth.conditions.timeWindow) {
            const [start, end] = auth.conditions.timeWindow;
            if (now < start || now > end) {
              continue;
            }
          }

          // Add more condition checks as needed
        }

        return true;
      }
    }

    return false;
  }

  static getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.zodSchemaToJsonSchema(tool.schema)
    }));
  }

  private static zodSchemaToJsonSchema(schema: any): any {
    // This is a simplified conversion - in production, use a proper library
    // like zod-to-json-schema
    const shape = schema._def?.shape?.() || {};
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodType = value as any;
      properties[key] = {
        type: this.getJsonType(zodType),
        description: zodType._def?.description
      };

      if (!zodType.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined
    };
  }

  private static getJsonType(zodType: any): string {
    const typeName = zodType._def?.typeName;
    
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      default:
        return 'string';
    }
  }

  static clear() {
    this.tools.clear();
    this.middlewares = [];
    this.authorizations.clear();
  }
}