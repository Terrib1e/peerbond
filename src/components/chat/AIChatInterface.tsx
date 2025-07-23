import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Heart, AlertCircle, Settings, Brain, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';

import { api, OrchestrationSystem } from '@/lib/api';
import { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface AIChatMessage {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  needsCrisisIntervention?: boolean;
  confidence?: number;
  isLoading?: boolean;
}

interface AIChatInterfaceProps {
  currentUser: User;
  groupId?: string;
  className?: string;
}

const ORCHESTRATION_SYSTEMS = {
  working: {
    name: 'Working AI Agents',
    icon: Brain,
    description: 'Full agent visibility with tools',
    color: 'text-green-500'
  },
  simple: {
    name: 'Simple AI',
    icon: Zap,
    description: 'Quick, lightweight responses',
    color: 'text-blue-500'
  },
  production: {
    name: 'Production AI',
    icon: Brain,
    description: 'Complete multi-agent system',
    color: 'text-purple-500'
  },
  main: {
    name: 'Advanced AI (Under Maintenance)',
    icon: Bot,
    description: 'Currently unavailable',
    color: 'text-gray-400'
  }
};

export default function AIChatInterface({ currentUser, groupId, className }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<OrchestrationSystem>('production');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      // Check if user is authenticated before starting orchestration
      if (!currentUser || !api.isAuthenticated()) {
        console.warn('❌ Cannot start orchestration: User not authenticated');
        throw new Error('Please log in to start AI session');
      }

      console.log('🚀 Starting orchestration session for user:', currentUser.email);

      const session = await api.startOrchestrationSession('production', {
        groupId: groupId,
        userProfile: {
          interests: ['peer-support', 'mental-health'],
          experience: currentUser.experienceLevel || 'beginner',
          goals: currentUser.recoveryGoals ? (typeof currentUser.recoveryGoals === 'string' ? JSON.parse(currentUser.recoveryGoals) : currentUser.recoveryGoals) : ['emotional_healing', 'stress_management']
        }
      });

      setSessionId(session.sessionId);

      if (session.welcomeMessage) {
        const welcomeMsg: AIChatMessage = {
          id: `welcome-${Date.now()}`,
          content: session.welcomeMessage,
          type: 'ai',
          timestamp: new Date(),
          agentUsed: ['FacilitatorAgent']
        };
        setMessages([welcomeMsg]);
      }

      console.log('AI session initialized:', session.sessionId);
    } catch (error) {
      console.error('Failed to initialize AI session:', error);

      if (error instanceof Error && error.message.includes('log in')) {
        toast.error('Please log in to start AI session', {
          duration: 5000,
          position: 'top-center'
        });
      } else {
        toast.error('Failed to start AI session. Please try again.');
      }
    }
  };

  useEffect(() => {
    initializeSession();
  }, [selectedSystem]);

  const sendMessage = async (e: React.FormEvent) => {
    console.log('🚀 sendMessage triggered');
    e.preventDefault();

    console.log('📝 Input value:', messageInput);
    console.log('⏳ Current loading state:', isLoading);

    if (!messageInput.trim() || isLoading) {
      console.log('❌ Exiting early - empty input or already loading');
      return;
    }

    const content = messageInput.trim();
    console.log('✅ Processing message:', content);

    setMessageInput('');
    setIsLoading(true);
    console.log('🔄 Set loading state to true');

    // Add user message
    const userMessage: AIChatMessage = {
      id: `user-${Date.now()}`,
      content,
      type: 'user',
      timestamp: new Date()
    };

    // Add loading AI message
    const loadingMessage: AIChatMessage = {
      id: `ai-loading-${Date.now()}`,
      content: 'Thinking...',
      type: 'ai',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);

    try {
      // Use proper orchestration now that it's fixed
      console.log('Using orchestration system for AI response');

      // Start a session if we don't have one
      let currentSessionId: string = sessionId || '';
      if (!currentSessionId) {
        console.log('Starting new orchestration session...');
        try {
          const sessionResponse = await api.startOrchestrationSession('production');
          console.log('Session response:', sessionResponse);
          if (sessionResponse.sessionId) {
            currentSessionId = sessionResponse.sessionId;
            setSessionId(currentSessionId);
          } else {
            throw new Error('Failed to start orchestration session');
          }
        } catch (sessionError) {
          console.error('Session creation error:', sessionError);
          throw new Error(`Session creation failed: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
        }
      }

      console.log('📤 About to send message with sessionId:', currentSessionId);
      console.log('📤 Message payload:', {
        content,
        sessionId: currentSessionId,
        groupId: 'ai-chat',
        messageType: 'user'
      });

      console.log('🌐 Making API call to sendOrchestrationMessage...');
      const response = await api.sendOrchestrationMessage({
        content,
        sessionId: currentSessionId,
        groupId: 'ai-chat',
        messageType: 'user'
      }, 'production'); // Use production orchestration

      console.log('✅ Got orchestration response:', response);

      if (response.success) {
        const aiMessage: AIChatMessage = {
          id: `ai-${Date.now()}`,
          content: response.data.response,
          type: 'ai',
          timestamp: new Date(),
          agentUsed: response.data.agentUsed,
          needsCrisisIntervention: response.data.needsCrisisIntervention,
          confidence: response.data.confidence,
          ...(response.data.toolsUsed && { toolsUsed: response.data.toolsUsed })
        } as AIChatMessage & { toolsUsed?: string[] };

        // Update sessionId if provided
        if (response.data.sessionId && !sessionId) {
          setSessionId(response.data.sessionId);
        }

        // Handle crisis intervention
        if (response.data.needsCrisisIntervention) {
          toast.error('Crisis intervention alert triggered', {
            duration: 5000,
            icon: '🚨'
          });
        }

        // Remove loading message and add AI response
        setMessages(prev => prev.filter(msg => !msg.isLoading).concat(aiMessage));
      } else {
        throw new Error('AI response failed');
      }
    } catch (error) {
      console.error('AI message error:', error);
      toast.error('AI is temporarily unavailable');

      // Remove loading message and add error message
      const errorMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I\'m temporarily unavailable. Please try again in a moment.',
        type: 'system',
        timestamp: new Date()
      };

      setMessages(prev => prev.filter(msg => !msg.isLoading).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const switchOrchestrationSystem = (system: OrchestrationSystem) => {
    setSelectedSystem(system);
    setMessages([]);
    setSessionId(null);
    setShowSettings(false);
    toast.success(`Switched to ${ORCHESTRATION_SYSTEMS[system].name}`);
  };

  const currentSystemConfig = ORCHESTRATION_SYSTEMS[selectedSystem];
  const SystemIcon = currentSystemConfig.icon;

  return (
    <Card className={cn('flex flex-col h-full max-h-[600px]', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <SystemIcon className={cn('w-5 h-5', currentSystemConfig.color)} />
          <div>
            <h3 className="font-semibold text-sm">{currentSystemConfig.name}</h3>
            <p className="text-xs text-gray-500">{currentSystemConfig.description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* System Selector */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4">
              <h4 className="text-sm font-medium mb-2">Select AI System:</h4>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(ORCHESTRATION_SYSTEMS).map(([key, config]) => {
                  const Icon = config.icon;
                  const isDisabled = key === 'main'; // Disable main system
                  return (
                    <button
                      key={key}
                      onClick={() => !isDisabled && switchOrchestrationSystem(key as OrchestrationSystem)}
                      disabled={isDisabled}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg text-left transition-colors',
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed bg-gray-50'
                          : selectedSystem === key
                          ? 'bg-blue-100 border border-blue-200'
                          : 'hover:bg-gray-100'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', config.color)} />
                      <div>
                        <div className="text-sm font-medium">{config.name}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'flex gap-3',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type !== 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2',
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'system'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <div className="prose prose-sm max-w-none">
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-xs">AI is thinking...</span>
                    </div>
                  ) : (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                  <div className="flex flex-col gap-1">
                    <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
                    {message.agentUsed && message.agentUsed.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs">Agents:</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                          {message.agentUsed.join(', ')}
                        </span>
                      </div>
                    )}
                    {(message as any).toolsUsed && (message as any).toolsUsed.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs">Tools:</span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                          {(message as any).toolsUsed.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {message.needsCrisisIntervention && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                    {message.confidence && (
                      <span>{Math.round(message.confidence * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>

              {message.type === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder={`Message ${currentSystemConfig.name}...`}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !messageInput.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}