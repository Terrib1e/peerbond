/**
 * Maya Interface - Basic member interface for communicating with Maya AI
 * Provides essential mental health support functions for community members
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Send,
  Bot,
  MessageSquare,
  Activity,
  Users,
  BookOpen,
  LifeBuoy,
  Lightbulb,
  Clock,
  ChevronDown,
  Star,
  Shield,
  RotateCcw,
  RefreshCw,
  BarChart3,
  Mic,
  Zap
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

import { agentService, AgentCallResponse } from '@/services/agentService';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface MayaMessage {
  id: string;
  content: string;
  type: 'member' | 'maya' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  quickActions?: string[];
  metadata?: {
    toolsUsed?: string[];
    toolContext?: any;
    isToolsExplanation?: boolean;
    needsCrisisIntervention?: boolean;
  };
}

interface MayaInterfaceProps {
  memberId: string;
  className?: string;
  compact?: boolean;
}

const QUICK_ACTIONS = [
  // Core Emotional Support
  {
    id: 'mood-check',
    label: 'Log my mood',
    icon: Activity,
    prompt: "Maya, I'd like to log how I'm feeling right now. Can you help me track my mood and any triggers I'm experiencing?",
    category: 'self-reflection',
    toolSuggestion: 'logMood'
  },
  {
    id: 'coping-strategies',
    label: 'Get coping strategies',
    icon: Lightbulb,
    prompt: "I'm struggling right now and could use some personalized coping strategies. What techniques might help me based on my situation?",
    category: 'support',
    toolSuggestion: 'suggestCopingStrategies'
  },

  // Progress & Analytics
  {
    id: 'progress-check',
    label: 'Check my progress',
    icon: Star,
    prompt: "Can you analyze my progress and show me insights about my mental health journey over the past few weeks?",
    category: 'insight',
    toolSuggestion: 'analyzeUserProgress'
  },
  {
    id: 'mood-report',
    label: 'Generate mood report',
    icon: BarChart3,
    prompt: "Maya, can you create a detailed mood report showing my emotional patterns and trends?",
    category: 'insight',
    toolSuggestion: 'generateMoodReport'
  },

  // Social Connection
  {
    id: 'find-support',
    label: 'Find peer groups',
    icon: Users,
    prompt: "I'm looking for peer support groups that match my needs and interests. Can you help me find the right community?",
    category: 'connection',
    toolSuggestion: 'searchGroups'
  },

  // Learning & Resources
  {
    id: 'learn-resources',
    label: 'Find resources',
    icon: BookOpen,
    prompt: "I want to learn more about managing my mental health. Can you recommend some educational resources and exercises?",
    category: 'education',
    toolSuggestion: 'searchResources'
  },
  {
    id: 'therapeutic-content',
    label: 'Get exercises',
    icon: Heart,
    prompt: "Maya, can you provide me with a therapeutic exercise or technique I can practice right now?",
    category: 'education',
    toolSuggestion: 'getTherapeuticContent'
  },

  // Action & Planning
  {
    id: 'create-goals',
    label: 'Set wellness goals',
    icon: Star,
    prompt: "Help me create some actionable wellness goals and track my progress toward achieving them.",
    category: 'planning',
    toolSuggestion: 'createActionItem'
  },
  {
    id: 'check-goals',
    label: 'Review my goals',
    icon: Clock,
    prompt: "Can you show me my current wellness goals and help me update my progress?",
    category: 'planning',
    toolSuggestion: 'getActionItems'
  },

  // Crisis Support
  {
    id: 'crisis-support',
    label: 'I need immediate help',
    icon: LifeBuoy,
    prompt: "I'm in crisis and need immediate support. Please help me find resources and coping strategies right now.",
    category: 'crisis',
    toolSuggestion: 'provideCrisisSupport'
  },

  // Voice & Accessibility
  {
    id: 'voice-check',
    label: 'Voice mood check',
    icon: Mic,
    prompt: "I'd like to record a voice note about how I'm feeling and get emotional insights from it.",
    category: 'self-reflection',
    toolSuggestion: 'transcribeVoiceNote'
  },

  // System Actions
  {
    id: 'retry-connection',
    label: 'Reconnect to Maya',
    icon: RefreshCw,
    prompt: '',
    category: 'system'
  }
];

const CATEGORY_COLORS = {
  'self-reflection': 'bg-blue-50 text-blue-700 border-blue-200',
  'support': 'bg-green-50 text-green-700 border-green-200',
  'connection': 'bg-purple-50 text-purple-700 border-purple-200',
  'insight': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'crisis': 'bg-red-50 text-red-700 border-red-200',
  'education': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'planning': 'bg-orange-50 text-orange-700 border-orange-200',
  'system': 'bg-gray-50 text-gray-700 border-gray-200'
};

// Agent display configuration
const AGENT_CONFIG = {
  'facilitator': {
    name: 'Facilitator',
    description: 'General therapeutic support',
    color: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  'crisis': {
    name: 'Crisis Support',
    description: 'Emergency intervention',
    color: 'bg-red-50 text-red-700 border-red-200'
  },
  'sentiment': {
    name: 'Sentiment',
    description: 'Emotion analysis',
    color: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  'matching': {
    name: 'Matching',
    description: 'Peer connections',
    color: 'bg-green-50 text-green-700 border-green-200'
  },
  'insight': {
    name: 'Insight',
    description: 'Progress tracking',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200'
  },
  'ai-router': {
    name: 'AI Router',
    description: 'Request routing',
    color: 'bg-gray-50 text-gray-700 border-gray-200'
  },
  'system': {
    name: 'System',
    description: 'Platform information',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  'chat': {
    name: 'Chat Manager',
    description: 'Message organization',
    color: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  'tracker': {
    name: 'Mood Tracker',
    description: 'Emotional monitoring',
    color: 'bg-pink-50 text-pink-700 border-pink-200'
  },
  'action-items': {
    name: 'Goal Tracker',
    description: 'Wellness planning',
    color: 'bg-orange-50 text-orange-700 border-orange-200'
  },
  'analytics': {
    name: 'Analytics',
    description: 'Progress reports',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  'voice': {
    name: 'Voice Processing',
    description: 'Speech analysis',
    color: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  'orchestration': {
    name: 'Coordinator',
    description: 'Multi-agent tasks',
    color: 'bg-slate-50 text-slate-700 border-slate-200'
  },
  'personalization': {
    name: 'Personal Assistant',
    description: 'Tailored support',
    color: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  'safety': {
    name: 'Safety Monitor',
    description: 'Content protection',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  'knowledge': {
    name: 'Knowledge Base',
    description: 'Resource library',
    color: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  'context': {
    name: 'Memory Manager',
    description: 'Conversation continuity',
    color: 'bg-lime-50 text-lime-700 border-lime-200'
  }
};

const getAgentDisplayName = (agentId: string): string => {
  return AGENT_CONFIG[agentId as keyof typeof AGENT_CONFIG]?.name || agentId;
};

const getAgentBadgeColor = (agentId: string): string => {
  return AGENT_CONFIG[agentId as keyof typeof AGENT_CONFIG]?.color || 'bg-gray-50 text-gray-700 border-gray-200';
};

export default function MayaInterface({ memberId, className, compact = false }: MayaInterfaceProps) {
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showQuickActions, setShowQuickActions] = useState(!compact);
  const [mayaAvailable, setMayaAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSession();
  }, [memberId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      // Start a proper session with the orchestration service
      const response = await api.startOrchestrationSession('production', {
        memberProfile: {
          interests: ['mental-health', 'peer-support'],
          experience: 'beginner',
          goals: ['emotional-support', 'coping-strategies']
        }
      });

      const newSessionId = response.sessionId;
      setSessionId(newSessionId);

      // Add welcome message (use server's welcome message if provided)
      const welcomeContent = response.welcomeMessage ||
        `Hello! I'm Maya, your AI therapeutic companion. I'm here to support you on your mental health journey.\n\n## 🎯 **What's New - Full Tool Integration!**\nI now have access to 16 specialized AI agents with 48+ tools to provide comprehensive support:\n\n**✨ Try these quick actions:**\n• **"Log my mood today"** - Track emotional patterns\n• **"Check my progress"** - Get personalized insights  \n• **"Find peer support groups"** - Connect with your community\n• **"Set a wellness goal"** - Create actionable objectives\n• **"Give me a mindfulness exercise"** - Practice therapeutic techniques\n• **"Generate my mood report"** - Visualize your journey\n\n**🤖 Behind the scenes:** I coordinate with specialized agents for mood tracking, progress analytics, crisis support, group matching, personalized resources, and more!\n\n**💡 Tip:** Use the "Quick Actions" panel above for easy access to tools, or just tell me what you need in natural language.\n\nHow can I support you today?`;

      const welcomeMessage: MayaMessage = {
        id: `welcome-${Date.now()}`,
        content: welcomeContent,
        type: 'maya',
        timestamp: new Date(),
        agentUsed: ['facilitator'],
        confidence: 1.0,
        quickActions: ['mood-check', 'find-support', 'coping-strategies']
      };

      setMessages([welcomeMessage]);
      setMayaAvailable(true);

    } catch (error) {
      console.error('Failed to initialize Maya session:', error);
      setMayaAvailable(false);

      // Provide member-friendly error messages based on error type
      let errorContent = `I'm having trouble connecting right now. Please try again in a moment.`;

      if (error instanceof Error) {
        if (error.message.includes('Authentication')) {
          errorContent = `🔐 Please sign in to PeerBond to access Maya AI.`;
        } else if (error.message.includes('Network')) {
          errorContent = `🌐 Network connection issue. Please check your internet connection and try again.`;
        } else if (error.message.includes('unavailable')) {
          errorContent = `⚠️ Maya AI service is temporarily unavailable. Please try again in a few minutes.`;
        } else if (error.message.includes('Rate limit')) {
          errorContent = `⏱️ Too many requests. Please wait a moment before trying again.`;
        }
      }

      // Add error message
      const errorMessage: MayaMessage = {
        id: `error-${Date.now()}`,
        content: errorContent,
        type: 'maya',
        timestamp: new Date(),
        agentUsed: ['system'],
        confidence: 0.0,
        quickActions: ['retry-connection']
      };

      setMessages([errorMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  };

  const handleNewChat = () => {
    // Clear messages and reinitialize session
    setMessages([]);
    setSessionId('');
    initializeSession();
    toast.success('Started a new conversation with Maya');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !sessionId) return;

    const memberMessage: MayaMessage = {
      id: `member-${Date.now()}`,
      content,
      type: 'member',
      timestamp: new Date()
    };

    // Get recommended agents to show in loading message
    const recommendedAgents = agentService.getAgentRecommendations(content);
    const agentNames = recommendedAgents.map(id => getAgentDisplayName(id)).join(', ');

    const loadingMessage: MayaMessage = {
      id: `loading-${Date.now()}`,
      content: `Maya is consulting ${agentNames}...`,
      type: 'maya',
      timestamp: new Date(),
      isLoading: true,
      agentUsed: recommendedAgents,
      confidence: 0
    };

    setMessages(prev => [...prev, memberMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response: AgentCallResponse;

      // Simplified: Just use the agent service for all requests
      const agentResponse = await agentService.callRecommendedAgent(content, sessionId);
      response = agentResponse.result;

      // Remove loading message and add Maya's response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const mayaResponse: MayaMessage = {
          id: `maya-${Date.now()}`,
          content: response.response,
          type: 'maya',
          timestamp: new Date(),
          agentUsed: Array.isArray(response.agentUsed)
            ? response.agentUsed
            : [response.agentUsed],
          confidence: response.confidence,
          quickActions: generateQuickActions(response.response, response.agentUsed)
        };
        return [...filtered, mayaResponse];
      });

      // Handle crisis intervention if needed
      if (response.metadata?.needsCrisisIntervention) {
        toast.error('Crisis support resources have been provided. Please reach out for immediate help if needed.', {
          duration: 10000,
          icon: '🚨'
        });
      }

    } catch (error) {
      console.error('Maya communication error:', error);

      // Provide specific error messages based on error type
      let errorContent = 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
      let showCrisisMessage = false;

      if (error instanceof Error) {
        if (error.message.includes('Authentication')) {
          errorContent = '🔐 Your session has expired. Please refresh the page and sign in again to continue our conversation.';
        } else if (error.message.includes('Rate limit')) {
          errorContent = '⏱️ I\'m receiving too many requests right now. Please wait a moment before sending another message.';
        } else if (error.message.includes('Network')) {
          errorContent = '🌐 There seems to be a network connection issue. Please check your internet connection and try again.';
        } else if (error.message.includes('unavailable')) {
          errorContent = '⚠️ My AI services are temporarily unavailable. Please try again in a few minutes.';
          showCrisisMessage = true;
        } else if (error.message.includes('permission')) {
          errorContent = '🚫 You may not have permission to access this feature. Please contact support if you believe this is an error.';
        }
      }

      // Add crisis contact info for serious errors
      if (showCrisisMessage) {
        errorContent += '\n\n🆘 **If this is urgent:** Please contact a crisis hotline immediately:\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741';
      }

      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const errorMessage: MayaMessage = {
          id: `error-${Date.now()}`,
          content: errorContent,
          type: 'system',
          timestamp: new Date(),
          quickActions: showCrisisMessage ? ['find-support', 'retry-connection'] : ['retry-connection']
        };
        return [...filtered, errorMessage];
      });

      // Show appropriate toast message
      if (error instanceof Error && error.message.includes('Authentication')) {
        toast.error('Session expired. Please refresh and sign in again.');
      } else if (error instanceof Error && error.message.includes('Rate limit')) {
        toast.error('Please wait a moment before sending another message.');
      } else {
        toast.error('Unable to connect to Maya. Please try again.');
      }

      // Only mark Maya as unavailable for serious errors
      if (showCrisisMessage) {
        setMayaAvailable(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'retry-connection') {
      // Retry connection
      setMessages([]);
      setSessionId('');
      setMayaAvailable(true);
      initializeSession();
      toast.success('Reconnecting to Maya...');
      return;
    }

    const action = QUICK_ACTIONS.find(a => a.id === actionId);
    if (action) {
      sendMessage(action.prompt);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const generateQuickActions = (response: string, agentsUsed: string | string[]): string[] => {
    const agents = Array.isArray(agentsUsed) ? agentsUsed : [agentsUsed];
    const responseLower = response.toLowerCase();
    const actions: string[] = [];

    // Intelligent follow-up suggestions based on agents used and content
    if (agents.includes('crisis')) {
      actions.push('find-support', 'learn-resources', 'crisis-support');
    } else if (agents.includes('tracker')) {
      actions.push('mood-report', 'progress-check', 'coping-strategies');
    } else if (agents.includes('matching')) {
      actions.push('create-goals', 'therapeutic-content', 'progress-check');
    } else if (agents.includes('insight') || agents.includes('analytics')) {
      actions.push('create-goals', 'mood-check', 'find-support');
    } else if (agents.includes('knowledge')) {
      actions.push('therapeutic-content', 'create-goals', 'mood-check');
    } else if (agents.includes('action-items')) {
      actions.push('check-goals', 'progress-check', 'therapeutic-content');
    } else if (agents.includes('voice')) {
      actions.push('mood-check', 'therapeutic-content', 'progress-check');
    } else if (agents.includes('personalization')) {
      actions.push('create-goals', 'learn-resources', 'mood-check');
    } else if (agents.includes('facilitator')) {
      // For general therapeutic support, suggest varied follow-ups
      if (responseLower.includes('feeling') || responseLower.includes('emotion')) {
        actions.push('mood-check', 'coping-strategies', 'therapeutic-content');
      } else if (responseLower.includes('goal') || responseLower.includes('progress')) {
        actions.push('create-goals', 'check-goals', 'progress-check');
      } else if (responseLower.includes('group') || responseLower.includes('community')) {
        actions.push('find-support', 'progress-check', 'mood-check');
      } else {
        actions.push('mood-check', 'find-support', 'learn-resources');
      }
    } else {
      // Default suggestions for system messages or unclear contexts
      actions.push('mood-check', 'find-support', 'learn-resources');
    }

    // Ensure variety and remove duplicates
    const uniqueActions = [...new Set(actions)];
    return uniqueActions.slice(0, 3); // Limit to 3 quick actions
  };

  const renderMessage = (message: MayaMessage) => {
    const isMaya = message.type === 'maya';
    const isSystem = message.type === 'system';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3',
          isMaya || isSystem ? 'justify-start' : 'justify-end'
        )}
      >
        {(isMaya || isSystem) && (
          <div className="flex-shrink-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isSystem ? 'bg-gray-100' : 'bg-gradient-to-r from-purple-500 to-pink-500'
            )}>
              {isSystem ? (
                <Shield className="w-4 h-4 text-gray-600" />
              ) : (
                <Heart className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        )}

        <div className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          message.type === 'member'
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            : 'bg-gray-50 text-gray-900 border border-gray-200'
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm text-purple-600">Maya is consulting agents...</span>
            </div>
          ) : (
            <>
              {/* Agent indicators for Maya messages */}
              {message.agentUsed && message.agentUsed.length > 0 && (isMaya || isSystem) && (
                <div className="mb-3 pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <Bot className="w-3 h-3" />
                    <span>Agents consulted:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {message.agentUsed.map((agent, index) => (
                      <span
                        key={index}
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          getAgentBadgeColor(agent)
                        )}
                      >
                        {getAgentDisplayName(agent)}
                      </span>
                    ))}
                  </div>
                  {message.confidence && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <span>Confidence:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              message.confidence >= 0.8 ? 'bg-green-500' :
                              message.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${message.confidence * 100}%` }}
                          />
                        </div>
                        <span>{Math.round(message.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}

                  {/* Tools indicator */}
                  {message.metadata?.toolsUsed && message.metadata.toolsUsed.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <Zap className="w-3 h-3" />
                      <span>Tools used:</span>
                      <div className="flex flex-wrap gap-1">
                        {message.metadata.toolsUsed.map((tool, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <div className="mb-2">{children}</div>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic">{children}</blockquote>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </>
          )}

          {/* Message metadata */}
          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
            <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
          </div>

          {/* Quick actions for Maya messages */}
          {message.quickActions && message.quickActions.length > 0 && !isLoading && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600 mb-2">Quick actions:</div>
              <div className="flex flex-wrap gap-2">
                {message.quickActions.map(actionId => {
                  const action = QUICK_ACTIONS.find(a => a.id === actionId);
                  if (!action) return null;

                  return (
                    <button
                      key={actionId}
                      onClick={() => handleQuickAction(actionId)}
                      disabled={isLoading}
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium border transition-colors',
                        'hover:bg-opacity-80 disabled:opacity-50',
                        CATEGORY_COLORS[action.category as keyof typeof CATEGORY_COLORS]
                      )}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {message.type === 'member' && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {memberId.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  if (compact) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">Maya Support</h3>
          <div className={cn(
            'w-2 h-2 rounded-full',
            mayaAvailable ? 'bg-green-500' : 'bg-gray-300'
          )} />
        </div>

        <form onSubmit={handleInputSubmit} className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask Maya for support..."
            disabled={isLoading || !mayaAvailable}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !mayaAvailable}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Maya - AI Therapeutic Companion</h2>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                mayaAvailable ? 'bg-green-500' : 'bg-gray-300'
              )} />
              {mayaAvailable ? 'Available to help' : 'Reconnecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="text-gray-600 hover:text-gray-900"
            title="Start new conversation"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="text-gray-600"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Quick Actions
            <ChevronDown className={cn(
              'w-4 h-4 ml-1 transition-transform',
              showQuickActions && 'rotate-180'
            )} />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Heart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Maya</h3>
              <p className="text-gray-600">Start a conversation to begin your support session</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 border-t border-b bg-gray-50"
          >
            <div className="max-h-48 overflow-y-auto">
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {QUICK_ACTIONS.map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action.id)}
                        disabled={isLoading || !mayaAvailable}
                        className={cn(
                          'flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors',
                          'hover:bg-white hover:shadow-sm disabled:opacity-50',
                          CATEGORY_COLORS[action.category as keyof typeof CATEGORY_COLORS]
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs font-medium">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-white p-4">
        <form onSubmit={handleInputSubmit} className="flex gap-3">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isLoading ? "Maya is responding..." : "Share what's on your mind..."}
            disabled={isLoading || !mayaAvailable}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !mayaAvailable}
            className="bg-purple-500 hover:bg-purple-600"
          >
            {isLoading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Maya provides therapeutic support but is not a replacement for professional mental health care
        </div>
      </div>
    </div>
  );
}