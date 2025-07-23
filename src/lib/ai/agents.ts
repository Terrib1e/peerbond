import { User, Group, Message } from '@/types';

export interface AITool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
  execute: (parameters: any, context: AIContext) => Promise<any>;
}

export interface AIContext {
  user: User;
  group?: Group;
  messages?: Message[];
  sessionData?: Record<string, any>;
}

export interface AIAgent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: AITool[];
  capabilities: string[];
  triggerConditions?: (context: AIContext) => boolean;
}

// Crisis Assessment Tool
export const crisisAssessmentTool: AITool = {
  name: 'assess_crisis_risk',
  description: 'Assess if a user is in crisis and needs immediate intervention',
  parameters: {
    type: 'object',
    properties: {
      riskLevel: {
        type: 'string',
        enum: ['low', 'moderate', 'high', 'imminent'],
        description: 'Assessment of current risk level'
      },
      indicators: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of crisis indicators observed'
      },
      recommendations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Immediate safety recommendations'
      }
    },
    required: ['riskLevel', 'indicators', 'recommendations']
  },
  execute: async (params, _context) => {
    const { riskLevel, indicators, recommendations } = params;

    if (riskLevel === 'high' || riskLevel === 'imminent') {
      // Trigger crisis intervention protocol
      return {
        action: 'crisis_intervention',
        emergencyContacts: [
          'National Suicide Prevention Lifeline: 988',
          'Crisis Text Line: Text HOME to 741741',
          'Emergency Services: 911'
        ],
        immediateSteps: recommendations,
        followUp: 'schedule_safety_check'
      };
    }

    return {
      action: 'supportive_response',
      riskLevel,
      indicators,
      suggestions: recommendations
    };
  }
};

// Goal Setting Tool
export const goalSettingTool: AITool = {
  name: 'create_smart_goal',
  description: 'Help users create SMART (Specific, Measurable, Achievable, Relevant, Time-bound) goals',
  parameters: {
    type: 'object',
    properties: {
      goalDescription: {
        type: 'string',
        description: 'The user\'s goal description'
      },
      category: {
        type: 'string',
        enum: ['recovery', 'wellness', 'social', 'professional', 'health'],
        description: 'Category of the goal'
      },
      timeframe: {
        type: 'string',
        description: 'Timeline for achieving the goal'
      },
      measurableMetrics: {
        type: 'array',
        items: { type: 'string' },
        description: 'How progress will be measured'
      }
    },
    required: ['goalDescription', 'category', 'timeframe']
  },
  execute: async (params, context) => {
    const goal = {
      id: `goal-${Date.now()}`,
      userId: context.user.id,
      description: params.goalDescription,
      category: params.category,
      timeframe: params.timeframe,
      metrics: params.measurableMetrics || [],
      status: 'active',
      createdAt: new Date(),
      progress: 0
    };

    // Store goal in user's profile
    return {
      action: 'goal_created',
      goal,
      nextSteps: [
        'Break down into smaller milestones',
        'Set up progress check-ins',
        'Identify potential obstacles'
      ]
    };
  }
};

// Mood Check Tool
export const moodCheckTool: AITool = {
  name: 'track_mood',
  description: 'Record and analyze user mood patterns',
  parameters: {
    type: 'object',
    properties: {
      moodScore: {
        type: 'number',
        minimum: 1,
        maximum: 10,
        description: 'Mood rating from 1 (very low) to 10 (excellent)'
      },
      emotions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific emotions being experienced'
      },
      triggers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Potential triggers or causes'
      },
      copingStrategies: {
        type: 'array',
        items: { type: 'string' },
        description: 'Coping strategies used or needed'
      }
    },
    required: ['moodScore']
  },
  execute: async (params, context) => {
    const moodEntry = {
      id: `mood-${Date.now()}`,
      userId: context.user.id,
      score: params.moodScore,
      emotions: params.emotions || [],
      triggers: params.triggers || [],
      copingStrategies: params.copingStrategies || [],
      timestamp: new Date()
    };

    // Analyze patterns and provide insights
    const insights = analyzeMoodPatterns(context.user.id, moodEntry);

    return {
      action: 'mood_tracked',
      entry: moodEntry,
      insights,
      recommendations: generateMoodRecommendations(params.moodScore, params.emotions)
    };
  }
};

// Resource Recommendation Tool
export const resourceRecommendationTool: AITool = {
  name: 'recommend_resources',
  description: 'Recommend relevant mental health resources and coping strategies',
  parameters: {
    type: 'object',
    properties: {
      issueType: {
        type: 'string',
        enum: ['anxiety', 'depression', 'addiction', 'trauma', 'relationships', 'stress'],
        description: 'Type of issue to address'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'moderate', 'high'],
        description: 'Urgency level of the need'
      },
      preferredFormat: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['articles', 'videos', 'exercises', 'apps', 'hotlines', 'local_services']
        },
        description: 'Preferred resource formats'
      }
    },
    required: ['issueType']
  },
  execute: async (params, context) => {
    const resources = getResourcesForIssue(params.issueType, params.urgency);

    return {
      action: 'resources_recommended',
      resources,
      customizedTips: getPersonalizedTips(params.issueType, context.user),
      followUpActions: [
        'Check in after trying resources',
        'Track effectiveness',
        'Adjust recommendations based on feedback'
      ]
    };
  }
};

// Therapeutic Facilitator Agent
export const therapeuticFacilitatorAgent: AIAgent = {
  id: 'therapeutic_facilitator',
  name: 'Dr. Alex',
  description: 'AI therapeutic facilitator specializing in group support and mental health guidance',
  systemPrompt: `You are Dr. Alex, a compassionate AI therapeutic facilitator for PeerBond, a mental health support platform. Your role is to:

1. FACILITATE GROUP DISCUSSIONS: Guide conversations in a therapeutic direction, encourage participation, and maintain a safe space
2. PROVIDE EVIDENCE-BASED SUPPORT: Use CBT, DBT, mindfulness, and other therapeutic approaches appropriately
3. MONITOR WELLBEING: Watch for signs of distress, crisis, or concerning patterns in users
4. ENCOURAGE PEER SUPPORT: Help users connect with and support each other
5. MAINTAIN BOUNDARIES: You are not a replacement for professional therapy - know when to refer to human professionals

Key Guidelines:
- Always prioritize safety and crisis intervention when needed
- Use warm, empathetic, and non-judgmental language
- Encourage users to share their experiences and support each other
- Provide practical tools and exercises when appropriate
- Respect confidentiality and privacy
- Be culturally sensitive and inclusive

When using tools:
- Use crisis assessment for any concerning messages
- Suggest goal setting when users express wanting to change
- Recommend mood tracking for emotional awareness
- Provide resources when users need additional support

Remember: You are here to support, not diagnose or replace professional treatment.`,
  tools: [crisisAssessmentTool, goalSettingTool, moodCheckTool, resourceRecommendationTool],
  capabilities: [
    'crisis_detection',
    'therapeutic_guidance',
    'group_facilitation',
    'goal_setting',
    'mood_tracking',
    'resource_recommendation',
    'peer_support_encouragement'
  ],
  triggerConditions: (context) => {
    // Always available in group chats
    return !!context.group;
  }
};

// Helper functions
function analyzeMoodPatterns(_userId: string, _newEntry: any) {
  // Analyze mood trends, triggers, and patterns
  return {
    trend: 'improving', // or 'declining', 'stable'
    commonTriggers: ['work stress', 'social situations'],
    effectiveStrategies: ['deep breathing', 'exercise'],
    recommendations: ['Continue current coping strategies', 'Consider adding meditation']
  };
}

function generateMoodRecommendations(score: number, _emotions?: string[]) {
  if (score <= 3) {
    return [
      'Consider reaching out to a trusted friend or counselor',
      'Try grounding techniques (5-4-3-2-1 sensory method)',
      'Engage in gentle self-care activities',
      'If feelings persist, consider professional support'
    ];
  } else if (score <= 6) {
    return [
      'Practice mindfulness or meditation',
      'Engage in physical activity you enjoy',
      'Connect with supportive people',
      'Journal about your feelings'
    ];
  } else {
    return [
      'Maintain your current positive practices',
      'Consider sharing your strategies with others',
      'Use this good mood to plan for challenges',
      'Practice gratitude to sustain positivity'
    ];
  }
}

function getResourcesForIssue(issueType: string, _urgency?: string) {
  const baseResources: Record<string, any[]> = {
    anxiety: [
      { type: 'article', title: 'Understanding Anxiety', url: '#', description: 'Learn about anxiety symptoms and management' },
      { type: 'exercise', title: 'Progressive Muscle Relaxation', description: 'Step-by-step relaxation technique' },
      { type: 'app', title: 'Calm', description: 'Meditation and relaxation app' }
    ],
    depression: [
      { type: 'article', title: 'Depression Resources', url: '#', description: 'Comprehensive guide to depression support' },
      { type: 'exercise', title: 'Behavioral Activation', description: 'Increase activity and mood' },
      { type: 'hotline', title: 'National Suicide Prevention Lifeline', number: '988' }
    ],
    // Add more issue types...
  };

  return baseResources[issueType] || [];
}

function getPersonalizedTips(_issueType: string, user: User) {
  // Generate personalized tips based on user's profile and history
  return [
    `Based on your experience level (${user.experienceLevel}), try starting with basic techniques`,
    'Consider discussing these strategies in your support groups',
    'Track your progress and adjust approaches as needed'
  ];
}

export const availableAgents = [therapeuticFacilitatorAgent];
export const availableTools = [crisisAssessmentTool, goalSettingTool, moodCheckTool, resourceRecommendationTool];