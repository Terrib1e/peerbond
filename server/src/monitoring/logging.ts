/**
 * Enhanced logging system with structured logging and correlation IDs
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Log levels for different environments
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Create structured logger with correlation tracking
 */
function createLogger() {
  const isProduction = process.env.NODE_ENV === 'production';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

  // Custom format for structured logging
  const structuredFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const logEntry = {
        timestamp,
        level,
        message,
        service: 'peerbond-orchestration',
        version: '3.0.0',
        environment: process.env.NODE_ENV || 'development',
        instanceId: process.env.INSTANCE_ID || `instance-${process.pid}`,
        ...meta,
      };

      return JSON.stringify(logEntry);
    })
  );

  // Console format for development
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
      const prefix = correlationId ? `[${correlationId}] ` : '';
      const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} ${level}: ${prefix}${message}${metaStr}`;
    })
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction ? structuredFormat : consoleFormat,
    }),
  ];

  // Add file transports in production
  if (isProduction) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: structuredFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: structuredFormat,
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 10,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    levels: LOG_LEVELS,
    format: structuredFormat,
    defaultMeta: {
      service: 'peerbond-orchestration',
    },
    transports,
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  });
}

export const logger = createLogger();

/**
 * Correlation ID middleware for request tracking
 */
export function correlationMiddleware() {
  return (req: any, res: any, next: any) => {
    // Get correlation ID from header or generate new one
    const correlationId = req.headers['x-correlation-id'] || 
                         req.headers['x-request-id'] || 
                         uuidv4();
    
    // Add to request context
    req.correlationId = correlationId;
    
    // Add to response headers
    res.setHeader('x-correlation-id', correlationId);
    
    // Create child logger with correlation ID
    req.logger = logger.child({ correlationId });
    
    next();
  };
}

/**
 * Enhanced logger with orchestration-specific methods
 */
export class OrchestrationLogger {
  private baseLogger: winston.Logger;
  private correlationId?: string;

  constructor(correlationId?: string) {
    this.baseLogger = logger;
    this.correlationId = correlationId;
  }

  /**
   * Create child logger with correlation ID
   */
  static withCorrelation(correlationId: string): OrchestrationLogger {
    return new OrchestrationLogger(correlationId);
  }

  /**
   * Create child logger with session context
   */
  static withSession(sessionId: string, userId: string): OrchestrationLogger {
    const childLogger = logger.child({
      sessionId,
      userId,
      component: 'orchestration',
    });
    
    const instance = new OrchestrationLogger();
    instance.baseLogger = childLogger;
    return instance;
  }

  /**
   * Log session events
   */
  logSessionEvent(
    event: 'session_started' | 'session_ended' | 'message_processed',
    sessionId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): void {
    this.baseLogger.info(`Session ${event}`, {
      event,
      sessionId,
      userId,
      correlationId: this.correlationId,
      component: 'orchestration.session',
      ...metadata,
    });
  }

  /**
   * Log agent interactions
   */
  logAgentCall(
    agentName: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata: Record<string, any> = {}
  ): void {
    this.baseLogger.info(`Agent ${agentName} ${operation}`, {
      event: 'agent_call',
      agentName,
      operation,
      duration,
      success,
      correlationId: this.correlationId,
      component: 'orchestration.agent',
      ...metadata,
    });
  }

  /**
   * Log crisis interventions
   */
  logCrisisIntervention(
    sessionId: string,
    userId: string,
    severity: string,
    triggers: string[],
    metadata: Record<string, any> = {}
  ): void {
    this.baseLogger.warn('Crisis intervention triggered', {
      event: 'crisis_intervention',
      sessionId,
      userId,
      severity,
      triggers,
      correlationId: this.correlationId,
      component: 'orchestration.crisis',
      priority: 'high',
      ...metadata,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata: Record<string, any> = {}
  ): void {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn if operation takes > 5s
    
    this.baseLogger.log(level, `Performance: ${operation}`, {
      event: 'performance',
      operation,
      duration,
      success,
      correlationId: this.correlationId,
      component: 'orchestration.performance',
      ...metadata,
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'access_denied',
    userId?: string,
    metadata: Record<string, any> = {}
  ): void {
    this.baseLogger.warn(`Security event: ${event}`, {
      event: 'security',
      securityEvent: event,
      userId,
      correlationId: this.correlationId,
      component: 'orchestration.security',
      priority: 'high',
      ...metadata,
    });
  }

  /**
   * Log errors with full context
   */
  logError(
    error: Error,
    operation: string,
    context: Record<string, any> = {}
  ): void {
    this.baseLogger.error(`Error in ${operation}`, {
      event: 'error',
      operation,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      correlationId: this.correlationId,
      component: 'orchestration.error',
      ...context,
    });
  }

  /**
   * Standard log methods with correlation
   */
  info(message: string, metadata: Record<string, any> = {}): void {
    this.baseLogger.info(message, {
      correlationId: this.correlationId,
      ...metadata,
    });
  }

  warn(message: string, metadata: Record<string, any> = {}): void {
    this.baseLogger.warn(message, {
      correlationId: this.correlationId,
      ...metadata,
    });
  }

  error(message: string, metadata: Record<string, any> = {}): void {
    this.baseLogger.error(message, {
      correlationId: this.correlationId,
      ...metadata,
    });
  }

  debug(message: string, metadata: Record<string, any> = {}): void {
    this.baseLogger.debug(message, {
      correlationId: this.correlationId,
      ...metadata,
    });
  }
}

/**
 * Request logging middleware with performance tracking
 */
export function requestLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const correlationId = req.correlationId || uuidv4();
    
    // Log incoming request
    logger.info('Incoming request', {
      event: 'request_start',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      correlationId,
      component: 'http',
    });

    // Override end method to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      // Log response
      logger.info('Request completed', {
        event: 'request_end',
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        correlationId,
        component: 'http',
        userAgent: req.headers['user-agent'],
        responseSize: chunk ? chunk.length : 0,
      });

      // Log slow requests
      if (duration > 5000) {
        logger.warn('Slow request detected', {
          event: 'slow_request',
          method: req.method,
          url: req.url,
          duration,
          correlationId,
          component: 'http',
          priority: 'medium',
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware() {
  return (error: Error, req: any, res: any, next: any) => {
    const correlationId = req.correlationId || 'unknown';
    
    logger.error('Unhandled error', {
      event: 'unhandled_error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      method: req.method,
      url: req.url,
      correlationId,
      component: 'error_handler',
      priority: 'critical',
    });

    next(error);
  };
}

/**
 * Log aggregation utilities
 */
export class LogAggregator {
  /**
   * Get log statistics for monitoring dashboard
   */
  static async getLogStats(timeRange: 'hour' | 'day' | 'week' = 'hour'): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    crisisInterventions: number;
    avgResponseTime: number;
    slowRequests: number;
  }> {
    // In a real implementation, this would query log storage (ELK, CloudWatch, etc.)
    // For now, return mock data
    return {
      totalLogs: 1250,
      errorCount: 12,
      warningCount: 45,
      crisisInterventions: 3,
      avgResponseTime: 125,
      slowRequests: 8,
    };
  }

  /**
   * Export logs for compliance/audit
   */
  static async exportLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    // Implementation would export actual logs
    return format === 'json' 
      ? JSON.stringify({ message: 'Log export not implemented in mock' })
      : 'timestamp,level,message,sessionId,userId\n';
  }
}