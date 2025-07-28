import { ToolMiddleware, ToolExecutionLog } from '../types';
import { nanoid } from 'nanoid';

export interface LoggingOptions {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  includeArgs?: boolean;
  includeResult?: boolean;
  onLog?: (log: ToolExecutionLog) => Promise<void>;
}

export function createLoggingMiddleware(options: LoggingOptions = {}): ToolMiddleware {
  const {
    logLevel = 'info',
    includeArgs = true,
    includeResult = true,
    onLog
  } = options;

  return async (tool, args, context, next) => {
    const startTime = Date.now();
    const logId = nanoid();

    const log: Partial<ToolExecutionLog> = {
      id: logId,
      toolName: tool.name,
      agentId: context.agentId,
      userId: context.userId,
      sessionId: context.sessionId,
      timestamp: new Date(),
      args: includeArgs ? args : undefined
    };

    try {
      const result = await next();
      const duration = Date.now() - startTime;

      const executionLog: ToolExecutionLog = {
        ...log as ToolExecutionLog,
        duration,
        result: includeResult ? result : { success: result.success }
      };

      // Log based on level
      if (logLevel === 'debug' || (logLevel === 'info' && result.success)) {
        console.log(`[Tool: ${tool.name}] Executed in ${duration}ms`, executionLog);
      }

      // Custom logging handler
      if (onLog) {
        await onLog(executionLog);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const executionLog: ToolExecutionLog = {
        ...log as ToolExecutionLog,
        duration,
        result: { success: false },
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Always log errors
      console.error(`[Tool: ${tool.name}] Failed after ${duration}ms`, executionLog);

      // Custom logging handler
      if (onLog) {
        await onLog(executionLog);
      }

      throw error;
    }
  };
}