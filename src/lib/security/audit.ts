import { AuditLog } from './types';
import { nanoid } from 'nanoid';
import { encryptionService } from './encryption';

export interface AuditOptions {
  encrypt?: boolean;
  retention?: number; // days
  batchSize?: number;
  flushInterval?: number; // milliseconds
}

export class AuditService {
  private buffer: AuditLog[] = [];
  private options: Required<AuditOptions>;
  private flushTimer?: NodeJS.Timeout;
  private storage?: AuditStorage;

  constructor(options: AuditOptions = {}, storage?: AuditStorage) {
    this.options = {
      encrypt: true,
      retention: 2555, // 7 years for HIPAA
      batchSize: 100,
      flushInterval: 5000,
      ...options
    };
    this.storage = storage;
    this.startAutoFlush();
  }

  async log(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      ...entry,
      id: nanoid(),
      timestamp: new Date()
    };

    // Encrypt sensitive metadata if enabled
    if (this.options.encrypt && auditLog.metadata) {
      auditLog.metadata = await this.encryptMetadata(auditLog.metadata);
    }

    this.buffer.push(auditLog);

    // Flush if buffer is full
    if (this.buffer.length >= this.options.batchSize) {
      await this.flush();
    }
  }

  async logToolExecution(
    memberId: string,
    agentId: string,
    toolName: string,
    args: any,
    result: any,
    duration: number
  ): Promise<void> {
    await this.log({
      memberId,
      agentId,
      action: `tool:${toolName}`,
      resource: 'tool',
      result: result.success ? 'success' : 'failure',
      duration,
      metadata: {
        args: this.sanitizeArgs(args),
        error: result.error
      }
    });
  }

  async logAuthorizationAttempt(
    memberId: string,
    resource: string,
    action: string,
    granted: boolean,
    reason?: string
  ): Promise<void> {
    await this.log({
      memberId,
      agentId: 'system',
      action: `auth:${action}`,
      resource,
      result: granted ? 'success' : 'failure',
      metadata: {
        reason
      }
    });
  }

  async logDataAccess(
    memberId: string,
    dataType: string,
    recordId: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<void> {
    await this.log({
      memberId,
      agentId: 'system',
      action: `data:${operation}`,
      resource: `${dataType}:${recordId}`,
      result: 'success',
      metadata: {
        dataType,
        recordId
      }
    });
  }

  async query(
    filters: Partial<AuditLog>,
    options?: { limit?: number; offset?: number; decrypt?: boolean }
  ): Promise<AuditLog[]> {
    if (!this.storage) {
      throw new Error('No storage configured for audit queries');
    }

    const logs = await this.storage.query(filters, options);

    // Decrypt metadata if requested
    if (options?.decrypt && this.options.encrypt) {
      return Promise.all(
        logs.map(async log => ({
          ...log,
          metadata: log.metadata ? await this.decryptMetadata(log.metadata) : undefined
        }))
      );
    }

    return logs;
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    framework: 'HIPAA' | 'SOC2'
  ): Promise<ComplianceReport> {
    const logs = await this.query({
      timestamp: { $gte: startDate, $lte: endDate } as any
    });

    return {
      framework,
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: logs.length,
        uniqueUsers: new Set(logs.map(l => l.memberId)).size,
        failedAttempts: logs.filter(l => l.result === 'failure').length,
        dataAccesses: logs.filter(l => l.action.startsWith('data:')).length
      },
      violations: this.detectViolations(logs, framework),
      recommendations: this.generateRecommendations(logs, framework)
    };
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const toFlush = [...this.buffer];
    this.buffer = [];

    if (this.storage) {
      await this.storage.store(toFlush);
    } else {
      // Fallback to console in development
      console.log('[AUDIT]', toFlush);
    }
  }

  private startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('Audit flush error:', err);
      });
    }, this.options.flushInterval);
  }

  private async encryptMetadata(metadata: Record<string, any>): Promise<Record<string, any>> {
    const encrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.isSensitiveField(key)) {
        encrypted[key] = await encryptionService.encryptField(value);
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  private async decryptMetadata(metadata: Record<string, any>): Promise<Record<string, any>> {
    const decrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (this.isSensitiveField(key) && typeof value === 'string' && value.includes('.')) {
        try {
          decrypted[key] = await encryptionService.decryptField(value);
        } catch {
          decrypted[key] = value; // Keep original if decryption fails
        }
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = ['ssn', 'dob', 'diagnosis', 'medication', 'notes'];
    return sensitiveFields.some(field => fieldName.toLowerCase().includes(field));
  }

  private sanitizeArgs(args: any): any {
    // Remove or mask sensitive information from logged arguments
    const sanitized = { ...args };

    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.ssn) sanitized.ssn = '[REDACTED]';
    if (sanitized.creditCard) sanitized.creditCard = '[REDACTED]';

    return sanitized;
  }

  private detectViolations(logs: AuditLog[], framework: string): any[] {
    const violations = [];

    // Example HIPAA violation detection
    if (framework === 'HIPAA') {
      // Check for unauthorized PHI access
      const phiAccesses = logs.filter(l =>
        l.resource.includes('phi') && l.result === 'failure'
      );

      if (phiAccesses.length > 0) {
        violations.push({
          type: 'Unauthorized PHI Access Attempts',
          count: phiAccesses.length,
          severity: 'high'
        });
      }
    }

    return violations;
  }

  private generateRecommendations(logs: AuditLog[], _framework: string): string[] {
    const recommendations = [];

    // Analyze patterns and generate recommendations
    const failureRate = logs.filter(l => l.result === 'failure').length / logs.length;

    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Review access controls and member training.');
    }

    return recommendations;
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Storage interface for audit logs
export interface AuditStorage {
  store(logs: AuditLog[]): Promise<void>;
  query(filters: Partial<AuditLog>, options?: any): Promise<AuditLog[]>;
  cleanup(olderThan: Date): Promise<number>;
}

// Compliance report interface
interface ComplianceReport {
  framework: string;
  period: { start: Date; end: Date };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    failedAttempts: number;
    dataAccesses: number;
  };
  violations: any[];
  recommendations: string[];
}

// Singleton instance
export const auditService = new AuditService();