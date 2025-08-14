/**
 * Role-Based Access Control (RBAC) for PeerBond AI Agent System
 * Defines what agents and tools each user role can access
 */

export type UserRole = 'member' | 'therapist' | 'admin';

export type AgentType = 'matching' | 'facilitator' | 'sentiment' | 'insight' | 'ai-router' | 'crisis';

export type ToolName = 
  // Core Therapeutic Tools
  | 'provideSupportiveResponse'
  | 'validateFeelings' 
  | 'suggestCopingStrategies'
  // Assessment & Monitoring Tools
  | 'logMood'
  | 'analyzeSentiment'
  | 'escalateCrisis'
  // Group & Matching Tools
  | 'searchGroups'
  | 'rankGroupsByRelevance'
  | 'generateGroupRecommendations'
  // Progress & Insights Tools
  | 'analyzeMemberProgress'
  | 'generateProgressInsights'
  | 'identifyPatterns'
  // Communication Tools
  | 'postMessage'
  | 'createActionItem'
  | 'summarizeSession'
  // Crisis & Safety Tools
  | 'provideCrisisSupport'
  | 'escalateToHuman'
  // Professional/Admin Tools
  | 'analyzeLLMIntent'
  | 'routeToAgent';

export interface AccessRule {
  agent: AgentType;
  tool: ToolName;
  allowedRoles: UserRole[];
  description: string;
  alternative?: string; // Alternative tool for restricted access
  auditLevel: 'basic' | 'detailed' | 'full';
}

/**
 * Comprehensive access control matrix
 */
export const ACCESS_CONTROL_MATRIX: AccessRule[] = [
  // Core Therapeutic Tools (Available to all)
  {
    agent: 'facilitator',
    tool: 'provideSupportiveResponse',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate therapeutic responses using evidence-based practices',
    auditLevel: 'basic'
  },
  {
    agent: 'facilitator',
    tool: 'validateFeelings',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Provide emotional validation and normalization',
    auditLevel: 'basic'
  },
  {
    agent: 'facilitator',
    tool: 'suggestCopingStrategies',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Suggest CBT/DBT-based coping techniques',
    auditLevel: 'basic'
  },

  // Assessment & Monitoring Tools
  {
    agent: 'sentiment',
    tool: 'logMood',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Track member emotional states and mood patterns',
    auditLevel: 'detailed'
  },
  {
    agent: 'sentiment',
    tool: 'analyzeSentiment',
    allowedRoles: ['therapist', 'admin'],
    description: 'Perform detailed sentiment analysis on member communications',
    alternative: 'logMood',
    auditLevel: 'full'
  },
  {
    agent: 'sentiment',
    tool: 'escalateCrisis',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Escalate potential crisis situations for immediate intervention',
    auditLevel: 'full'
  },

  // Group & Matching Tools
  {
    agent: 'matching',
    tool: 'searchGroups',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Search for available peer support groups',
    auditLevel: 'basic'
  },
  {
    agent: 'matching',
    tool: 'rankGroupsByRelevance',
    allowedRoles: ['therapist', 'admin'],
    description: 'Perform detailed group compatibility scoring',
    alternative: 'generateGroupRecommendations',
    auditLevel: 'detailed'
  },
  {
    agent: 'matching',
    tool: 'generateGroupRecommendations',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate personalized group recommendations',
    auditLevel: 'basic'
  },

  // Progress & Insights Tools
  {
    agent: 'insight',
    tool: 'analyzeMemberProgress',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Analyze personal progress and therapeutic outcomes',
    auditLevel: 'detailed'
  },
  {
    agent: 'insight',
    tool: 'generateProgressInsights',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Generate insights about therapeutic journey and growth',
    auditLevel: 'detailed'
  },
  {
    agent: 'insight',
    tool: 'identifyPatterns',
    allowedRoles: ['therapist', 'admin'],
    description: 'Identify behavioral and emotional patterns for clinical analysis',
    alternative: 'generateProgressInsights',
    auditLevel: 'full'
  },

  // Communication Tools
  {
    agent: 'facilitator',
    tool: 'postMessage',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Send messages within peer support groups',
    auditLevel: 'basic'
  },
  {
    agent: 'facilitator',
    tool: 'createActionItem',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Create therapeutic goals and action items',
    auditLevel: 'detailed'
  },
  {
    agent: 'facilitator',
    tool: 'summarizeSession',
    allowedRoles: ['therapist', 'admin'],
    description: 'Generate clinical session summaries and documentation',
    alternative: 'createActionItem',
    auditLevel: 'full'
  },

  // Crisis & Safety Tools (Available to all for safety)
  {
    agent: 'crisis',
    tool: 'provideCrisisSupport',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Provide immediate crisis intervention and safety resources',
    auditLevel: 'full'
  },
  {
    agent: 'crisis',
    tool: 'escalateToHuman',
    allowedRoles: ['member', 'therapist', 'admin'],
    description: 'Connect member with human crisis counselor',
    auditLevel: 'full'
  },

  // Professional/Admin Tools
  {
    agent: 'ai-router',
    tool: 'analyzeLLMIntent',
    allowedRoles: ['therapist', 'admin'],
    description: 'Analyze member message intent for clinical insights',
    alternative: 'provideSupportiveResponse',
    auditLevel: 'full'
  },
  {
    agent: 'ai-router',
    tool: 'routeToAgent',
    allowedRoles: ['therapist', 'admin'],
    description: 'Manually route conversations to specific agents',
    alternative: 'provideSupportiveResponse',
    auditLevel: 'full'
  }
];

/**
 * Get allowed agents for a user role
 */
export function getAllowedAgents(userRole: UserRole): AgentType[] {
  const allowedAgents = new Set<AgentType>();
  
  ACCESS_CONTROL_MATRIX.forEach(rule => {
    if (rule.allowedRoles.includes(userRole)) {
      allowedAgents.add(rule.agent);
    }
  });
  
  return Array.from(allowedAgents);
}

/**
 * Get allowed tools for a user role and specific agent
 */
export function getAllowedTools(userRole: UserRole, agent?: AgentType): ToolName[] {
  return ACCESS_CONTROL_MATRIX
    .filter(rule => 
      rule.allowedRoles.includes(userRole) && 
      (agent ? rule.agent === agent : true)
    )
    .map(rule => rule.tool);
}

/**
 * Check if a user role can access a specific tool
 */
export function canAccessTool(userRole: UserRole, tool: ToolName): boolean {
  return ACCESS_CONTROL_MATRIX.some(rule => 
    rule.tool === tool && rule.allowedRoles.includes(userRole)
  );
}

/**
 * Check if a user role can access a specific agent
 */
export function canAccessAgent(userRole: UserRole, agent: AgentType): boolean {
  return ACCESS_CONTROL_MATRIX.some(rule => 
    rule.agent === agent && rule.allowedRoles.includes(userRole)
  );
}

/**
 * Get alternative tool for restricted access
 */
export function getAlternativeTool(userRole: UserRole, tool: ToolName): ToolName | null {
  const rule = ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
  
  if (!rule || rule.allowedRoles.includes(userRole)) {
    return null; // No alternative needed
  }
  
  if (rule.alternative && canAccessTool(userRole, rule.alternative as ToolName)) {
    return rule.alternative as ToolName;
  }
  
  return null;
}

/**
 * Get audit level for a tool
 */
export function getAuditLevel(tool: ToolName): 'basic' | 'detailed' | 'full' {
  const rule = ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
  return rule?.auditLevel || 'basic';
}

/**
 * Get access control rule for a tool
 */
export function getAccessRule(tool: ToolName): AccessRule | undefined {
  return ACCESS_CONTROL_MATRIX.find(r => r.tool === tool);
}

/**
 * Role hierarchy for access control
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  member: 1,
  therapist: 2,
  admin: 3
};

/**
 * Check if role has sufficient privileges
 */
export function hasPrivilege(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get user-friendly description of access restrictions
 */
export function getAccessDeniedMessage(userRole: UserRole, tool: ToolName): string {
  const rule = getAccessRule(tool);
  if (!rule) {
    return 'This tool is not available.';
  }
  
  const alternative = getAlternativeTool(userRole, tool);
  const baseMessage = `This ${rule.description.toLowerCase()} requires ${rule.allowedRoles.join(' or ')} access.`;
  
  if (alternative) {
    return `${baseMessage} Try using the alternative feature instead.`;
  }
  
  return baseMessage;
}