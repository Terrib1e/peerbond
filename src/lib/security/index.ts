export * from './types';
export * from './authorization';
export * from './encryption';
export * from './audit';

import { authorizationService, setupDefaultPolicies } from './authorization';
import { auditService } from './audit';
import { ToolMiddleware } from '../tools/types';

// Security middleware for tools
export function createSecurityMiddleware(): ToolMiddleware {
  return async (tool, args, context, next) => {
    const startTime = Date.now();
    
    try {
      // Check authorization
      const isAuthorized = await authorizationService.authorize(
        {
          userId: context.userId,
          sessionId: context.sessionId,
          agentId: context.agentId,
          roles: ['ai-agent'], // Would be determined from context
          permissions: tool.permissions || [],
          timestamp: new Date()
        },
        'tool',
        tool.name
      );

      if (!isAuthorized) {
        await auditService.logAuthorizationAttempt(
          context.userId,
          `tool:${tool.name}`,
          'execute',
          false,
          'Insufficient permissions'
        );

        return {
          success: false,
          error: 'Unauthorized to execute this tool'
        };
      }

      // Execute tool
      const result = await next();
      const duration = Date.now() - startTime;

      // Log successful execution
      await auditService.logToolExecution(
        context.userId,
        context.agentId,
        tool.name,
        args,
        result,
        duration
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log failed execution
      await auditService.logToolExecution(
        context.userId,
        context.agentId,
        tool.name,
        args,
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        duration
      );

      throw error;
    }
  };
}

// Initialize security system
export function initializeSecurity() {
  setupDefaultPolicies();
  console.log('Security system initialized with default HIPAA-compliant policies');
}

// Export security services
export { authorizationService, auditService };