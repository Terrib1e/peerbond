/**
 * Tool Schemas for PeerBond AI Agent System
 * Defines formal JSON schemas for all agent tools with validation and audit support
 */

import { z } from 'zod';

// Base tool schema with common fields
export const BaseToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  agent: z.enum(['ai-router', 'facilitator', 'sentiment', 'crisis', 'matching', 'insight']),
  parameters: z.record(z.any()),
  required: z.array(z.string()).optional(),
  audit: z.object({
    timestamp: z.date(),
    userId: z.string(),
    sessionId: z.string(),
    groupId: z.string().optional(),
  }).optional()
});

// Tool execution context
export const ToolContextSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  groupId: z.string().optional(),
  messageId: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  agent: z.string(),
  metadata: z.record(z.any()).optional()
});

// Tool execution result
export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  requiresHumanEscalation: z.boolean().default(false),
  auditTrail: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// =============================================================================
// AI ROUTER TOOLS
// =============================================================================

export const AnalyzeLLMIntentTool = {
  name: 'analyzeLLMIntent',
  description: 'Analyze user message intent to determine appropriate agent routing',
  agent: 'ai-router' as const,
  schema: z.object({
    message: z.string().min(1).max(4000),
    conversationHistory: z.array(z.string()).optional(),
    groupContext: z.object({
      groupType: z.enum(['recovery', 'wellness', 'general']),
      memberCount: z.number(),
      recentActivity: z.enum(['high', 'moderate', 'low'])
    }).optional()
  }),
  returns: z.object({
    primaryIntent: z.enum(['support_seeking', 'crisis', 'sharing', 'question', 'social', 'meta_query']),
    confidence: z.number().min(0).max(1),
    suggestedAgent: z.enum(['facilitator', 'sentiment', 'crisis', 'matching', 'insight']),
    reasoning: z.string(),
    urgency: z.enum(['low', 'medium', 'high', 'critical'])
  })
};

export const RouteToAgentTool = {
  name: 'routeToAgent',
  description: 'Route message to the most appropriate specialized agent',
  agent: 'ai-router' as const,
  schema: z.object({
    targetAgent: z.enum(['facilitator', 'sentiment', 'crisis', 'matching', 'insight']),
    message: z.string(),
    routingReason: z.string(),
    priority: z.enum(['low', 'medium', 'high', 'urgent'])
  }),
  returns: z.object({
    routingSuccess: z.boolean(),
    agentResponse: z.string().optional(),
    fallbackAgent: z.string().optional(),
    routingMetadata: z.record(z.any())
  })
};

// =============================================================================
// FACILITATOR (MAYA) TOOLS
// =============================================================================

export const ProvideSupportiveResponseTool = {
  name: 'provideSupportiveResponse',
  description: 'Generate therapeutic, empathetic response based on evidence-based practices',
  agent: 'facilitator' as const,
  schema: z.object({
    userMessage: z.string(),
    emotionalState: z.enum(['positive', 'neutral', 'distressed', 'crisis']).optional(),
    therapeuticApproach: z.enum(['cbt', 'dbt', 'mindfulness', 'validation', 'motivational']).optional(),
    sessionContext: z.object({
      isFirstMessage: z.boolean(),
      previousTopics: z.array(z.string()),
      userGoals: z.array(z.string())
    }).optional()
  }),
  returns: z.object({
    response: z.string(),
    therapeuticTechnique: z.string(),
    followUpSuggestions: z.array(z.string()),
    resourceRecommendations: z.array(z.string()).optional()
  })
};

export const ValidateFeelingsTool = {
  name: 'validateFeelings',
  description: 'Provide emotional validation and normalize user experiences',
  agent: 'facilitator' as const,
  schema: z.object({
    emotionExpressed: z.string(),
    intensityLevel: z.number().min(1).max(10),
    context: z.string(),
    validationType: z.enum(['normalize', 'affirm', 'reframe', 'acknowledge'])
  }),
  returns: z.object({
    validationResponse: z.string(),
    normalizedExperience: z.string(),
    strengthsIdentified: z.array(z.string()),
    coreMessage: z.string()
  })
};

export const SuggestCopingStrategiesTool = {
  name: 'suggestCopingStrategies',
  description: 'Recommend evidence-based coping strategies tailored to user situation',
  agent: 'facilitator' as const,
  schema: z.object({
    stressors: z.array(z.string()),
    userStrengths: z.array(z.string()).optional(),
    preferredApproaches: z.array(z.enum(['physical', 'cognitive', 'social', 'creative', 'spiritual'])).optional(),
    urgencyLevel: z.enum(['maintenance', 'preventive', 'active_coping', 'crisis_management'])
  }),
  returns: z.object({
    strategies: z.array(z.object({
      name: z.string(),
      description: z.string(),
      category: z.string(),
      timeToImplement: z.string(),
      effectivenessRating: z.number()
    })),
    immediateActions: z.array(z.string()),
    longerTermApproaches: z.array(z.string())
  })
};

// =============================================================================
// SENTIMENT ANALYSIS TOOLS
// =============================================================================

export const AnalyzeSentimentTool = {
  name: 'analyzeSentiment',
  description: 'Perform comprehensive emotional and sentiment analysis of user messages',
  agent: 'sentiment' as const,
  schema: z.object({
    text: z.string(),
    contextualFactors: z.object({
      timeOfDay: z.string().optional(),
      groupDynamics: z.string().optional(),
      recentEvents: z.array(z.string()).optional()
    }).optional()
  }),
  returns: z.object({
    overallSentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
    emotionalScore: z.number().min(-1).max(1),
    primaryEmotions: z.array(z.object({
      emotion: z.string(),
      intensity: z.number().min(0).max(1),
      confidence: z.number().min(0).max(1)
    })),
    riskFactors: z.array(z.string()),
    protectiveFactors: z.array(z.string()),
    trendAnalysis: z.string().optional()
  })
};

export const DetectCrisisTool = {
  name: 'detectCrisis',
  description: 'Identify potential crisis situations requiring immediate intervention',
  agent: 'sentiment' as const,
  schema: z.object({
    message: z.string(),
    userHistory: z.array(z.string()).optional(),
    contextualCues: z.object({
      timePattern: z.string().optional(),
      behavioralChanges: z.array(z.string()).optional()
    }).optional()
  }),
  returns: z.object({
    crisisDetected: z.boolean(),
    severityLevel: z.enum(['none', 'mild', 'moderate', 'severe', 'imminent']),
    riskFactors: z.array(z.string()),
    immediateActions: z.array(z.string()),
    recommendedEscalation: z.boolean(),
    confidenceLevel: z.number().min(0).max(1)
  })
};

// =============================================================================
// CRISIS INTERVENTION TOOLS
// =============================================================================

export const ProvideCrisisSupportTool = {
  name: 'provideCrisisSupport',
  description: 'Provide immediate crisis intervention and safety planning',
  agent: 'crisis' as const,
  schema: z.object({
    crisisType: z.enum(['suicidal_ideation', 'self_harm', 'panic_attack', 'substance_crisis', 'emotional_overwhelm']),
    severityLevel: z.enum(['mild', 'moderate', 'severe', 'imminent']),
    immediateNeeds: z.array(z.string()),
    availableSupports: z.array(z.string()).optional()
  }),
  returns: z.object({
    immediateResponse: z.string(),
    safetyResources: z.array(z.object({
      type: z.enum(['hotline', 'emergency', 'professional', 'peer_support']),
      name: z.string(),
      contact: z.string(),
      description: z.string()
    })),
    groundingTechniques: z.array(z.string()),
    followUpPlan: z.string()
  })
};

export const EscalateToHumanTool = {
  name: 'escalateToHuman',
  description: 'Escalate crisis situation to human professional',
  agent: 'crisis' as const,
  schema: z.object({
    urgencyLevel: z.enum(['routine', 'priority', 'urgent', 'emergency']),
    crisisDetails: z.string(),
    userConsent: z.boolean(),
    locationInfo: z.string().optional()
  }),
  returns: z.object({
    escalationInitiated: z.boolean(),
    ticketId: z.string(),
    estimatedResponseTime: z.string(),
    emergencyProtocolActivated: z.boolean(),
    userNotificationSent: z.boolean()
  })
};

// =============================================================================
// MATCHING AGENT TOOLS
// =============================================================================

export const SearchGroupsTool = {
  name: 'searchGroups',
  description: 'Find compatible peer support groups based on user criteria',
  agent: 'matching' as const,
  schema: z.object({
    userGoals: z.array(z.string()),
    experienceLevel: z.enum(['beginner', 'intermediate', 'experienced']),
    preferredGroupSize: z.enum(['small', 'medium', 'large', 'any']),
    supportType: z.enum(['recovery', 'wellness', 'general', 'crisis']),
    location: z.string().optional(),
    ageRange: z.object({
      min: z.number().min(13).max(100),
      max: z.number().min(13).max(100)
    }).optional()
  }),
  returns: z.object({
    groups: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      memberCount: z.number(),
      compatibility: z.number().min(0).max(1),
      matchReasons: z.array(z.string())
    })),
    totalMatches: z.number(),
    searchCriteria: z.record(z.any())
  })
};

export const RankGroupsByRelevanceTool = {
  name: 'rankGroupsByRelevance',
  description: 'Rank and score groups by compatibility with user profile',
  agent: 'matching' as const,
  schema: z.object({
    userId: z.string(),
    candidateGroups: z.array(z.string()),
    userProfile: z.object({
      goals: z.array(z.string()),
      interests: z.array(z.string()),
      challengesAreas: z.array(z.string()),
      communicationStyle: z.enum(['quiet', 'moderate', 'active'])
    }),
    weightings: z.object({
      goalAlignment: z.number().min(0).max(1).default(0.4),
      experienceLevel: z.number().min(0).max(1).default(0.2),
      groupDynamics: z.number().min(0).max(1).default(0.3),
      logistical: z.number().min(0).max(1).default(0.1)
    }).optional()
  }),
  returns: z.object({
    rankedGroups: z.array(z.object({
      groupId: z.string(),
      overallScore: z.number().min(0).max(1),
      subscores: z.object({
        goalAlignment: z.number(),
        experienceLevel: z.number(),
        groupDynamics: z.number(),
        logistical: z.number()
      }),
      strengths: z.array(z.string()),
      concerns: z.array(z.string()),
      recommendation: z.enum(['highly_recommended', 'recommended', 'consider', 'not_recommended'])
    })),
    bestMatch: z.string().optional()
  })
};

export const GenerateGroupRecommendationsTool = {
  name: 'generateGroupRecommendations',
  description: 'Generate personalized group recommendations with explanations',
  agent: 'matching' as const,
  schema: z.object({
    userId: z.string(),
    currentGroups: z.array(z.string()).optional(),
    recommendationContext: z.enum(['initial_signup', 'seeking_additional', 'replacement_needed', 'growth_focused']),
    maxRecommendations: z.number().min(1).max(10).default(3),
    includeExplanations: z.boolean().default(true)
  }),
  returns: z.object({
    recommendations: z.array(z.object({
      groupId: z.string(),
      groupName: z.string(),
      matchScore: z.number().min(0).max(1),
      reasoning: z.string(),
      expectedBenefits: z.array(z.string()),
      potentialChallenges: z.array(z.string()),
      nextSteps: z.array(z.string())
    })),
    summary: z.string(),
    followUpSuggestions: z.array(z.string())
  })
};

// =============================================================================
// INSIGHT AGENT TOOLS  
// =============================================================================

export const AnalyzeUserProgressTool = {
  name: 'analyzeUserProgress',
  description: 'Analyze user progress patterns and growth indicators',
  agent: 'insight' as const,
  schema: z.object({
    userId: z.string(),
    timeframe: z.enum(['week', 'month', 'quarter', 'year']),
    metrics: z.array(z.enum(['mood', 'engagement', 'goal_progress', 'social_connection', 'coping_skills'])),
    includeComparisons: z.boolean().default(true)
  }),
  returns: z.object({
    overallProgress: z.object({
      direction: z.enum(['improving', 'stable', 'declining', 'mixed']),
      confidence: z.number().min(0).max(1),
      keyFindings: z.array(z.string())
    }),
    metricAnalysis: z.array(z.object({
      metric: z.string(),
      trend: z.enum(['increasing', 'stable', 'decreasing']),
      currentLevel: z.enum(['low', 'moderate', 'high']),
      change: z.number(),
      insights: z.array(z.string())
    })),
    milestones: z.array(z.object({
      achievement: z.string(),
      date: z.string(),
      significance: z.enum(['minor', 'moderate', 'major'])
    })),
    recommendations: z.array(z.string())
  })
};

export const GenerateProgressInsightsTool = {
  name: 'generateProgressInsights',
  description: 'Generate comprehensive progress insights and recommendations',
  agent: 'insight' as const,
  schema: z.object({
    userId: z.string(),
    groupId: z.string().optional(),
    focusAreas: z.array(z.enum(['emotional_regulation', 'social_skills', 'coping_strategies', 'goal_achievement', 'resilience'])),
    insightType: z.enum(['personal_growth', 'group_contribution', 'overall_journey', 'specific_challenge']),
    audienceType: z.enum(['self_reflection', 'therapist_summary', 'group_celebration'])
  }),
  returns: z.object({
    primaryInsights: z.array(z.object({
      category: z.string(),
      insight: z.string(),
      evidence: z.array(z.string()),
      actionable: z.boolean()
    })),
    progressSummary: z.string(),
    strengthsIdentified: z.array(z.string()),
    growthOpportunities: z.array(z.string()),
    celebrationPoints: z.array(z.string()),
    nextSteps: z.array(z.string())
  })
};

export const IdentifyPatternsTool = {
  name: 'identifyPatterns',
  description: 'Identify behavioral and emotional patterns from user data',
  agent: 'insight' as const,
  schema: z.object({
    userId: z.string(),
    dataTypes: z.array(z.enum(['messages', 'mood_logs', 'participation', 'goal_updates', 'interactions'])),
    patternTypes: z.array(z.enum(['temporal', 'emotional', 'behavioral', 'social', 'progress'])),
    lookbackPeriod: z.number().min(7).max(365).default(30),
    minimumConfidence: z.number().min(0.5).max(1).default(0.7)
  }),
  returns: z.object({
    patterns: z.array(z.object({
      type: z.string(),
      description: z.string(),
      confidence: z.number().min(0).max(1),
      frequency: z.string(),
      triggers: z.array(z.string()),
      implications: z.array(z.string()),
      suggestions: z.array(z.string())
    })),
    summary: z.string(),
    riskFactors: z.array(z.string()),
    protectiveFactors: z.array(z.string()),
    recommendedInterventions: z.array(z.string())
  })
};

// =============================================================================
// TOOL COLLECTIONS BY AGENT
// =============================================================================

// Define the tool interface
interface Tool {
  name: string;
  description: string;
  agent: string;
  schema: any;
  returns?: any;
}

export const AGENT_TOOLS: Record<string, Tool[]> = {
  'ai-router': [AnalyzeLLMIntentTool, RouteToAgentTool],
  'facilitator': [ProvideSupportiveResponseTool, ValidateFeelingsTool, SuggestCopingStrategiesTool],
  'sentiment': [AnalyzeSentimentTool, DetectCrisisTool],
  'crisis': [ProvideCrisisSupportTool, EscalateToHumanTool],
  'matching': [SearchGroupsTool, RankGroupsByRelevanceTool, GenerateGroupRecommendationsTool],
  'insight': [AnalyzeUserProgressTool, GenerateProgressInsightsTool, IdentifyPatternsTool]
};

export type AgentType = keyof typeof AGENT_TOOLS;
export type ToolContext = z.infer<typeof ToolContextSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;