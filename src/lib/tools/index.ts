export * from './types';
export * from './base';
export * from './registry';
export * from './middleware';
export * from './implementations';

// Initialize tools system
import { ToolRegistry } from './registry';
import { ALL_TOOLS } from './implementations';
import { 
  createLoggingMiddleware, 
  createRateLimitMiddleware, 
  createValidationMiddleware 
} from './middleware';

export function initializeTools() {
  // Register all tools
  ALL_TOOLS.forEach(tool => ToolRegistry.register(tool));

  // Add middleware
  ToolRegistry.addMiddleware(createValidationMiddleware({
    validatePHI: true,
    validateProfanity: true
  }));

  ToolRegistry.addMiddleware(createRateLimitMiddleware());

  ToolRegistry.addMiddleware(createLoggingMiddleware({
    logLevel: 'info',
    includeArgs: true,
    includeResult: true
  }));

  console.log('Tools system initialized with', ToolRegistry.getAll().length, 'tools');
}