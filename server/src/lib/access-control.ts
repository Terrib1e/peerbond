/**
 * Server-Side Role-Based Access Control (RBAC) for PeerBond AI Agent System
 * Validates access permissions and provides security enforcement
 */

export type UserRole = 'member' | 'therapist' | 'admin';
export type AgentType = 'matching' | 'facilitator' | 'sentiment' | 'insight' | 'ai-router' | 'crisis';
export type ToolName = 
  | 'provideSupportiveResponse' | 'validateFeelings' | 'suggestCopingStrategies'
  | 'logMood' | 'analyzeSentiment' | 'escalateCrisis'
  | 'searchGroups' | 'rankGroupsByRelevance' | 'generateGroupRecommendations'
  | 'analyzeMemberProgress' | 'generateProgressInsights' | 'identifyPatterns'
  | 'postMessage' | 'createActionItem' | 'summarizeSession'
  | 'provideCrisisSupport' | 'escalateToHuman'
  | 'analyzeLLMIntent' | 'routeToAgent';

export interface AccessRule {
  agent: AgentType;
  tool: ToolName;
  allowedRoles: UserRole[];
  description: string;
  alternative?: string;
  auditLevel: 'basic' | 'detailed' | 'full';
  requiresConsent?: boolean;
  dataAccess: 'self' | 'group' | 'client' | 'system';
}

export interface AccessViolation {
  type: 'agent_denied' | 'tool_denied' | 'insufficient_privilege' | 'data_access_denied';
  userRole: UserRole;
  requestedResource: string;
  requiredRole: UserRole[];
  alternative?: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Server-side access control matrix with additional security metadata
 */
export const SERVER_ACCESS_CONTROL_MATRIX: AccessRule[] = [
  // Core Therapeutic Tools
  {
    agent: 'facilitator',
    tool: 'provideSupportiveResponse',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate therapeutic responses using evidence-based practices',
    auditLevel: 'basic',
    dataAccess: 'self'
  },
  {
    agent: 'facilitator',
    tool: 'validateFeelings',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Provide emotional validation and normalization',
    auditLevel: 'basic',
    dataAccess: 'self'
  },
  {
    agent: 'facilitator',
    tool: 'suggestCopingStrategies',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Suggest CBT/DBT-based coping techniques',
    auditLevel: 'basic',
    dataAccess: 'self'
  },

  // Assessment & Monitoring Tools
  {
    agent: 'sentiment',
    tool: 'logMood',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Track member emotional states and mood patterns',
    auditLevel: 'detailed',
    dataAccess: 'self'
  },
  {
    agent: 'sentiment',
    tool: 'analyzeSentiment',
    allowedRoles: ['therapist', 'admin'],
    description: 'Perform detailed sentiment analysis on member communications',
    alternative: 'logMood',
    auditLevel: 'full',
    dataAccess: 'client',
    requiresConsent: true
  },
  {
    agent: 'sentiment',
    tool: 'escalateCrisis',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Escalate potential crisis situations for immediate intervention',
    auditLevel: 'full',
    dataAccess: 'system'
  },

  // Group & Matching Tools
  {
    agent: 'matching',
    tool: 'searchGroups',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Search for available peer support groups',
    auditLevel: 'basic',
    dataAccess: 'system'
  },
  {
    agent: 'matching',
    tool: 'rankGroupsByRelevance',
    allowedRoles: ['therapist', 'admin'],
    description: 'Perform detailed group compatibility scoring',
    alternative: 'generateGroupRecommendations',
    auditLevel: 'detailed',
    dataAccess: 'client'
  },
  {
    agent: 'matching',
    tool: 'generateGroupRecommendations',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate personalized group recommendations',
    auditLevel: 'basic',
    dataAccess: 'self'
  },

  // Progress & Insights Tools
  {
    agent: 'insight',
    tool: 'analyzeMemberProgress',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Analyze personal progress and therapeutic outcomes',
    auditLevel: 'detailed',
    dataAccess: 'self'
  },
  {
    agent: 'insight',
    tool: 'generateProgressInsights',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate insights about therapeutic journey and growth',
    auditLevel: 'detailed',
    dataAccess: 'self'
  },
  {
    agent: 'insight',
    tool: 'identifyPatterns',
    allowedRoles: ['therapist', 'admin'],
    description: 'Identify behavioral and emotional patterns for clinical analysis',
    alternative: 'generateProgressInsights',
    auditLevel: 'full',
    dataAccess: 'client',
    requiresConsent: true
  },

  // Communication Tools
  {
    agent: 'facilitator',
    tool: 'postMessage',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Send messages within peer support groups',
    auditLevel: 'basic',
    dataAccess: 'group'
  },
  {
    agent: 'facilitator',
    tool: 'createActionItem',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Create therapeutic goals and action items',
    auditLevel: 'detailed',
    dataAccess: 'self'
  },
  {
    agent: 'facilitator',
    tool: 'summarizeSession',
    allowedRoles: ['therapist', 'admin'],
    description: 'Generate clinical session summaries and documentation',
    alternative: 'createActionItem',
    auditLevel: 'full',
    dataAccess: 'client'
  },

  // Crisis & Safety Tools
  {
    agent: 'crisis',
    tool: 'provideCrisisSupport',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Provide immediate crisis intervention and safety resources',
    auditLevel: 'full',
    dataAccess: 'system'
  },
  {
    agent: 'crisis',
    tool: 'escalateToHuman',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Connect member with human crisis counselor',
    auditLevel: 'full',
    dataAccess: 'system'
  },

  // Professional/Admin Tools
  {
    agent: 'ai-router',
    tool: 'analyzeLLMIntent',
    allowedRoles: ['therapist', 'admin'],
    description: 'Analyze member message intent for clinical insights',
    alternative: 'provideSupportiveResponse',
    auditLevel: 'full',
    dataAccess: 'client'
  },
  {
    agent: 'ai-router',
    tool: 'routeToAgent',
    allowedRoles: ['therapist', 'admin'],
    description: 'Manually route conversations to specific agents',
    alternative: 'provideSupportiveResponse',
    auditLevel: 'full',
    dataAccess: 'system'
  }
];

export class AccessControlService {
  /**
   * Validate access to an agent
   */
  static validateAgentAccess(userRole: UserRole, agent: AgentType): { allowed: boolean; violation?: AccessViolation } {
    const hasAccess = SERVER_ACCESS_CONTROL_MATRIX.some(rule => 
      rule.agent === agent && rule.allowedRoles.includes(userRole)
    );

    if (!hasAccess) {
      const requiredRoles = this.getAgentRequiredRoles(agent);
      return {
        allowed: false,
        violation: {
          type: 'agent_denied',
          userRole,
          requestedResource: agent,
          requiredRole: requiredRoles,
          message: `Access denied to ${agent} agent. Requires ${requiredRoles.join(' or ')} privileges.`,
          severity: 'medium'
        }
      };
    }

    return { allowed: true };
  }

  /**
   * Validate access to a tool
   */
  static validateToolAccess(userRole: UserRole, tool: ToolName): { 
    allowed: boolean; 
    violation?: AccessViolation;
    alternative?: string;
  } {
    const rule = SERVER_ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
    
    if (!rule) {
      return {
        allowed: false,
        violation: {
          type: 'tool_denied',
          userRole,
          requestedResource: tool,
          requiredRole: [],
          message: `Tool ${tool} is not available.`,
          severity: 'low'
        }
      };
    }

    if (!rule.allowedRoles.includes(userRole)) {
      return {
        allowed: false,
        violation: {
          type: 'tool_denied',
          userRole,
          requestedResource: tool,
          requiredRole: rule.allowedRoles,
          alternative: rule.alternative,
          message: `Access denied to ${tool}. Requires ${rule.allowedRoles.join(' or ')} privileges.`,
          severity: rule.dataAccess === 'system' ? 'high' : 'medium'
        },
        alternative: rule.alternative
      };
    }

    return { allowed: true };
  }

  /**
   * Get required roles for an agent
   */
  static getAgentRequiredRoles(agent: AgentType): UserRole[] {
    const roles = new Set<UserRole>();
    SERVER_ACCESS_CONTROL_MATRIX
      .filter(rule => rule.agent === agent)
      .forEach(rule => rule.allowedRoles.forEach(role => roles.add(role)));
    return Array.from(roles);
  }

  /**
   * Get allowed tools for a user role
   */
  static getAllowedTools(userRole: UserRole, agent?: AgentType): ToolName[] {
    return SERVER_ACCESS_CONTROL_MATRIX
      .filter(rule => 
        rule.allowedRoles.includes(userRole) && 
        (agent ? rule.agent === agent : true)
      )
      .map(rule => rule.tool);
  }

  /**
   * Get allowed agents for a user role
   */
  static getAllowedAgents(userRole: UserRole): AgentType[] {
    const agents = new Set<AgentType>();
    SERVER_ACCESS_CONTROL_MATRIX
      .filter(rule => rule.allowedRoles.includes(userRole))
      .forEach(rule => agents.add(rule.agent));
    return Array.from(agents);
  }

  /**
   * Get audit level for a tool
   */
  static getAuditLevel(tool: ToolName): 'basic' | 'detailed' | 'full' {
    const rule = SERVER_ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
    return rule?.auditLevel || 'basic';
  }

  /**
   * Check if tool requires consent
   */
  static requiresConsent(tool: ToolName): boolean {
    const rule = SERVER_ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
    return rule?.requiresConsent || false;
  }

  /**
   * Get data access level for a tool
   */
  static getDataAccessLevel(tool: ToolName): 'self' | 'group' | 'client' | 'system' {
    const rule = SERVER_ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
    return rule?.dataAccess || 'self';
  }

  /**
   * Generate security context for logging
   */
  static generateSecurityContext(userRole: UserRole, tool: ToolName, memberId: string) {
    const rule = SERVER_ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
    return {
      userRole,
      tool,
      agent: rule?.agent,
      auditLevel: rule?.auditLevel || 'basic',
      dataAccess: rule?.dataAccess || 'self',
      requiresConsent: rule?.requiresConsent || false,
      memberId,
      timestamp: new Date(),
      sessionContext: {
        ipAddress: 'unknown', // To be filled by request context
        userAgent: 'unknown'   // To be filled by request context
      }
    };
  }
}

export default AccessControlService;