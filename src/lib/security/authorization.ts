import { SecurityContext, SecurityPolicy, SecurityRule } from './types';

export class AuthorizationService {
  private policies: Map<string, SecurityPolicy> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map();

  registerPolicy(policy: SecurityPolicy) {
    this.policies.set(policy.name, policy);
  }

  setRolePermissions(role: string, permissions: string[]) {
    this.rolePermissions.set(role, new Set(permissions));
  }

  async authorize(
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<boolean> {
    // Check direct permissions
    if (context.permissions.includes(`${resource}:${action}`)) {
      return true;
    }

    // Check role-based permissions
    for (const role of context.roles) {
      const rolePerms = this.rolePermissions.get(role);
      if (rolePerms?.has(`${resource}:${action}`)) {
        return true;
      }
    }

    // Check policies
    for (const policy of this.policies.values()) {
      const decision = await this.evaluatePolicy(policy, context, resource, action);
      if (decision !== null) {
        return decision;
      }
    }

    // Default deny
    return false;
  }

  private async evaluatePolicy(
    policy: SecurityPolicy,
    context: SecurityContext,
    resource: string,
    action: string
  ): Promise<boolean | null> {
    for (const rule of policy.rules) {
      if (this.matchesRule(rule, resource, action)) {
        const conditionsMet = await this.evaluateConditions(rule, context);
        
        if (conditionsMet) {
          return rule.type === 'allow';
        }
      }
    }

    return null; // No matching rule
  }

  private matchesRule(rule: SecurityRule, resource: string, action: string): boolean {
    const resourcePattern = new RegExp(rule.resource.replace('*', '.*'));
    const resourceMatches = resourcePattern.test(resource);
    
    const actionMatches = rule.actions.includes('*') || rule.actions.includes(action);
    
    return resourceMatches && actionMatches;
  }

  private async evaluateConditions(
    rule: SecurityRule,
    context: SecurityContext
  ): Promise<boolean> {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true;
    }

    for (const condition of rule.conditions) {
      const met = await this.evaluateCondition(condition, context);
      if (!met) {
        return false; // All conditions must be met
      }
    }

    return true;
  }

  private async evaluateCondition(condition: any, context: SecurityContext): Promise<boolean> {
    switch (condition.type) {
      case 'time':
        return this.evaluateTimeCondition(condition);
      
      case 'role':
        return this.evaluateRoleCondition(condition, context);
      
      case 'location':
        return this.evaluateLocationCondition(condition, context);
      
      default:
        return true;
    }
  }

  private evaluateTimeCondition(condition: any): boolean {
    const now = new Date();
    
    switch (condition.operator) {
      case 'between':
        const [start, end] = condition.value;
        return now >= new Date(start) && now <= new Date(end);
      
      case 'gt':
        return now > new Date(condition.value);
      
      case 'lt':
        return now < new Date(condition.value);
      
      default:
        return true;
    }
  }

  private evaluateRoleCondition(condition: any, context: SecurityContext): boolean {
    switch (condition.operator) {
      case 'in':
        return condition.value.some((role: string) => context.roles.includes(role));
      
      case 'nin':
        return !condition.value.some((role: string) => context.roles.includes(role));
      
      case 'eq':
        return context.roles.includes(condition.value);
      
      case 'neq':
        return !context.roles.includes(condition.value);
      
      default:
        return true;
    }
  }

  private evaluateLocationCondition(_condition: any, context: SecurityContext): boolean {
    // Simplified IP-based location check
    // In production, use a proper GeoIP service
    if (!context.ipAddress) {
      return false;
    }

    // Mock implementation
    return true;
  }
}

// Singleton instance
export const authorizationService = new AuthorizationService();

// Default HIPAA-compliant policies
export function setupDefaultPolicies() {
  // PHI Access Policy
  authorizationService.registerPolicy({
    name: 'phi-access',
    description: 'Controls access to Protected Health Information',
    enforcement: 'strict',
    rules: [
      {
        id: 'phi-read',
        type: 'allow',
        resource: 'phi:*',
        actions: ['read'],
        conditions: [
          {
            type: 'role',
            operator: 'in',
            value: ['therapist', 'admin', 'patient-owner']
          }
        ]
      },
      {
        id: 'phi-write',
        type: 'allow',
        resource: 'phi:*',
        actions: ['write', 'update'],
        conditions: [
          {
            type: 'role',
            operator: 'in',
            value: ['therapist', 'admin']
          }
        ]
      }
    ]
  });

  // Crisis Escalation Policy
  authorizationService.registerPolicy({
    name: 'crisis-escalation',
    description: 'Controls who can escalate crisis situations',
    enforcement: 'permissive',
    rules: [
      {
        id: 'crisis-escalate',
        type: 'allow',
        resource: 'crisis:*',
        actions: ['escalate'],
        conditions: [
          {
            type: 'role',
            operator: 'in',
            value: ['ai-agent', 'therapist', 'moderator', 'admin']
          }
        ]
      }
    ]
  });

  // Audit Log Policy
  authorizationService.registerPolicy({
    name: 'audit-access',
    description: 'Controls access to audit logs',
    enforcement: 'strict',
    rules: [
      {
        id: 'audit-read',
        type: 'allow',
        resource: 'audit:*',
        actions: ['read'],
        conditions: [
          {
            type: 'role',
            operator: 'in',
            value: ['admin', 'compliance-officer']
          }
        ]
      },
      {
        id: 'audit-write-deny',
        type: 'deny',
        resource: 'audit:*',
        actions: ['write', 'update', 'delete']
      }
    ]
  });

  // Set default role permissions
  authorizationService.setRolePermissions('therapist', [
    'patient:read',
    'patient:write',
    'session:create',
    'session:update',
    'notes:create',
    'notes:read'
  ]);

  authorizationService.setRolePermissions('ai-agent', [
    'message:create',
    'mood:log',
    'group:suggest',
    'crisis:detect'
  ]);

  authorizationService.setRolePermissions('patient', [
    'profile:read:own',
    'profile:update:own',
    'message:create:own',
    'mood:log:own'
  ]);
}