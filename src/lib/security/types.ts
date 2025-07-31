export interface SecurityContext {
  memberId: string;
  sessionId: string;
  agentId: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  memberAgent?: string;
  timestamp: Date;
}

export interface SecurityPolicy {
  name: string;
  description: string;
  rules: SecurityRule[];
  enforcement: 'strict' | 'permissive';
}

export interface SecurityRule {
  id: string;
  type: 'allow' | 'deny';
  resource: string;
  actions: string[];
  conditions?: SecurityCondition[];
}

export interface SecurityCondition {
  type: 'time' | 'location' | 'role' | 'custom';
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'between';
  value: any;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  memberId: string;
  agentId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  ipAddress?: string;
  duration?: number;
}

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'AES-256-CBC';
  keyDerivation: 'PBKDF2' | 'scrypt' | 'argon2';
  saltLength: number;
  iterations: number;
}

export interface ComplianceFramework {
  name: 'HIPAA' | 'SOC2' | 'GDPR';
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  description: string;
  category: string;
  controls: string[];
  auditFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
}