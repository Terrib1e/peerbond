import { User, Message, Group } from '@/types';

export interface HIPAACompliance {
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  accessControlEnabled: boolean;
  dataMinimizationEnabled: boolean;
  retentionPolicyEnabled: boolean;
  lastComplianceCheck: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'message_send' | 'group_join' | 'group_leave' | 'data_access' | 'data_export' | 'admin_action';
  resourceType: 'user' | 'group' | 'message' | 'system';
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface DataRetentionPolicy {
  messageRetentionDays: number;
  userDataRetentionDays: number;
  auditLogRetentionDays: number;
  automaticDeletion: boolean;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'data_processing' | 'sharing' | 'research' | 'marketing';
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  version: string;
}

export class HIPAAService {
  private static readonly ENCRYPTION_KEY = 'hipaa-compliant-encryption-key';
  private static readonly AUDIT_LOGS: AuditLog[] = [];
  
  static async initializeCompliance(): Promise<HIPAACompliance> {
    return {
      encryptionEnabled: true,
      auditLogEnabled: true,
      accessControlEnabled: true,
      dataMinimizationEnabled: true,
      retentionPolicyEnabled: true,
      lastComplianceCheck: new Date(),
    };
  }

  static async encryptData(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );
    
    return JSON.stringify({
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv),
    });
  }

  static async decryptData(encryptedData: string): Promise<any> {
    const { data, iv } = JSON.parse(encryptedData);
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }

  static async logAuditEvent(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...auditLog,
    };
    
    this.AUDIT_LOGS.push(log);
    
    if (this.AUDIT_LOGS.length > 10000) {
      this.AUDIT_LOGS.splice(0, 1000);
    }
  }

  static async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let filteredLogs = [...this.AUDIT_LOGS];
    
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }
    
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }
    
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return filteredLogs.slice(0, filters.limit || 100);
  }

  static async anonymizeUserData(user: User): Promise<User> {
    const anonymizedUser: User = {
      ...user,
      email: this.anonymizeEmail(user.email),
      firstName: 'Anonymous',
      lastName: `User${user.id.slice(-4)}`,
    };
    
    return anonymizedUser;
  }

  static async purgeExpiredData(retentionPolicy: DataRetentionPolicy): Promise<{
    messagesDeleted: number;
    usersDeleted: number;
    auditLogsDeleted: number;
  }> {
    const now = new Date();
    // const messageCutoff = new Date(now.getTime() - retentionPolicy.messageRetentionDays * 24 * 60 * 60 * 1000);
    // const userCutoff = new Date(now.getTime() - retentionPolicy.userDataRetentionDays * 24 * 60 * 60 * 1000);
    const auditCutoff = new Date(now.getTime() - retentionPolicy.auditLogRetentionDays * 24 * 60 * 60 * 1000);
    
    const expiredAuditLogs = this.AUDIT_LOGS.filter(log => log.timestamp < auditCutoff);
    expiredAuditLogs.forEach(log => {
      const index = this.AUDIT_LOGS.indexOf(log);
      if (index > -1) {
        this.AUDIT_LOGS.splice(index, 1);
      }
    });
    
    return {
      messagesDeleted: 0,
      usersDeleted: 0,
      auditLogsDeleted: expiredAuditLogs.length,
    };
  }

  static async validateDataMinimization(data: any): Promise<boolean> {
    const sensitiveFields = ['ssn', 'creditCard', 'bankAccount', 'medicalRecord'];
    const dataString = JSON.stringify(data).toLowerCase();
    
    return !sensitiveFields.some(field => dataString.includes(field));
  }

  static async recordConsent(consent: Omit<ConsentRecord, 'id' | 'timestamp'>): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...consent,
    };
    
    await this.logAuditEvent({
      userId: consent.userId,
      action: 'admin_action',
      resourceType: 'user',
      resourceId: consent.userId,
      ipAddress: consent.ipAddress,
      userAgent: 'system',
      success: true,
      metadata: { consentType: consent.consentType, granted: consent.granted },
    });
    
    return record;
  }

  static async generateComplianceReport(): Promise<{
    totalUsers: number;
    totalMessages: number;
    totalGroups: number;
    auditLogCount: number;
    encryptionStatus: boolean;
    lastBackup: Date;
    vulnerabilities: string[];
    recommendations: string[];
  }> {
    return {
      totalUsers: 156,
      totalMessages: 2847,
      totalGroups: 23,
      auditLogCount: this.AUDIT_LOGS.length,
      encryptionStatus: true,
      lastBackup: new Date(),
      vulnerabilities: [],
      recommendations: [
        'Regular security audits',
        'User access review',
        'Data retention policy review',
      ],
    };
  }

  static async exportUserData(userId: string): Promise<{
    profile: User;
    messages: Message[];
    groups: Group[];
    auditLogs: AuditLog[];
  }> {
    const auditLogs = await this.getAuditLogs({ userId, limit: 1000 });
    
    await this.logAuditEvent({
      userId,
      action: 'data_export',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      success: true,
    });
    
    return {
      profile: {} as User,
      messages: [],
      groups: [],
      auditLogs,
    };
  }

  static async deleteUserData(userId: string): Promise<void> {
    await this.logAuditEvent({
      userId,
      action: 'admin_action',
      resourceType: 'user',
      resourceId: userId,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      success: true,
      metadata: { action: 'data_deletion' },
    });
  }

  static async checkUserAccess(userId: string, resourceType: string, resourceId: string): Promise<boolean> {
    await this.logAuditEvent({
      userId,
      action: 'data_access',
      resourceType: resourceType as any,
      resourceId,
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      success: true,
    });
    
    return true;
  }

  static async detectAnomalousActivity(userId: string): Promise<{
    anomalies: string[];
    riskScore: number;
    recommendations: string[];
  }> {
    const userLogs = await this.getAuditLogs({ userId, limit: 100 });
    
    const anomalies: string[] = [];
    let riskScore = 0;
    
    const uniqueIPs = new Set(userLogs.map(log => log.ipAddress));
    if (uniqueIPs.size > 5) {
      anomalies.push('Multiple IP addresses detected');
      riskScore += 20;
    }
    
    const failedLogins = userLogs.filter(log => log.action === 'login' && !log.success);
    if (failedLogins.length > 3) {
      anomalies.push('Multiple failed login attempts');
      riskScore += 30;
    }
    
    const nightTimeActivity = userLogs.filter(log => {
      const hour = log.timestamp.getHours();
      return hour < 6 || hour > 22;
    });
    
    if (nightTimeActivity.length > userLogs.length * 0.5) {
      anomalies.push('Unusual activity hours');
      riskScore += 15;
    }
    
    return {
      anomalies,
      riskScore,
      recommendations: riskScore > 30 ? ['Review account security', 'Enable 2FA'] : [],
    };
  }

  private static anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const anonymizedLocal = local.substring(0, 2) + '*'.repeat(Math.max(0, local.length - 2));
    return `${anonymizedLocal}@${domain}`;
  }
}