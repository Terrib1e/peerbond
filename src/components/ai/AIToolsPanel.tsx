import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Shield, 
  Activity, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  Code,
  Database,
  Settings
} from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

interface AIToolsPanelProps {
  groupId: string;
}

interface ToolSchema {
  name: string;
  description: string;
  agent: string;
  parameterCount: number;
}

interface AgentTools {
  agent: string;
  tools: ToolSchema[];
}

const AGENT_CONFIGS = {
  'ai-router': {
    name: 'AI Router',
    description: 'Intelligent message routing and intent analysis',
    icon: Brain,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  'facilitator': {
    name: 'Maya (Facilitator)',
    description: 'Therapeutic support and emotional validation',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'sentiment': {
    name: 'Sentiment Analyzer',
    description: 'Emotional analysis and mood tracking',
    icon: Activity,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  'crisis': {
    name: 'Crisis Intervention',
    description: 'Emergency detection and safety protocols',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  'matching': {
    name: 'Group Matching',
    description: 'Peer group recommendations',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  'insight': {
    name: 'Progress Insights',
    description: 'Growth tracking and analytics',
    icon: TrendingUp,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  }
} as const;

export default function AIToolsPanel({ groupId: _groupId }: AIToolsPanelProps) {
  const { user } = useAuthStore();
  const [toolSchemas, setToolSchemas] = useState<AgentTools[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadToolSchemas();
  }, []);

  const loadToolSchemas = async () => {
    if (!user) {
      console.log('No user found, skipping tool schema load');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Loading tool schemas for user:', user.email);
      
      const response = await api.makeRequest<{
        success: boolean;
        data: {
          totalAgents: number;
          totalTools: number;
          schemas: AgentTools[];
        };
      }>('/tools/schemas');
      
      console.log('Tool schemas response:', response);
      
      if (response.success) {
        setToolSchemas(response.data.schemas);
        console.log('Loaded', response.data.schemas.length, 'agent schemas');
      }
    } catch (error) {
      console.error('Failed to load tool schemas:', error);
      // For debugging, let's also try to show what user info we have
      console.log('Current user:', user);
      console.log('Auth store state:', { user });
    } finally {
      setLoading(false);
    }
  };

  const testTool = async (toolName: string, agent: string) => {
    try {
      // Simple test parameters for different tools
      const testParameters = {
        'analyzeLLMIntent': {
          message: "I'm feeling really anxious about my upcoming presentation",
          conversationHistory: [],
          groupContext: { groupType: 'wellness', memberCount: 5, recentActivity: 'moderate' }
        },
        'provideSupportiveResponse': {
          userMessage: "I've been struggling with anxiety lately",
          emotionalState: "distressed",
          therapeuticApproach: "validation",
          sessionContext: {
            isFirstMessage: false,
            previousTopics: [],
            userGoals: []
          }
        },
        'validateFeelings': {
          emotionExpressed: "anxiety",
          intensityLevel: 7,
          context: "Feeling nervous about an upcoming presentation",
          validationType: "normalize"
        },
        'suggestCopingStrategies': {
          stressors: ["work pressure", "social anxiety"],
          userStrengths: ["self-awareness", "seeking help"],
          preferredApproaches: ["cognitive", "physical"],
          urgencyLevel: "active_coping"
        },
        'analyzeSentiment': {
          text: "I feel overwhelmed and don't know what to do",
          contextualFactors: {}
        },
        'detectCrisis': {
          message: "I feel like giving up today",
          userHistory: [],
          contextualCues: {}
        },
        'provideCrisisSupport': {
          crisisType: "emotional_overwhelm",
          severityLevel: "moderate",
          immediateNeeds: ["emotional support", "safety planning"],
          availableSupports: ["friends", "family"]
        },
        'escalateToHuman': {
          urgencyLevel: "priority",
          crisisDetails: "User expressing suicidal ideation",
          userConsent: true,
          locationInfo: "United States"
        },
        // Matching Agent Tools
        'searchGroups': {
          userGoals: ["anxiety management", "peer support"],
          experienceLevel: "intermediate",
          preferredGroupSize: "medium",
          supportType: "wellness",
          location: "United States"
        },
        'rankGroupsByRelevance': {
          userId: "test-user",
          candidateGroups: ["grp_001", "grp_002", "grp_003"],
          userProfile: {
            goals: ["anxiety management"],
            interests: ["mindfulness", "coping strategies"],
            challengesAreas: ["work stress", "social anxiety"],
            communicationStyle: "moderate"
          }
        },
        'generateGroupRecommendations': {
          userId: "test-user",
          currentGroups: [],
          recommendationContext: "initial_signup",
          maxRecommendations: 3,
          includeExplanations: true
        },
        // Insight Agent Tools
        'analyzeUserProgress': {
          userId: "test-user",
          timeframe: "month",
          metrics: ["mood", "engagement", "goal_progress"],
          includeComparisons: true
        },
        'generateProgressInsights': {
          userId: "test-user",
          groupId: "grp_001",
          focusAreas: ["emotional_regulation", "social_skills"],
          insightType: "personal_growth",
          audienceType: "self_reflection"
        },
        'identifyPatterns': {
          userId: "test-user",
          dataTypes: ["messages", "mood_logs", "participation"],
          patternTypes: ["temporal", "emotional", "behavioral"],
          lookbackPeriod: 30,
          minimumConfidence: 0.7
        }
      };

      const params = testParameters[toolName as keyof typeof testParameters] || { 
        message: "Test message for " + toolName 
      };

      const response = await api.makeRequest<{
        success: boolean;
        data: any;
      }>('/tools/test', {
        method: 'POST',
        body: JSON.stringify({
          toolName,
          agent,
          parameters: params
        })
      });

      setTestResults(response.data);
    } catch (error) {
      console.error('Tool test failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="w-6 h-6 animate-spin text-gray-400 mr-2" />
        <span className="text-gray-600">Loading AI tools...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🔧 AI Tool System</h2>
        <p className="text-gray-600 mb-4">
          Formal tool schemas with validation, audit logging, and deterministic operations
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Code className="w-4 h-4" />
            <span>{toolSchemas.reduce((sum, agent) => sum + agent.tools.length, 0)} Tools</span>
          </div>
          <div className="flex items-center gap-1">
            <Database className="w-4 h-4" />
            <span>{toolSchemas.length} Agents</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Production Ready</span>
          </div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {toolSchemas.map((agentData) => {
          const config = AGENT_CONFIGS[agentData.agent as keyof typeof AGENT_CONFIGS];
          if (!config || agentData.tools.length === 0) return null;

          const Icon = config.icon;
          const isSelected = selectedAgent === agentData.agent;

          return (
            <motion.div
              key={agentData.agent}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className={cn(
                  'p-4 cursor-pointer transition-all duration-200 hover:shadow-md',
                  isSelected ? config.borderColor + ' border-2 ' + config.bgColor : 'border-gray-200',
                  'hover:' + config.bgColor
                )}
                onClick={() => setSelectedAgent(isSelected ? null : agentData.agent)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    config.bgColor,
                    config.borderColor,
                    'border'
                  )}>
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {config.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {config.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {agentData.tools.length} {agentData.tools.length === 1 ? 'Tool' : 'Tools'}
                      </span>
                      <Zap className="w-3 h-3 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Expanded Tool List */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">Available Tools:</h4>
                    <div className="space-y-2">
                      {agentData.tools.map((tool) => (
                        <div 
                          key={tool.name}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {tool.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {tool.description}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              testTool(tool.name, tool.agent);
                            }}
                            className="text-xs"
                          >
                            <Settings className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Test Results */}
      {testResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              🧪 Tool Test Results
            </h3>
            <div className="bg-gray-50 p-3 rounded text-sm">
              <div className="mb-2">
                <strong>Tool:</strong> {testResults.toolName} 
                <span className="text-gray-600 ml-2">({testResults.agent})</span>
              </div>
              <div className="mb-2">
                <strong>Success:</strong> 
                <span className={cn(
                  'ml-1',
                  testResults.result?.success ? 'text-green-600' : 'text-red-600'
                )}>
                  {testResults.result?.success ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              {testResults.result?.confidence && (
                <div className="mb-2">
                  <strong>Confidence:</strong> {Math.round(testResults.result.confidence * 100)}%
                </div>
              )}
              {testResults.result?.data && (
                <div>
                  <strong>Result:</strong>
                  <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                    {JSON.stringify(testResults.result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTestResults(null)}
              className="mt-2"
            >
              Clear Results
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          All tools use formal JSON schemas with validation, audit logging, and error handling.
          <br />
          This ensures deterministic operations and HIPAA-compliant auditability.
        </p>
      </div>
    </div>
  );
}