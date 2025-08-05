/**
 * Maya Interface Redesigned - Simplified, therapeutic-focused interface
 * Based on UX feedback: unified interface, prominent crisis button, contextual actions
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Send,
  Bot,
  LifeBuoy,
  AlertTriangle,
  Clock,
  CheckCircle,
  MessageCircle,
  Sparkles,
  Users,
  BookOpen,
  Target,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

import { agentService, AgentCallResponse } from '@/services/agentService';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

interface MayaMessage {
  id: string;
  content: string;
  type: 'member' | 'maya' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  isLoading?: boolean;
  contextualActions?: ContextualAction[];
  metadata?: {
    toolsUsed?: string[];
    needsCrisisIntervention?: boolean;
  };
}

interface ContextualAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  prompt: string;
  style: 'primary' | 'secondary' | 'success' | 'warning';
}

interface MayaInterfaceProps {
  memberId: string;
  className?: string;
  onCrisisAlert?: () => void;
}

// Contextual actions that appear inline with chat based on Maya's responses
const CONTEXTUAL_ACTIONS = {
  // Group-related actions
  createGroup: {
    id: 'create-group',
    label: 'Create a new group',
    icon: Users,
    prompt: "I'd like to create a new support group. Can you help me set one up?",
    style: 'primary' as const
  },
  findTherapist: {
    id: 'find-therapist',
    label: 'Connect with a therapist',
    icon: Heart,
    prompt: "Can you help me connect with a licensed therapist?",
    style: 'secondary' as const
  },
  
  // Progress and goals
  setGoal: {
    id: 'set-goal',
    label: 'Set a wellness goal',
    icon: Target,
    prompt: "I'd like to set a new wellness goal. Can you help me create one?",
    style: 'success' as const
  },
  checkProgress: {
    id: 'check-progress',
    label: 'Check my progress',
    icon: BarChart3,
    prompt: "Can you show me how I've been progressing with my mental health journey?",
    style: 'secondary' as const
  },
  
  // Learning and resources
  getExercise: {
    id: 'get-exercise',
    label: 'Get a mindfulness exercise',
    icon: Sparkles,
    prompt: "Can you guide me through a mindfulness or therapeutic exercise?",
    style: 'success' as const
  },
  findResources: {
    id: 'find-resources',
    label: 'Find helpful resources',
    icon: BookOpen,
    prompt: "I'd like to find some educational resources about mental health.",
    style: 'secondary' as const
  },
  
  // Notifications and follow-up
  enableNotifications: {
    id: 'enable-notifications',
    label: 'Notify me when groups are available',
    icon: CheckCircle,
    prompt: "Please notify me when new support groups become available that match my interests.",
    style: 'warning' as const
  }
};

export default function MayaInterfaceRedesigned({ 
  memberId, 
  className,
  onCrisisAlert 
}: MayaInterfaceProps) {
  const [messages, setMessages] = useState<MayaMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mayaAvailable, setMayaAvailable] = useState(true);
  const [showCrisisConfirm, setShowCrisisConfirm] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const initializeSession = async () => {
    console.log('Initializing Maya session for member:', memberId);
    console.log('🔧 API authentication status:', {
      isAuthenticated: api.isAuthenticated(),
      token: api.getCurrentToken() ? 'TOKEN_EXISTS' : 'NO_TOKEN'
    });
    try {
      const response = await api.post('/orchestration/session/start', {
        memberProfile: { memberId }
      });

      console.log('Session start response:', response.data);

      if (response.data.success && response.data.sessionId) {
        const newSessionId = response.data.sessionId;
        console.log('Session ID created:', newSessionId);
        setSessionId(newSessionId);

        // Use the welcome message from the server if provided, otherwise use default
        const serverWelcomeMessage = response.data.welcomeMessage;
        const welcomeContent = serverWelcomeMessage || 
          `Hi there! I'm Maya, your AI companion. I'm here to support you through whatever you're experiencing.\n\nHow are you feeling today? I'm here to listen and help in any way I can.`;

        const welcomeMessage: MayaMessage = {
          id: `welcome-${Date.now()}`,
          content: welcomeContent,
          type: 'maya',
          timestamp: new Date(),
          contextualActions: [
            CONTEXTUAL_ACTIONS.checkProgress,
            CONTEXTUAL_ACTIONS.getExercise
          ]
        };

        console.log('Setting welcome message:', welcomeMessage);
        setMessages([welcomeMessage]);
        setMayaAvailable(true); // Make sure Maya is available after successful session
      } else {
        console.error('Failed to get session ID from response:', response.data);
        setMayaAvailable(false);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      setMayaAvailable(false);
      toast.error('Unable to connect to Maya. Please try again in a moment.');
    }
  };

  const handleCrisisHelp = () => {
    setShowCrisisConfirm(true);
  };

  const confirmCrisisHelp = async () => {
    setShowCrisisConfirm(false);
    
    // Call crisis support immediately
    const crisisMessage = "I need immediate help and support right now.";
    await sendMessage(crisisMessage, 'crisis');
    
    // Trigger external crisis alert if provided
    if (onCrisisAlert) {
      onCrisisAlert();
    }
    
    // Show crisis resources toast
    toast.error(
      '🚨 Crisis resources: National Suicide Prevention Lifeline: 988 | Crisis Text Line: Text HOME to 741741',
      { duration: 15000 }
    );
  };

  const handleInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with:', { 
      inputMessage: inputMessage.trim(), 
      isLoading, 
      sessionId,
      canSubmit: !(!inputMessage.trim() || isLoading || !sessionId)
    });
    
    if (!inputMessage.trim() || isLoading || !sessionId) {
      console.log('Submission blocked:', { 
        noMessage: !inputMessage.trim(), 
        isLoading, 
        noSession: !sessionId 
      });
      return;
    }

    console.log('Sending message:', inputMessage.trim());
    await sendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleContextualAction = async (action: ContextualAction) => {
    await sendMessage(action.prompt);
  };

  const sendMessage = async (content: string, agentHint?: string) => {
    if (!sessionId) return;

    // Add member message
    const memberMessage: MayaMessage = {
      id: `member-${Date.now()}`,
      content,
      type: 'member',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, memberMessage]);
    setIsLoading(true);

    // Add loading message
    const loadingMessage: MayaMessage = {
      id: `loading-${Date.now()}`,
      content: 'Maya is thinking...',
      type: 'maya',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, loadingMessage]);

    try {
      let response: AgentCallResponse;

      if (agentHint === 'crisis') {
        // Direct crisis agent call
        response = await agentService.callAgent('crisis', content, sessionId);
      } else {
        // Use orchestration for smart agent routing
        try {
          console.log('🔧 Sending orchestration message:', {
            content,
            sessionId,
            messageType: 'member',
            isAuthenticated: api.isAuthenticated(),
            hasToken: !!api.getCurrentToken()
          });
          
          const orchestrationResponse = await api.post('/orchestration/message', {
            content,
            sessionId,
            messageType: 'member'
          });

          console.log('🔧 Orchestration response received:', {
            status: orchestrationResponse.status,
            data: orchestrationResponse.data,
            success: orchestrationResponse.data?.success,
            dataKeys: Object.keys(orchestrationResponse.data || {}),
            hasResponse: !!orchestrationResponse.data?.response,
            responseType: typeof orchestrationResponse.data?.response
          });

          // The orchestration endpoint returns a flat structure:
          // { success: true, response: "...", agentUsed: [...], ... }
          if (!orchestrationResponse.data) {
            console.error('🔥 No data in response:', orchestrationResponse);
            throw new Error('No data received from server');
          } else if (orchestrationResponse.data?.success === false) {
            // Handle explicit failure
            console.error('🔥 Server returned success=false:', {
              fullResponse: orchestrationResponse,
              dataSuccess: orchestrationResponse.data.success,
              dataError: orchestrationResponse.data.error,
              completeData: orchestrationResponse.data
            });
            throw new Error(orchestrationResponse.data.error || 'Failed to process message');
          } else if (orchestrationResponse.data?.response !== undefined) {
            // Direct response format - this is the expected format
            // Check if response is a string or object
            response = orchestrationResponse.data;
            console.log('API returned response:', response);
          } else if (orchestrationResponse.response !== undefined) {
            // Response might be at top level (without data wrapper)
            response = orchestrationResponse;
            console.log('API returned top-level response:', response);
          } else if (orchestrationResponse.data && typeof orchestrationResponse.data === 'object') {
            // Try to use the data as is
            console.warn('⚠️ Response format not standard, using data as-is:', orchestrationResponse.data);
            response = {
              response: orchestrationResponse.data.message || orchestrationResponse.data.text || 'I received your message. How can I help you further?',
              agentUsed: orchestrationResponse.data.agentUsed || ['facilitator'],
              confidence: orchestrationResponse.data.confidence || 0.7,
              metadata: orchestrationResponse.data.metadata || {}
            };
          } else {
            // Unexpected format - log full details
            console.error('🔥 Unexpected response format:', {
              hasData: !!orchestrationResponse.data,
              dataKeys: Object.keys(orchestrationResponse.data || {}),
              fullData: orchestrationResponse.data,
              dataType: typeof orchestrationResponse.data,
              stringified: JSON.stringify(orchestrationResponse.data)
            });
            throw new Error('Unexpected response format from server');
          }
          
          // Check if response has the expected structure
          if (!response || typeof response !== 'object') {
            console.error('Invalid response structure:', response);
            throw new Error('Invalid response from server');
          }
        } catch (apiError) {
          console.error('🔥 API call failed with full details:', {
            error: apiError,
            message: apiError?.message,
            response: apiError?.response,
            responseData: apiError?.response?.data,
            status: apiError?.response?.status,
            stack: apiError?.stack
          });
          
          // Check if this is a network error vs server error
          if (!apiError?.response) {
            console.error('🔥 This appears to be a NETWORK ERROR (no response received)');
            throw new Error(`Network error: ${apiError?.message || 'Unable to connect to server'}`);
          } else {
            console.error('🔥 This appears to be a SERVER ERROR (response received)');
            throw apiError;
          }
        }
      }

      // Remove loading message and add Maya's response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        
        // Safely access response properties
        const responseText = response?.response || 'I received your message but had trouble processing it. Could you try again?';
        const improvedContent = improveResponseTone(responseText);
        console.log('Creating Maya message with content:', improvedContent);
        
        const mayaResponse: MayaMessage = {
          id: `maya-${Date.now()}`,
          content: improvedContent,
          type: 'maya',
          timestamp: new Date(),
          agentUsed: response?.agentUsed ? (Array.isArray(response.agentUsed) ? response.agentUsed : [response.agentUsed]) : [],
          contextualActions: generateContextualActions(responseText, response?.agentUsed || []),
          metadata: response?.metadata || {}
        };

        console.log('Maya message created:', mayaResponse);
        const newMessages = [...filtered, mayaResponse];
        console.log('New messages array:', newMessages);
        return newMessages;
      });

      // Handle crisis intervention
      if (response.metadata?.needsCrisisIntervention) {
        toast.error('🚨 Crisis support resources have been provided. Please reach out for immediate help if needed.', {
          duration: 10000
        });
      }

    } catch (error) {
      console.error('❌ COMPLETE ERROR DETAILS:', error);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Response status:', error?.response?.status);
      console.error('❌ Response data:', error?.response?.data);
      console.error('❌ Response headers:', error?.response?.headers);
      console.error('❌ Request config:', error?.config);
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        
        let errorContent = "I'm having trouble responding right now.";
        
        // Add more specific error messages
        if (error?.response?.status === 401) {
          errorContent = "I need you to log in again to continue our conversation.";
        } else if (error?.response?.status === 403) {
          errorContent = "I don't have permission to process that request.";
        } else if (error?.response?.status >= 500) {
          errorContent = "Our servers are having some trouble right now.";
        } else if (error?.message) {
          errorContent += ` Full error: ${error.message}`;
          
          // Also log the complete error to see if it contains authentication info
          if (error?.response?.data) {
            console.error('❌ Server responded with:', JSON.stringify(error.response.data, null, 2));
            errorContent += ` | Server: ${JSON.stringify(error.response.data)}`;
          }
        }
        
        errorContent += "\n\nIf this is urgent, please contact a crisis hotline immediately:\n\n🆘 **Emergency Resources:**\n• National Suicide Prevention Lifeline: 988\n• Crisis Text Line: Text HOME to 741741";
        
        const errorMessage: MayaMessage = {
          id: `error-${Date.now()}`,
          content: errorContent,
          type: 'maya',
          timestamp: new Date(),
          contextualActions: [CONTEXTUAL_ACTIONS.findTherapist]
        };

        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Make AI responses more conversational and less robotic
  const improveResponseTone = (response: string): string => {
    if (!response) return '';
    
    // Remove bullet points but keep bold formatting
    let improved = response
      .replace(/• /g, '')
      .replace(/\n\n/g, '\n')
      .trim();

    // Add more natural conversation starters
    if (improved.includes("I'd love to help") && improved.includes("but")) {
      improved = improved.replace(
        /I'd love to help.*?but.*?right now\./,
        "I wasn't able to find that for you right now, but I don't want you to feel stuck."
      );
    }

    return improved;
  };

  // Generate contextual actions based on Maya's response
  const generateContextualActions = (response: string, agentsUsed: string | string[]): ContextualAction[] => {
    const agents = Array.isArray(agentsUsed) ? agentsUsed : [agentsUsed];
    const responseLower = response.toLowerCase();
    const actions: ContextualAction[] = [];

    // Smart contextual suggestions
    if (responseLower.includes("group") && responseLower.includes("available")) {
      actions.push(CONTEXTUAL_ACTIONS.createGroup, CONTEXTUAL_ACTIONS.enableNotifications);
    }
    
    if (responseLower.includes("therapist") || responseLower.includes("professional")) {
      actions.push(CONTEXTUAL_ACTIONS.findTherapist);
    }
    
    if (responseLower.includes("goal") || responseLower.includes("objective")) {
      actions.push(CONTEXTUAL_ACTIONS.setGoal);
    }
    
    if (responseLower.includes("progress") || responseLower.includes("journey")) {
      actions.push(CONTEXTUAL_ACTIONS.checkProgress);
    }
    
    if (responseLower.includes("exercise") || responseLower.includes("technique")) {
      actions.push(CONTEXTUAL_ACTIONS.getExercise);
    }

    // Default helpful actions if no specific matches
    if (actions.length === 0) {
      actions.push(CONTEXTUAL_ACTIONS.getExercise, CONTEXTUAL_ACTIONS.findResources);
    }

    return actions.slice(0, 2); // Limit to 2 actions to avoid overwhelming
  };

  const renderMessage = (message: MayaMessage) => {
    const isOwnMessage = message.type === 'member';
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 max-w-full',
          isOwnMessage ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {!isOwnMessage && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        <div className={cn(
          'flex-1 max-w-[80%]',
          isOwnMessage ? 'flex flex-col items-end' : 'flex flex-col items-start'
        )}>
          <div className={cn(
            'px-4 py-3 rounded-2xl',
            isOwnMessage 
              ? 'bg-purple-500 text-white' 
              : message.isLoading
                ? 'bg-gray-100 border-2 border-dashed border-gray-300'
                : 'bg-gray-100 text-gray-900'
          )}>
            {message.isLoading ? (
              <div className="flex items-center gap-2 text-gray-600">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm">Maya is thinking...</span>
              </div>
            ) : (
              <div className={cn(
                'text-sm leading-relaxed',
                isOwnMessage ? 'text-white' : 'text-gray-900'
              )}>
                {message.content.split('\n').map((line, index) => {
                  // Handle bold text
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <div key={index} className="mb-2 last:mb-0">
                        {parts.map((part, partIndex) => 
                          partIndex % 2 === 1 ? (
                            <span key={partIndex} className="font-semibold">{part}</span>
                          ) : (
                            <span key={partIndex}>{part}</span>
                          )
                        )}
                      </div>
                    );
                  }
                  // Regular text
                  return line.trim() ? (
                    <div key={index} className="mb-2 last:mb-0">{line}</div>
                  ) : (
                    <div key={index} className="mb-2"></div>
                  );
                })}
              </div>
            )}
          </div>

          {!isOwnMessage && !message.isLoading && (
            <div className="text-xs text-gray-500 mt-1 px-1">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </div>
          )}

          {/* Contextual Actions - Inline with chat */}
          {message.contextualActions && message.contextualActions.length > 0 && !message.isLoading && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.contextualActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleContextualAction(action)}
                    disabled={isLoading}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium',
                      'transition-all duration-200 disabled:opacity-50',
                      'border shadow-sm hover:shadow-md',
                      {
                        'bg-purple-500 text-white border-purple-500 hover:bg-purple-600': action.style === 'primary',
                        'bg-white text-gray-700 border-gray-300 hover:bg-gray-50': action.style === 'secondary',
                        'bg-green-500 text-white border-green-500 hover:bg-green-600': action.style === 'success',
                        'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600': action.style === 'warning'
                      }
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isOwnMessage && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
              {memberId.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Simplified Header with Prominent Crisis Button */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Maya</h2>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                mayaAvailable ? 'bg-green-500' : 'bg-gray-300'
              )} />
              Your AI companion
            </p>
          </div>
        </div>

        {/* Prominent Crisis Button */}
        <Button
          onClick={handleCrisisHelp}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 shadow-lg"
          size="sm"
        >
          <LifeBuoy className="w-4 h-4 mr-2" />
          I need immediate help
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth" ref={scrollAreaRef}>
        {console.log('Current messages:', messages)}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Heart className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Hello! I'm here for you</h3>
              <p className="text-gray-600">How are you feeling today?</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {console.log('Rendering messages:', messages.length)}
            {messages.map((message, index) => {
              console.log(`Rendering message ${index}:`, message);
              return renderMessage(message);
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-white p-4">
        {console.log('Input state:', { 
          inputMessage, 
          inputTrimmed: inputMessage.trim(), 
          isLoading, 
          mayaAvailable, 
          sessionId,
          buttonDisabled: !inputMessage.trim() || isLoading || !mayaAvailable
        })}
        <form onSubmit={handleInputSubmit} className="flex gap-3">
          <Input
            value={inputMessage}
            onChange={(e) => {
              console.log('Input changed to:', e.target.value);
              setInputMessage(e.target.value);
            }}
            placeholder={isLoading ? "Maya is responding..." : "Share what's on your mind..."}
            disabled={isLoading || !mayaAvailable}
            className="flex-1 text-base"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !mayaAvailable}
            className="bg-purple-500 hover:bg-purple-600 px-6"
            onClick={() => console.log('Button clicked')}
          >
            {isLoading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="mt-3 text-xs text-gray-500 text-center">
          Maya provides therapeutic support but is not a replacement for professional mental health care
        </div>
      </div>

      {/* Crisis Confirmation Modal */}
      <AnimatePresence>
        {showCrisisConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">Crisis Support</h3>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you in crisis and need immediate support? I'll connect you with crisis resources and provide immediate assistance.
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={confirmCrisisHelp}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  Yes, I need help now
                </Button>
                <Button
                  onClick={() => setShowCrisisConfirm(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}