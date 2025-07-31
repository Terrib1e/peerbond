/**
 * Tool Schemas for PeerBond AI Agent System
 * Defines formal JSON schemas for all agent tools with validation and audit support
 */

import { z } from 'zod';

// Base tool schema with common fields
export const BaseToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  agent: z.enum(['ai-router', 'facilitator', 'sentiment', 'crisis', 'matching', 'insight', 'chat', 'tracker', 'action-items', 'analytics', 'voice', 'orchestration', 'personalization', 'safety', 'knowledge', 'context']),
  parameters: z.record(z.any()),
  required: z.array(z.string()).optional(),
  audit: z.object({
    timestamp: z.date(),
    memberId: z.string(),
    sessionId: z.string(),
    groupId: z.string().optional(),
  }).optional()
});

// Tool execution context
export const ToolContextSchema = z.object({
  memberId: z.string(),
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
  description: 'Analyze member message intent to determine appropriate agent routing',
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
    memberMessage: z.string(),
    emotionalState: z.enum(['positive', 'neutral', 'distressed', 'crisis']).optional(),
    therapeuticApproach: z.enum(['cbt', 'dbt', 'mindfulness', 'validation', 'motivational']).optional(),
    sessionContext: z.object({
      isFirstMessage: z.boolean(),
      previousTopics: z.array(z.string()),
      memberGoals: z.array(z.string())
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
  description: 'Provide emotional validation and normalize member experiences',
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
  description: 'Recommend evidence-based coping strategies tailored to member situation',
  agent: 'facilitator' as const,
  schema: z.object({
    stressors: z.array(z.string()),
    memberStrengths: z.array(z.string()).optional(),
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
  description: 'Perform comprehensive emotional and sentiment analysis of member messages',
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
    memberHistory: z.array(z.string()).optional(),
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
    memberConsent: z.boolean(),
    locationInfo: z.string().optional()
  }),
  returns: z.object({
    escalationInitiated: z.boolean(),
    ticketId: z.string(),
    estimatedResponseTime: z.string(),
    emergencyProtocolActivated: z.boolean(),
    memberNotificationSent: z.boolean()
  })
};

// =============================================================================
// MATCHING AGENT TOOLS
// =============================================================================

export const SearchGroupsTool = {
  name: 'searchGroups',
  description: 'Find compatible peer support groups based on member criteria',
  agent: 'matching' as const,
  schema: z.object({
    memberGoals: z.array(z.string()),
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
  description: 'Rank and score groups by compatibility with member profile',
  agent: 'matching' as const,
  schema: z.object({
    memberId: z.string(),
    candidateGroups: z.array(z.string()),
    memberProfile: z.object({
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
    memberId: z.string(),
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

export const AnalyzeMemberProgressTool = {
  name: 'analyzeMemberProgress',
  description: 'Analyze member progress patterns and growth indicators',
  agent: 'insight' as const,
  schema: z.object({
    memberId: z.string(),
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
    memberId: z.string(),
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
  description: 'Identify behavioral and emotional patterns from member data',
  agent: 'insight' as const,
  schema: z.object({
    memberId: z.string(),
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
// CHAT MANAGER TOOLS
// =============================================================================

export const PostMessageTool = {
  name: 'postMessage',
  description: 'Post message to group chat with thread management',
  agent: 'chat' as const,
  schema: z.object({
    groupId: z.string(),
    memberId: z.string(),
    content: z.string().min(1).max(4000),
    messageType: z.enum(['text', 'image', 'voice', 'file']).default('text'),
    threadId: z.string().optional(),
    replyToId: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }),
  returns: z.object({
    messageId: z.string(),
    timestamp: z.string(),
    status: z.enum(['sent', 'pending', 'failed']),
    threadCreated: z.boolean().optional(),
    notificationsSent: z.array(z.string())
  })
};

export const CreateThreadTool = {
  name: 'createThread',
  description: 'Create new discussion thread in group',
  agent: 'chat' as const,
  schema: z.object({
    groupId: z.string(),
    initiatorId: z.string(),
    topic: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    threadType: z.enum(['discussion', 'check_in', 'resource_sharing', 'crisis_support']).default('discussion'),
    isPrivate: z.boolean().default(false)
  }),
  returns: z.object({
    threadId: z.string(),
    createdAt: z.string(),
    participantCount: z.number(),
    initialMessage: z.string()
  })
};

export const ArchiveMessagesTool = {
  name: 'archiveMessages',
  description: 'Archive old messages for data management',
  agent: 'chat' as const,
  schema: z.object({
    groupId: z.string(),
    beforeDate: z.string(),
    includeAttachments: z.boolean().default(true),
    exportFormat: z.enum(['json', 'csv', 'text']).default('json'),
    retentionPeriod: z.number().optional()
  }),
  returns: z.object({
    archivedCount: z.number(),
    archiveId: z.string(),
    exportUrl: z.string().optional(),
    retentionDate: z.string()
  })
};

// =============================================================================
// MOOD TRACKER TOOLS
// =============================================================================

export const LogMoodTool = {
  name: 'logMood',
  description: 'Log member mood with contextual information',
  agent: 'tracker' as const,
  schema: z.object({
    memberId: z.string(),
    mood: z.string(),
    score: z.number().min(1).max(10),
    note: z.string().max(500).optional(),
    contextTags: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
    triggers: z.array(z.string()).optional(),
    location: z.string().optional()
  }),
  returns: z.object({
    logId: z.string(),
    recorded: z.boolean(),
    trend: z.enum(['improving', 'stable', 'declining']).optional(),
    insights: z.array(z.string()).optional(),
    recommendations: z.array(z.string()).optional()
  })
};

export const TrackProgressTool = {
  name: 'trackProgress',
  description: 'Track member progress metrics over time',
  agent: 'tracker' as const,
  schema: z.object({
    memberId: z.string(),
    metricType: z.enum(['mood_stability', 'engagement', 'goal_completion', 'social_connection']),
    timeframe: z.enum(['day', 'week', 'month', 'quarter']),
    includeComparisons: z.boolean().default(true),
    benchmarkPeriod: z.string().optional()
  }),
  returns: z.object({
    currentValue: z.number(),
    trend: z.object({
      direction: z.enum(['up', 'down', 'stable']),
      percentage: z.number(),
      significance: z.enum(['minor', 'moderate', 'significant'])
    }),
    milestones: z.array(z.string()),
    nextGoals: z.array(z.string())
  })
};

export const GenerateMoodReportTool = {
  name: 'generateMoodReport',
  description: 'Generate comprehensive mood analysis report',
  agent: 'tracker' as const,
  schema: z.object({
    memberId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    includeInsights: z.boolean().default(true),
    format: z.enum(['summary', 'detailed', 'clinical']).default('summary'),
    shareWithTherapist: z.boolean().default(false)
  }),
  returns: z.object({
    reportId: z.string(),
    summary: z.string(),
    averageMood: z.number(),
    trendAnalysis: z.string(),
    patterns: z.array(z.string()),
    recommendations: z.array(z.string()),
    downloadUrl: z.string().optional()
  })
};

// =============================================================================
// ACTION ITEMS TOOLS
// =============================================================================

export const CreateActionItemTool = {
  name: 'createActionItem',
  description: 'Create follow-up action item for group member',
  agent: 'action-items' as const,
  schema: z.object({
    groupId: z.string(),
    assigneeId: z.string(),
    title: z.string().min(1).max(200),
    description: z.string().max(1000),
    dueDate: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    category: z.enum(['self_care', 'therapeutic', 'social', 'practical', 'educational']),
    createdBy: z.string().optional()
  }),
  returns: z.object({
    actionItemId: z.string(),
    created: z.boolean(),
    reminderScheduled: z.boolean(),
    estimatedDuration: z.string().optional(),
    resources: z.array(z.string()).optional()
  })
};

export const UpdateActionItemTool = {
  name: 'updateActionItem',
  description: 'Update action item progress and status',
  agent: 'action-items' as const,
  schema: z.object({
    actionItemId: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
    completionPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().max(500).optional(),
    challenges: z.array(z.string()).optional(),
    successFactors: z.array(z.string()).optional()
  }),
  returns: z.object({
    updated: z.boolean(),
    newStatus: z.string(),
    celebration: z.string().optional(),
    nextSteps: z.array(z.string()).optional(),
    supportNeeded: z.array(z.string()).optional()
  })
};

export const GetActionItemsTool = {
  name: 'getActionItems',
  description: 'Retrieve action items for member or group',
  agent: 'action-items' as const,
  schema: z.object({
    memberId: z.string().optional(),
    groupId: z.string().optional(),
    status: z.enum(['all', 'active', 'completed', 'overdue']).default('active'),
    includeCompleted: z.boolean().default(false),
    timeframe: z.enum(['week', 'month', 'all']).default('all')
  }),
  returns: z.object({
    actionItems: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      dueDate: z.string().optional(),
      progress: z.number(),
      priority: z.string()
    })),
    summary: z.object({
      total: z.number(),
      completed: z.number(),
      overdue: z.number(),
      completionRate: z.number()
    })
  })
};

// =============================================================================
// ANALYTICS TOOLS
// =============================================================================

export const SummarizeSessionTool = {
  name: 'summarizeSession',
  description: 'Generate session summary for dashboard analytics',
  agent: 'analytics' as const,
  schema: z.object({
    groupId: z.string(),
    sessionId: z.string(),
    includeParticipants: z.boolean().default(true),
    includeKeyTopics: z.boolean().default(true),
    includeActionItems: z.boolean().default(true),
    summaryType: z.enum(['brief', 'detailed', 'clinical']).default('detailed'),
    audienceType: z.enum(['admin', 'therapist', 'participant']).default('admin')
  }),
  returns: z.object({
    summary: z.string(),
    keyMetrics: z.object({
      duration: z.string(),
      participantCount: z.number(),
      messageCount: z.number(),
      engagementScore: z.number()
    }),
    highlights: z.array(z.string()),
    concerns: z.array(z.string()).optional(),
    recommendations: z.array(z.string())
  })
};

export const GenerateInsightsTool = {
  name: 'generateInsights',
  description: 'Generate analytics insights for groups and members',
  agent: 'analytics' as const,
  schema: z.object({
    groupId: z.string().optional(),
    memberId: z.string().optional(),
    timeframe: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    insightTypes: z.array(z.enum(['engagement', 'sentiment', 'topics', 'progress', 'connections'])),
    audienceType: z.enum(['participant', 'therapist', 'admin']).default('therapist'),
    includeComparisons: z.boolean().default(true)
  }),
  returns: z.object({
    insights: z.array(z.object({
      category: z.string(),
      finding: z.string(),
      confidence: z.number(),
      actionable: z.boolean(),
      recommendations: z.array(z.string())
    })),
    trends: z.array(z.string()),
    riskFactors: z.array(z.string()).optional(),
    opportunities: z.array(z.string())
  })
};

export const ExportAnalyticsTool = {
  name: 'exportAnalytics',
  description: 'Export analytics data in various formats',
  agent: 'analytics' as const,
  schema: z.object({
    groupId: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    format: z.enum(['csv', 'json', 'pdf', 'excel']).default('csv'),
    includePersonalData: z.boolean().default(false),
    dataTypes: z.array(z.enum(['messages', 'participation', 'mood', 'progress'])).optional()
  }),
  returns: z.object({
    exportId: z.string(),
    downloadUrl: z.string(),
    recordCount: z.number(),
    fileSize: z.string(),
    expiresAt: z.string()
  })
};

// =============================================================================
// VOICE PROCESSING TOOLS
// =============================================================================

export const TranscribeVoiceNoteTool = {
  name: 'transcribeVoiceNote',
  description: 'Transcribe voice note to text with emotional analysis',
  agent: 'voice' as const,
  schema: z.object({
    audioUrl: z.string().url(),
    memberId: z.string(),
    language: z.string().default('en-US'),
    includeEmotionalAnalysis: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.8)
  }),
  returns: z.object({
    transcriptionId: z.string(),
    text: z.string(),
    confidence: z.number(),
    emotionalMarkers: z.array(z.object({
      emotion: z.string(),
      intensity: z.number(),
      timestamp: z.number()
    })).optional(),
    speakerCount: z.number().optional(),
    duration: z.number()
  })
};

export const AnalyzeVoiceSentimentTool = {
  name: 'analyzeVoiceSentiment',
  description: 'Analyze emotional content from voice transcription',
  agent: 'voice' as const,
  schema: z.object({
    transcriptionId: z.string(),
    includeEmotionalMarkers: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    contextualFactors: z.object({
      timeOfDay: z.string().optional(),
      recentEvents: z.array(z.string()).optional()
    }).optional()
  }),
  returns: z.object({
    overallSentiment: z.enum(['very_positive', 'positive', 'neutral', 'negative', 'very_negative']),
    emotionalScore: z.number().min(-1).max(1),
    voiceMarkers: z.array(z.object({
      marker: z.string(),
      confidence: z.number(),
      timespan: z.object({
        start: z.number(),
        end: z.number()
      })
    })),
    riskAssessment: z.object({
      level: z.enum(['low', 'medium', 'high']),
      factors: z.array(z.string())
    }).optional()
  })
};

export const ProcessVoiceToTextTool = {
  name: 'processVoiceToText',
  description: 'Process raw voice data to text with quality enhancement',
  agent: 'voice' as const,
  schema: z.object({
    audioData: z.string(),
    format: z.enum(['mp3', 'wav', 'ogg', 'm4a']),
    quality: z.enum(['standard', 'high', 'premium']).default('standard'),
    speakerDiarization: z.boolean().default(false),
    enhanceAudio: z.boolean().default(true)
  }),
  returns: z.object({
    processedText: z.string(),
    qualityScore: z.number().min(0).max(1),
    processingTime: z.number(),
    speakers: z.array(z.object({
      id: z.string(),
      segments: z.array(z.object({
        text: z.string(),
        start: z.number(),
        end: z.number()
      }))
    })).optional(),
    enhancementApplied: z.boolean()
  })
};

// =============================================================================
// ORCHESTRATION TOOLS
// =============================================================================

export const RouteToAgentTool2 = {
  name: 'routeToAgent',
  description: 'Route requests to appropriate specialized agents',
  agent: 'orchestration' as const,
  schema: z.object({
    message: z.string(),
    context: z.object({
      memberId: z.string(),
      groupId: z.string().optional(),
      sessionHistory: z.array(z.string()).optional(),
      currentMood: z.string().optional(),
      urgency: z.enum(['low', 'medium', 'high', 'critical']).optional()
    }),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    preferredAgents: z.array(z.string()).optional()
  }),
  returns: z.object({
    selectedAgent: z.string(),
    routingReason: z.string(),
    confidence: z.number(),
    fallbackAgents: z.array(z.string()),
    estimatedResponseTime: z.string()
  })
};

export const CoordinateAgentsTool = {
  name: 'coordinateAgents',
  description: 'Coordinate multiple agents for complex tasks',
  agent: 'orchestration' as const,
  schema: z.object({
    primaryAgent: z.string(),
    supportingAgents: z.array(z.string()),
    task: z.enum(['emotional_support', 'crisis_intervention', 'progress_tracking', 'group_matching']),
    context: z.string(),
    timeoutMinutes: z.number().default(5)
  }),
  returns: z.object({
    coordinationId: z.string(),
    agentAssignments: z.array(z.object({
      agent: z.string(),
      role: z.string(),
      tasks: z.array(z.string())
    })),
    executionPlan: z.string(),
    estimatedCompletion: z.string()
  })
};

export const ManageWorkflowTool = {
  name: 'manageWorkflow',
  description: 'Manage multi-step therapeutic workflows',
  agent: 'orchestration' as const,
  schema: z.object({
    workflowId: z.string(),
    currentStep: z.string(),
    nextActions: z.array(z.string()),
    memberContext: z.object({
      emotionalState: z.string().optional(),
      supportNeeds: z.array(z.string()).optional(),
      availableTime: z.string().optional()
    }).optional(),
    adaptations: z.array(z.string()).optional()
  }),
  returns: z.object({
    nextStepId: z.string(),
    stepInstructions: z.string(),
    requiredAgents: z.array(z.string()),
    estimatedDuration: z.string(),
    checkpoints: z.array(z.string()),
    exitCriteria: z.array(z.string())
  })
};

// =============================================================================
// PERSONALIZATION TOOLS
// =============================================================================

export const UpdateMemberPreferencesTool = {
  name: 'updateMemberPreferences',
  description: 'Update member personalization preferences',
  agent: 'personalization' as const,
  schema: z.object({
    memberId: z.string(),
    preferences: z.object({
      communicationStyle: z.enum(['gentle', 'direct', 'encouraging', 'analytical']).optional(),
      triggerWords: z.array(z.string()).optional(),
      preferredSupport: z.array(z.enum(['validation', 'practical_advice', 'resources', 'peer_connection'])).optional(),
      availabilityHours: z.string().optional(),
      notificationSettings: z.object({
        frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
        methods: z.array(z.enum(['email', 'push', 'sms'])).optional()
      }).optional()
    }),
    source: z.enum(['explicit', 'learned', 'imported']).default('explicit')
  }),
  returns: z.object({
    updated: z.boolean(),
    preferencesCount: z.number(),
    adaptationsMade: z.array(z.string()),
    effectiveDate: z.string()
  })
};

export const AdaptToMemberTool = {
  name: 'adaptToMember',
  description: 'Adapt interaction style based on member behavior and preferences',
  agent: 'personalization' as const,
  schema: z.object({
    memberId: z.string(),
    interactionHistory: z.array(z.object({
      type: z.string(),
      response: z.string(),
      effectiveness: z.number().min(0).max(1)
    })).optional(),
    currentContext: z.enum(['seeking_support', 'crisis', 'routine_check', 'celebration', 'learning']),
    adaptationAreas: z.array(z.enum(['tone', 'approach', 'examples', 'pacing', 'depth']))
  }),
  returns: z.object({
    adaptedApproach: z.string(),
    recommendedTone: z.string(),
    suggestedExamples: z.array(z.string()),
    avoidanceList: z.array(z.string()),
    confidence: z.number()
  })
};

export const GeneratePersonalizedContentTool = {
  name: 'generatePersonalizedContent',
  description: 'Generate content tailored to member preferences and needs',
  agent: 'personalization' as const,
  schema: z.object({
    memberId: z.string(),
    contentType: z.enum(['coping_strategy', 'encouragement', 'educational', 'reflection_prompt', 'resource']),
    memberProfile: z.object({
      challenges: z.array(z.string()).optional(),
      strengths: z.array(z.string()).optional(),
      preferences: z.array(z.string()).optional(),
      learningStyle: z.enum(['visual', 'auditory', 'kinesthetic', 'reading']).optional()
    }).optional(),
    contextualFactors: z.object({
      recentMood: z.string().optional(),
      timeOfDay: z.string().optional(),
      availableTime: z.string().optional()
    }).optional()
  }),
  returns: z.object({
    content: z.string(),
    format: z.string(),
    personalizationFactors: z.array(z.string()),
    adaptationReason: z.string(),
    followUpSuggestions: z.array(z.string())
  })
};

// =============================================================================
// SAFETY MONITOR TOOLS
// =============================================================================

export const ScreenContentTool = {
  name: 'screenContent',
  description: 'Screen content for safety and appropriateness',
  agent: 'safety' as const,
  schema: z.object({
    content: z.string(),
    contentType: z.enum(['message', 'image', 'voice', 'file']).default('message'),
    context: z.enum(['group_chat', 'private_message', 'public_post', 'resource_sharing']),
    memberId: z.string(),
    strictnessLevel: z.enum(['permissive', 'moderate', 'strict']).default('moderate')
  }),
  returns: z.object({
    approved: z.boolean(),
    riskLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']),
    flaggedContent: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      reason: z.string(),
      suggestion: z.string().optional()
    })),
    recommendations: z.array(z.string()),
    requiresReview: z.boolean()
  })
};

export const ValidateSafetyTool = {
  name: 'validateSafety',
  description: 'Validate content safety with risk assessment',
  agent: 'safety' as const,
  schema: z.object({
    message: z.string(),
    memberId: z.string(),
    context: z.enum(['support_request', 'crisis_expression', 'private_message', 'group_discussion']),
    includeRiskAssessment: z.boolean().default(true),
    referenceHistory: z.boolean().default(true)
  }),
  returns: z.object({
    safetyScore: z.number().min(0).max(1),
    riskAssessment: z.object({
      immediateRisk: z.boolean(),
      riskType: z.array(z.string()),
      interventionRequired: z.boolean(),
      escalationLevel: z.enum(['none', 'low', 'medium', 'high', 'immediate'])
    }),
    recommendations: z.array(z.string()),
    supportResources: z.array(z.string()).optional()
  })
};

export const FilterContentTool = {
  name: 'filterContent',
  description: 'Filter and clean content while preserving therapeutic value',
  agent: 'safety' as const,
  schema: z.object({
    content: z.string(),
    filterType: z.enum(['profanity', 'personal_info', 'harmful_content', 'spam']),
    strictness: z.enum(['light', 'moderate', 'strict']).default('moderate'),
    context: z.enum(['therapeutic', 'casual', 'crisis', 'educational']),
    preserveTherapeuticValue: z.boolean().default(true)
  }),
  returns: z.object({
    filteredContent: z.string(),
    changesApplied: z.array(z.object({
      type: z.string(),
      original: z.string(),
      replacement: z.string(),
      reason: z.string()
    })),
    qualityScore: z.number().min(0).max(1),
    therapeuticValuePreserved: z.boolean()
  })
};

// =============================================================================
// KNOWLEDGE BASE TOOLS
// =============================================================================

export const SearchResourcesTool = {
  name: 'searchResources',
  description: 'Search therapeutic resources and educational content',
  agent: 'knowledge' as const,
  schema: z.object({
    query: z.string().min(1).max(500),
    category: z.enum(['coping_strategies', 'educational', 'crisis_resources', 'exercises', 'articles']).optional(),
    memberLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    format: z.enum(['articles', 'videos', 'exercises', 'tools', 'worksheets']).optional(),
    maxResults: z.number().min(1).max(20).default(10)
  }),
  returns: z.object({
    resources: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      type: z.string(),
      relevanceScore: z.number(),
      difficulty: z.string(),
      estimatedTime: z.string().optional(),
      url: z.string().optional()
    })),
    totalFound: z.number(),
    searchSuggestions: z.array(z.string()),
    relatedTopics: z.array(z.string())
  })
};

export const GetTherapeuticContentTool = {
  name: 'getTherapeuticContent',
  description: 'Get specific therapeutic content and exercises',
  agent: 'knowledge' as const,
  schema: z.object({
    topic: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    duration: z.enum(['5_minutes', '15_minutes', '30_minutes', '1_hour']).default('15_minutes'),
    format: z.enum(['exercise', 'reading', 'video', 'interactive', 'worksheet']).default('exercise'),
    therapeuticApproach: z.enum(['cbt', 'dbt', 'mindfulness', 'acceptance', 'behavioral']).optional()
  }),
  returns: z.object({
    content: z.object({
      title: z.string(),
      description: z.string(),
      instructions: z.string(),
      materials: z.array(z.string()).optional(),
      duration: z.string(),
      benefits: z.array(z.string())
    }),
    adaptations: z.array(z.string()),
    followUpSuggestions: z.array(z.string()),
    relatedContent: z.array(z.string())
  })
};

export const RecommendReadingTool = {
  name: 'recommendReading',
  description: 'Recommend reading materials based on member profile',
  agent: 'knowledge' as const,
  schema: z.object({
    memberProfile: z.object({
      interests: z.array(z.string()).optional(),
      challenges: z.array(z.string()).optional(),
      readingLevel: z.enum(['basic', 'intermediate', 'advanced']).default('intermediate'),
      timeAvailable: z.enum(['5_minutes', '15_minutes', '30_minutes', '1_hour']).default('15_minutes'),
      preferredFormat: z.enum(['article', 'book_chapter', 'summary', 'infographic']).optional()
    }),
    contentType: z.enum(['educational', 'inspirational', 'practical', 'research', 'personal_story']).default('practical'),
    urgency: z.enum(['immediate', 'this_week', 'when_convenient']).default('when_convenient')
  }),
  returns: z.object({
    recommendations: z.array(z.object({
      title: z.string(),
      author: z.string().optional(),
      type: z.string(),
      description: z.string(),
      matchScore: z.number(),
      readingTime: z.string(),
      keyTakeaways: z.array(z.string()),
      accessUrl: z.string().optional()
    })),
    learningPath: z.array(z.string()).optional(),
    progressTracking: z.object({
      milestones: z.array(z.string()),
      completionCriteria: z.string()
    }).optional()
  })
};

// =============================================================================
// CONTEXT MANAGER TOOLS
// =============================================================================

export const UpdateContextTool = {
  name: 'updateContext',
  description: 'Update session context and member state',
  agent: 'context' as const,
  schema: z.object({
    sessionId: z.string(),
    memberId: z.string(),
    contextUpdate: z.object({
      currentTopic: z.string().optional(),
      emotionalState: z.string().optional(),
      sessionGoals: z.array(z.string()).optional(),
      progressNotes: z.string().optional(),
      urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).optional()
    }),
    source: z.enum(['member_input', 'agent_inference', 'external_trigger']).default('agent_inference')
  }),
  returns: z.object({
    contextId: z.string(),
    updated: z.boolean(),
    previousState: z.record(z.any()).optional(),
    adaptationsTriggered: z.array(z.string()),
    nextRecommendations: z.array(z.string())
  })
};

export const RetrieveContextTool = {
  name: 'retrieveContext',
  description: 'Retrieve session context and member history',
  agent: 'context' as const,
  schema: z.object({
    sessionId: z.string().optional(),
    memberId: z.string(),
    contextTypes: z.array(z.enum(['emotional_state', 'topics', 'goals', 'preferences', 'history'])).optional(),
    includeHistory: z.boolean().default(true),
    timeframe: z.enum(['current_session', 'recent', 'all']).default('current_session')
  }),
  returns: z.object({
    context: z.object({
      current: z.record(z.any()),
      recent: z.record(z.any()).optional(),
      patterns: z.array(z.string()).optional()
    }),
    sessionHistory: z.array(z.object({
      timestamp: z.string(),
      event: z.string(),
      data: z.record(z.any())
    })).optional(),
    insights: z.array(z.string()),
    recommendations: z.array(z.string())
  })
};

export const ManageMemoryTool = {
  name: 'manageMemory',
  description: 'Manage member memory and persistent preferences',
  agent: 'context' as const,
  schema: z.object({
    memberId: z.string(),
    memoryType: z.enum(['preferences', 'achievements', 'triggers', 'goals', 'relationships']),
    action: z.enum(['create', 'read', 'update', 'delete']),
    data: z.record(z.any()).optional(),
    retentionPeriod: z.enum(['session', 'week', 'month', 'permanent']).default('permanent')
  }),
  returns: z.object({
    success: z.boolean(),
    memoryId: z.string().optional(),
    currentMemory: z.record(z.any()).optional(),
    memoryCount: z.number(),
    lastUpdated: z.string()
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
  'insight': [AnalyzeMemberProgressTool, GenerateProgressInsightsTool, IdentifyPatternsTool],
  'chat': [PostMessageTool, CreateThreadTool, ArchiveMessagesTool],
  'tracker': [LogMoodTool, TrackProgressTool, GenerateMoodReportTool],
  'action-items': [CreateActionItemTool, UpdateActionItemTool, GetActionItemsTool],
  'analytics': [SummarizeSessionTool, GenerateInsightsTool, ExportAnalyticsTool],
  'voice': [TranscribeVoiceNoteTool, AnalyzeVoiceSentimentTool, ProcessVoiceToTextTool],
  'orchestration': [RouteToAgentTool2, CoordinateAgentsTool, ManageWorkflowTool],
  'personalization': [UpdateMemberPreferencesTool, AdaptToMemberTool, GeneratePersonalizedContentTool],
  'safety': [ScreenContentTool, ValidateSafetyTool, FilterContentTool],
  'knowledge': [SearchResourcesTool, GetTherapeuticContentTool, RecommendReadingTool],
  'context': [UpdateContextTool, RetrieveContextTool, ManageMemoryTool]
};

export type AgentType = keyof typeof AGENT_TOOLS;
export type ToolContext = z.infer<typeof ToolContextSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;