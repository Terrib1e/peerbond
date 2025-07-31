/**
 * Base Agent Class - Foundation for all PeerBond AI agents
 * Integrates with the tool system for proper execution
 */

import ToolExecutor from '../tools/executor';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  availableTools: string[];
}

export interface AgentExecutionResult {
  response: string;
  confidence: number;
  toolsUsed: string[];
  toolResults: ToolResult[];
  metadata?: Record<string, any>;
}

export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected description: string;
  protected availableTools: string[];
  protected toolExecutor: ToolExecutor;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.availableTools = config.availableTools;
    this.toolExecutor = new ToolExecutor();
  }

  /**
   * Execute agent with message and context
   */
  public async execute(
    message: string, 
    context: Omit<ToolContext, 'agent'>
  ): Promise<AgentExecutionResult> {
    const fullContext: ToolContext = {
      ...context,
      agent: this.id
    };

    logger.info(`[${this.name}] Processing message`, {
      agent: this.id,
      sessionId: context.sessionId,
      messageLength: message.length
    });

    try {
      // Let each agent implement their specific logic
      return await this.processMessage(message, fullContext);
    } catch (error) {
      logger.error(`[${this.name}] Error processing message:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.1,
        toolsUsed: [],
        toolResults: [],
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Execute a tool with proper validation and logging
   */
  protected async executeTool(
    toolName: string,
    parameters: any,
    context: ToolContext
  ): Promise<ToolResult> {
    if (!this.availableTools.includes(toolName)) {
      throw new Error(`Tool ${toolName} not available for agent ${this.id}`);
    }

    return await this.toolExecutor.executeTool(toolName, parameters, context);
  }

  /**
   * Abstract method for agent-specific message processing
   */
  protected abstract processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult>;

  /**
   * Get agent-specific error response
   */
  protected abstract getErrorResponse(): string;

  /**
   * Get agent info
   */
  public getInfo(): AgentConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      availableTools: this.availableTools
    };
  }
}