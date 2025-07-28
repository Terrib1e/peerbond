/**
 * Maya Interface - Basic user interface for communicating with Maya AI
 * Provides essential mental health support functions for regular users
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
  RotateCcw
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
  type: 'user' | 'maya' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  quickActions?: string[];
}

interface MayaInterfaceProps {
  userId: string;
  className?: string;
  compact?: boolean;
}

const QUICK_ACTIONS = [
  {
    id: 'mood-check',
    label: 'How am I feeling?',
    icon: Activity,
    prompt: "Maya, I'd like to check in with how I'm feeling today. Can you help me explore my current emotional state?",
    category: 'self-reflection'
  },
  {
    id: 'coping-strategies',
    label: 'Need coping strategies',
    icon: Lightbulb,
    prompt: "I'm struggling right now and could use some healthy coping strategies. What techniques might help me?",
    category: 'support'
  },
  {
    id: 'find-support',
    label: 'Find peer support',
    icon: Users,
    prompt: "Maya, I'm looking for peer support groups or communities where I can connect with others who understand what I'm going through.",
    category: 'connection'
  },
  {
    id: 'progress-check',
    label: 'Check my progress',
    icon: Star,
    prompt: "Can you help me reflect on my mental health journey and see how I've been progressing lately?",
    category: 'insight'
  },
  {
    id: 'crisis-support',
    label: 'I need immediate help',
    icon: LifeBuoy,
    prompt: "I'm in crisis and need immediate support. Please help me find resources and coping strategies right now.",
    category: 'crisis'
  },
  {
    id: 'learn-more',
    label: 'Learn about mental health',
    icon: BookOpen,
    prompt: "I'd like to learn more about mental health topics and evidence-based strategies for wellbeing.",
    category: 'education'
  }
];

const CATEGORY_COLORS = {
  'self-reflection': 'bg-blue-50 text-blue-700 border-blue-200',
  'support': 'bg-green-50 text-green-700 border-green-200',
  'connection': 'bg-purple-50 text-purple-700 border-purple-200',
  'insight': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'crisis': 'bg-red-50 text-red-700 border-red-200',
  'education': 'bg-indigo-50 text-indigo-700 border-indigo-200'
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
  }
};

const getAgentDisplayName = (agentId: string): string => {
  return AGENT_CONFIG[agentId as keyof typeof AGENT_CONFIG]?.name || agentId;
};

const getAgentBadgeColor = (agentId: string): string => {
  return AGENT_CONFIG[agentId as keyof typeof AGENT_CONFIG]?.color || 'bg-gray-50 text-gray-700 border-gray-200';
};

export default function MayaInterface({ userId, className, compact = false }: MayaInterfaceProps) {
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showQuickActions, setShowQuickActions] = useState(!compact);
  const [mayaAvailable, setMayaAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSession();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      // Start a proper session with the orchestration service
      const response = await api.startOrchestrationSession('production', {
        userProfile: {
          interests: ['mental-health', 'peer-support'],
          experience: 'beginner',
          goals: ['emotional-support', 'coping-strategies']
        }
      });
      
      const newSessionId = response.sessionId;
      setSessionId(newSessionId);
      
      // Add welcome message (use server's welcome message if provided)
      const welcomeContent = response.welcomeMessage || 
        `Hello! I'm Maya, your AI therapeutic companion. I'm here to support you on your mental health journey.\n\nI can help you with:\n• Exploring your feelings and emotions\n• Finding healthy coping strategies\n• Connecting with peer support groups\n• Tracking your progress and insights\n• Providing crisis support resources\n• Learning about mental health\n\nHow can I support you today?`;
      
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
      
      // Add error message
      const errorMessage: MayaMessage = {
        id: `error-${Date.now()}`,
        content: `I'm having trouble connecting right now. Please try again in a moment. If the problem persists, you can still use the platform's other features.`,
        type: 'maya',
        timestamp: new Date(),
        agentUsed: ['system'],
        confidence: 0.0
      };

      setMessages([errorMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const userMessage: MayaMessage = {
      id: `user-${Date.now()}`,
      content,
      type: 'user',
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

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      let response: AgentCallResponse;
      
      // Check if user is asking about tools specifically
      const toolQuestionKeywords = ['tools', 'available', 'capabilities', 'functions', 'help me with', 'what can you'];
      const isToolQuestion = toolQuestionKeywords.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isToolQuestion && (content.toLowerCase().includes('tools') || content.toLowerCase().includes('available'))) {
        // Provide detailed tools information
        try {
          const agentsAndTools = await agentService.getAvailableAgentsAndTools();
          const toolsDescription = await agentService.getToolDescriptions();
          
          const toolsContent = `Here are the available tools and capabilities I can help you with:\n\n${toolsDescription}\n\n**How I work:**\n• I analyze your message and determine which agents are best suited to help\n• Multiple agents can work together on complex requests\n• Each agent has specialized tools for different types of support\n\n**You can ask me to:**\n• Provide emotional support and coping strategies\n• Help you find peer support groups\n• Analyze your mood and emotional patterns\n• Create action items and track progress\n• Provide crisis support resources\n• Generate insights about your mental health journey\n\nWhat specific type of support would you like help with today?`;
          
          response = {
            recommendation: 'facilitator',
            result: {
              success: true,
              response: toolsContent,
              agentUsed: ['system'],
              toolsUsed: ['getAvailableAgentsAndTools', 'getToolDescriptions'],
              confidence: 1.0,
              metadata: { isToolsExplanation: true }
            }
          };
        } catch (error) {
          console.error('Error fetching tools:', error);
          response = await agentService.callRecommendedAgent(content, sessionId);
        }
      } else {
        response = await agentService.callRecommendedAgent(content, sessionId);
      }
      
      // Remove loading message and add Maya's response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const mayaResponse: MayaMessage = {
          id: `maya-${Date.now()}`,
          content: response.result.response,
          type: 'maya',
          timestamp: new Date(),
          agentUsed: Array.isArray(response.result.agentUsed) 
            ? response.result.agentUsed 
            : [response.result.agentUsed],
          confidence: response.result.confidence,
          quickActions: generateQuickActions(response.result.response, response.result.agentUsed)
        };
        return [...filtered, mayaResponse];
      });

      // Handle crisis intervention if needed
      if (response.result.metadata?.needsCrisisIntervention) {
        toast.error('Crisis support resources have been provided. Please reach out for immediate help if needed.', {
          duration: 10000,
          icon: '🚨'
        });
      }

    } catch (error) {
      console.error('Maya communication error:', error);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const errorMessage: MayaMessage = {
          id: `error-${Date.now()}`,
          content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or if this is urgent, please contact a crisis hotline immediately.',
          type: 'system',
          timestamp: new Date()
        };
        return [...filtered, errorMessage];
      });

      toast.error('Unable to connect to Maya. Please try again.');
      setMayaAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
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

    // Suggest follow-up actions based on response content and agents used
    if (agents.includes('crisis')) {
      actions.push('find-support');
    } else if (agents.includes('matching')) {
      actions.push('progress-check');
    } else if (agents.includes('insight')) {
      actions.push('coping-strategies');
    } else if (responseLower.includes('feeling') || responseLower.includes('emotion')) {
      actions.push('mood-check', 'coping-strategies');
    } else {
      actions.push('find-support', 'learn-more');
    }

    return actions.slice(0, 3); // Limit to 3 quick actions
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
          'flex gap-3 mb-4',
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
          message.type === 'user' 
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
                        CATEGORY_COLORS[action.category]
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

        {message.type === 'user' && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {userId.charAt(0).toUpperCase()}
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
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
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

      {/* Quick Actions Panel */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {QUICK_ACTIONS.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action.id)}
                      disabled={isLoading || !mayaAvailable}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-lg text-left transition-colors',
                        'hover:bg-white hover:shadow-sm disabled:opacity-50',
                        CATEGORY_COLORS[action.category]
                      )}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Heart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Maya</h3>
              <p className="text-gray-600">Start a conversation to begin your support session</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
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