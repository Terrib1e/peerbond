/**
 * Audit Logging Service for PeerBond AI Agent System
 * Provides comprehensive audit trail for all tool usage and access attempts
 */

import { logger } from '../utils/logger';
import type { UserRole, ToolName, AgentType } from '../lib/access-control';
import { AccessControlService } from '../lib/access-control';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: UserRole;
  action: 'agent_call' | 'tool_execution' | 'access_denied' | 'session_start' | 'session_end';
  agent?: AgentType;
  tool?: ToolName;
  sessionId?: string;
  success: boolean;
  auditLevel: 'basic' | 'detailed' | 'full';
  details: {
    requestData?: any;
    responseData?: any;
    errorMessage?: string;
    accessViolation?: any;
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
  };
  complianceFlags: {
    requiresConsent: boolean;
    dataAccess: 'self' | 'group' | 'client' | 'system';
    sensitiveData: boolean;
  };
}

export class AuditLogger {
  private static instance: AuditLogger;
  private auditLogs: AuditLogEntry[] = [];

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log successful agent call
   */
  public logAgentCall(params: {
    userId: string;
    userRole: UserRole;
    agent: AgentType;
    tool?: ToolName;
    sessionId: string;
    requestData: any;
    responseData: any;
    duration: number;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const auditLevel = params.tool ? AccessControlService.getAuditLevel(params.tool) : 'basic';
    const requiresConsent = params.tool ? AccessControlService.requiresConsent(params.tool) : false;
    const dataAccess = params.tool ? AccessControlService.getDataAccessLevel(params.tool) : 'self';

    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: params.userId,
      userRole: params.userRole,
      action: 'agent_call',
      agent: params.agent,
      tool: params.tool,
      sessionId: params.sessionId,
      success: true,
      auditLevel,
      details: {
        requestData: this.sanitizeData(params.requestData, auditLevel),
        responseData: this.sanitizeData(params.responseData, auditLevel),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        duration: params.duration
      },
      complianceFlags: {
        requiresConsent,
        dataAccess,
        sensitiveData: this.containsSensitiveData(params.requestData) || this.containsSensitiveData(params.responseData)
      }
    };

    this.addAuditEntry(entry);
    this.logToConsole(entry);
  }

  /**
   * Log tool execution
   */
  public logToolExecution(params: {
    userId: string;
    userRole: UserRole;
    tool: ToolName;
    agent: AgentType;
    sessionId: string;
    success: boolean;
    requestData: any;
    responseData?: any;
    errorMessage?: string;
    duration: number;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const auditLevel = AccessControlService.getAuditLevel(params.tool);
    const requiresConsent = AccessControlService.requiresConsent(params.tool);
    const dataAccess = AccessControlService.getDataAccessLevel(params.tool);

    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: params.userId,
      userRole: params.userRole,
      action: 'tool_execution',
      agent: params.agent,
      tool: params.tool,
      sessionId: params.sessionId,
      success: params.success,
      auditLevel,
      details: {
        requestData: this.sanitizeData(params.requestData, auditLevel),
        responseData: params.success ? this.sanitizeData(params.responseData, auditLevel) : undefined,
        errorMessage: params.errorMessage,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        duration: params.duration
      },
      complianceFlags: {
        requiresConsent,
        dataAccess,
        sensitiveData: this.containsSensitiveData(params.requestData) || 
                      (params.responseData && this.containsSensitiveData(params.responseData))
      }
    };

    this.addAuditEntry(entry);
    this.logToConsole(entry);
  }

  /**
   * Log access denied attempts
   */
  public logAccessDenied(params: {
    userId: string;
    userRole: UserRole;
    requestedResource: string;
    resourceType: 'agent' | 'tool';
    accessViolation: any;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: params.userId,
      userRole: params.userRole,
      action: 'access_denied',
      agent: params.resourceType === 'agent' ? params.requestedResource as AgentType : undefined,
      tool: params.resourceType === 'tool' ? params.requestedResource as ToolName : undefined,
      sessionId: params.sessionId,
      success: false,
      auditLevel: 'full', // Always log access denials at full level
      details: {
        accessViolation: params.accessViolation,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      },
      complianceFlags: {
        requiresConsent: false,
        dataAccess: 'system',
        sensitiveData: false
      }
    };

    this.addAuditEntry(entry);
    this.logToConsole(entry, 'warn');
  }

  /**
   * Log session events
   */
  public logSessionEvent(params: {
    userId: string;
    userRole: UserRole;
    sessionId: string;
    action: 'session_start' | 'session_end';
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    const entry: AuditLogEntry = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      sessionId: params.sessionId,
      success: true,
      auditLevel: 'basic',
      details: {
        requestData: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      },
      complianceFlags: {
        requiresConsent: false,
        dataAccess: 'self',
        sensitiveData: false
      }
    };

    this.addAuditEntry(entry);
    this.logToConsole(entry);
  }

  /**
   * Get audit logs with filtering
   */
  public getAuditLogs(params?: {
    userId?: string;
    sessionId?: string;
    action?: string;
    tool?: ToolName;
    agent?: AgentType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): AuditLogEntry[] {
    let logs = this.auditLogs;

    if (params) {
      if (params.userId) {
        logs = logs.filter(log => log.userId === params.userId);
      }
      if (params.sessionId) {
        logs = logs.filter(log => log.sessionId === params.sessionId);
      }
      if (params.action) {
        logs = logs.filter(log => log.action === params.action);
      }
      if (params.tool) {
        logs = logs.filter(log => log.tool === params.tool);
      }
      if (params.agent) {
        logs = logs.filter(log => log.agent === params.agent);
      }
      if (params.startDate) {
        logs = logs.filter(log => log.timestamp >= params.startDate!);
      }
      if (params.endDate) {
        logs = logs.filter(log => log.timestamp <= params.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (params?.limit) {
      logs = logs.slice(0, params.limit);
    }

    return logs;
  }

  /**
   * Get audit statistics
   */
  public getAuditStats(timeframe?: { startDate: Date; endDate: Date }) {
    let logs = this.auditLogs;

    if (timeframe) {
      logs = logs.filter(log => 
        log.timestamp >= timeframe.startDate && 
        log.timestamp <= timeframe.endDate
      );
    }

    const stats = {
      totalLogs: logs.length,
      successfulCalls: logs.filter(log => log.success && log.action === 'agent_call').length,
      failedCalls: logs.filter(log => !log.success && log.action === 'agent_call').length,
      accessDenials: logs.filter(log => log.action === 'access_denied').length,
      toolUsage: {} as Record<string, number>,
      agentUsage: {} as Record<string, number>,
      userActivity: {} as Record<string, number>,
      sensitiveDataAccess: logs.filter(log => log.complianceFlags.sensitiveData).length,
      consentRequiredActions: logs.filter(log => log.complianceFlags.requiresConsent).length
    };

    // Count tool usage
    logs.forEach(log => {
      if (log.tool) {
        stats.toolUsage[log.tool] = (stats.toolUsage[log.tool] || 0) + 1;
      }
      if (log.agent) {
        stats.agentUsage[log.agent] = (stats.agentUsage[log.agent] || 0) + 1;
      }
      stats.userActivity[log.userId] = (stats.userActivity[log.userId] || 0) + 1;
    });

    return stats;
  }

  private addAuditEntry(entry: AuditLogEntry): void {
    this.auditLogs.push(entry);

    // Keep only the last 10,000 entries in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }
  }

  private logToConsole(entry: AuditLogEntry, level: 'info' | 'warn' | 'error' = 'info'): void {
    const logData = {
      auditId: entry.id,
      userId: entry.userId,
      userRole: entry.userRole,
      action: entry.action,
      agent: entry.agent,
      tool: entry.tool,
      sessionId: entry.sessionId,
      success: entry.success,
      auditLevel: entry.auditLevel,
      timestamp: entry.timestamp.toISOString(),
      sensitiveData: entry.complianceFlags.sensitiveData,
      requiresConsent: entry.complianceFlags.requiresConsent,
      dataAccess: entry.complianceFlags.dataAccess
    };

    switch (level) {
      case 'warn':
        logger.warn('[AUDIT] Access control violation', logData);
        break;
      case 'error':
        logger.error('[AUDIT] Security incident', logData);
        break;
      default:
        logger.info('[AUDIT] Agent system activity', logData);
    }
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any, auditLevel: 'basic' | 'detailed' | 'full'): any {
    if (!data) return data;

    if (auditLevel === 'basic') {
      // Only log basic metadata
      return {
        type: typeof data,
        hasContent: !!data,
        keys: typeof data === 'object' ? Object.keys(data).length : undefined
      };
    }

    if (auditLevel === 'detailed') {
      // Log structure but redact sensitive content
      return this.redactSensitiveFields(data);
    }

    // Full logging - return complete data
    return data;
  }

  private redactSensitiveFields(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'ssn', 'credit_card',
      'phone', 'email', 'address', 'location', 'ip_address'
    ];

    const redacted = { ...obj };

    for (const field in redacted) {
      const lowerField = field.toLowerCase();
      if (sensitiveFields.some(sensitive => lowerField.includes(sensitive))) {
        redacted[field] = '[REDACTED]';
      } else if (typeof redacted[field] === 'object') {
        redacted[field] = this.redactSensitiveFields(redacted[field]);
      }
    }

    return redacted;
  }

  private containsSensitiveData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    const sensitivePatterns = [
      /\b\d{3}-?\d{2}-?\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/ // Phone
    ];

    const dataString = JSON.stringify(data);
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }
}

export const auditLogger = AuditLogger.getInstance();
export default auditLogger;