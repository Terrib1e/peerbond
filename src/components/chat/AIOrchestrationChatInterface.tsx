/**
 * AI Orchestration Chat Interface - Enhanced group chat with AI integration
 * Combines existing chat functionality with intelligent AI orchestration
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, Heart, AlertCircle, Clock, Brain, Zap, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { api } from '@/lib/api';
import { wsService } from '@/lib/websocket';
import { Message, User, Group } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

// AI Components
import AIAgentIndicator from '@/components/ai/AIAgentIndicator';
import { useGroupOrchestration } from '@/hooks/useGroupOrchestration';
import { useCrisisDetection } from '@/hooks/useCrisisDetection';

interface AIOrchestrationChatProps {
  groupId: string;
  currentUser: User;
  group: Group;
  className?: string;
}

interface EnhancedMessage extends Message {
  user?: User;
  isLoading?: boolean;
  error?: string;
  aiContext?: {
    agentUsed: string[];
    confidence: number;
    interventionType?: 'crisis' | 'support' | 'insight' | 'matching';
    sentiment?: number;
    metadata?: any;
  };
  isAIGenerated?: boolean;
  requiresResponse?: boolean;
}

export default function AIOrchestrationChatInterface({ 
  groupId, 
  currentUser, 
  group, 
  className 
}: AIOrchestrationChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showAISettings, setShowAISettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // AI Orchestration hooks
  const orchestration = useGroupOrchestration(groupId, currentUser.id);
  const crisisDetection = useCrisisDetection(groupId, group.facilitators?.includes(currentUser.id));

  // Debug logging
  console.log('🤖 [AI-CHAT] AIOrchestrationChatInterface initialized:', { groupId, user: currentUser?.email });
  console.log('🤖 [AI-CHAT] Orchestration state:', {
    sessionId: orchestration.sessionId,
    agentStatus: orchestration.agentStatus,
    isConnected: orchestration.isConnected,
    isLoading: orchestration.isLoading,
    error: orchestration.error
  });

  // Fetch messages (same as original ChatInterface)
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', groupId] as const,
    queryFn: async () => {
      try {
        const msgs = await api.getMessages(groupId);
        console.log('Fetched messages:', msgs);
        if (!msgs || !Array.isArray(msgs)) {
          console.warn('Messages is not an array:', msgs);
          return [];
        }
        return msgs.map(msg => {
          // Handle timestamp conversion
          let timestamp: Date;
          try {
            const timestampValue = (msg as any).timestamp || (msg as any).createdAt;
            if (timestampValue) {
              timestamp = new Date(timestampValue);
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp for message', msg.id, ':', timestampValue);
                timestamp = new Date();
              }
            } else {
              console.warn('Missing timestamp for message', msg.id);
              timestamp = new Date();
            }
          } catch (error) {
            console.error('Error parsing timestamp for message', msg.id, ':', error);
            timestamp = new Date();
          }

          return {
            ...msg,
            user: currentUser.id === msg.userId ? currentUser : msg.user,
            timestamp,
            isAIGenerated: msg.type === 'ai_facilitator' || msg.userId === 'ai-facilitator' || msg.userId === 'ai-crisis',
            aiContext: msg.metadata ? {
              agentUsed: msg.metadata.agentUsed || [],
              confidence: msg.metadata.confidence || 0,
              interventionType: msg.metadata.interventionType,
              sentiment: msg.metadata.sentiment
            } : undefined
          };
        });
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: 1000,
  });

  // Send message mutation with AI integration
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser || !groupId) {
        throw new Error('User not authenticated or group not selected');
      }

      // Ensure we have an orchestration session
      let sessionId = orchestration.sessionId;
      if (!sessionId) {
        console.log('🤖 [AI-ORCHESTRATION] No session ID, starting session...');
        await orchestration.actions.startSession();
        
        // Wait for the session to be established
        sessionId = await orchestration.waitForSession();
        
        if (!sessionId) {
          throw new Error('Failed to establish orchestration session');
        }
        
        console.log('🤖 [AI-ORCHESTRATION] Session established:', sessionId);
      }

      // Enhanced optimistic update with AI context
      const tempMessage: EnhancedMessage = {
        id: `temp-${Date.now()}`,
        groupId,
        userId: currentUser.id,
        content,
        type: 'text',
        timestamp: new Date(),
        user: currentUser,
        isLoading: true,
        reactions: []
      };

      // Add optimistic message
      queryClient.setQueryData(['messages', groupId], (old: any[] | undefined) => [...(old || []), tempMessage]);

      try {
        // Process through orchestration service for AI agent routing
        console.log('🤖 [AI-ORCHESTRATION] Processing message through orchestration:', { 
          content, 
          sessionId: sessionId,
          sessionIdValid: sessionId && sessionId.match(/^session_\d+_[a-f0-9\-]{36}$/)
        });
        
        const messageRequest = {
          content,
          sessionId: sessionId!,
          messageType: 'user' as const
        };
        
        console.log('🤖 [AI-ORCHESTRATION] Sending request:', messageRequest);
        
        const response = await api.sendOrchestrationMessage(messageRequest);

        console.log('🤖 [AI-ORCHESTRATION] Orchestration response received:', {
          success: response.success,
          agentUsed: response.data?.agentUsed,
          confidence: response.data?.confidence,
          responsePreview: response.data?.response?.slice(0, 100) + '...'
        });

        // Remove temp message and add both user and AI messages
        queryClient.setQueryData(['messages', groupId], (old: any[] | undefined) => {
          const filtered = (old || []).filter((msg: any) => msg.id !== tempMessage.id);
          
          const userMessage = {
            ...tempMessage,
            isLoading: false,
            id: `user-${Date.now()}`
          };

          const aiMessage = {
            id: `ai-${Date.now()}`,
            groupId,
            userId: 'ai-facilitator',
            content: response.data.response,
            type: 'ai_facilitator',
            timestamp: new Date(),
            isAIGenerated: true,
            reactions: [],
            aiContext: {
              agentUsed: response.data.agentUsed || [],
              confidence: response.data.confidence || 0,
              interventionType: response.data.needsCrisisIntervention ? 'crisis' : 'support',
              metadata: response.data.metadata
            }
          };

          return [...filtered, userMessage, aiMessage];
        });

        // Also send via WebSocket for real-time updates to other users
        wsService.emit('send_message', {
          groupId,
          content,
          type: 'text'
        });

        return response;
      } catch (error) {
        console.error('🤖 [AI-ORCHESTRATION] ERROR:', error);
        console.error('🤖 [AI-ORCHESTRATION] Error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
        // Remove optimistic message on error
        queryClient.setQueryData(['messages', groupId], (old: any[] | undefined) => 
          (old || []).filter((msg: any) => msg.id !== tempMessage.id)
        );
        throw error;
      }
    },
    onError: (error) => {
      toast.error('Failed to send message');
      console.error('Send message error:', error);
    }
  });

  // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sendMessageMutation.isPending) return;

    const content = messageInput.trim();
    setMessageInput('');

    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      setMessageInput(content); // Restore message on error
    }
  };

  // Handle AI agent interactions
  const handleCallAgent = async (agentId: string, message?: string) => {
    try {
      const messageToSend = message || `Please provide ${agentId} support for our group discussion.`;
      await orchestration.actions.callAgent(agentId, messageToSend);
      toast.success(`${agentId} agent called successfully`);
    } catch (error) {
      toast.error(`Failed to call ${agentId} agent`);
      console.error('Agent call error:', error);
    }
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket event handlers for real-time features
  useEffect(() => {
    if (!wsService.isConnected()) return;

    const handleNewMessage = (messageData: any) => {
      if (messageData.groupId === groupId) {
        queryClient.setQueryData(['messages', groupId], (old: any[] | undefined) => {
          const filtered = (old || []).filter((msg: any) => !msg.id.startsWith('temp-'));
          
          // Ensure valid timestamp
          let timestamp: Date;
          try {
            timestamp = messageData.timestamp ? new Date(messageData.timestamp) : new Date();
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date();
            }
          } catch (error) {
            timestamp = new Date();
          }
          
          return [...filtered, {
            ...messageData,
            timestamp,
            isAIGenerated: messageData.type === 'ai_facilitator' || messageData.userId === 'ai-facilitator'
          }];
        });
      }
    };

    const handleTypingUpdate = (data: any) => {
      if (data.groupId === groupId) {
        setTypingUsers(data.typingUsers || []);
      }
    };

    const handleAIResponse = (data: any) => {
      if (data.groupId === groupId) {
        queryClient.setQueryData(['messages', groupId], (old: any[] | undefined) => {
          // Ensure valid timestamp
          let timestamp: Date;
          try {
            timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date();
            }
          } catch (error) {
            timestamp = new Date();
          }

          return [
            ...(old || []),
            {
              ...data,
              timestamp,
              isAIGenerated: true,
              aiContext: data.agentContext
            }
          ];
        });
      }
    };

    // Register WebSocket listeners
    wsService.on('new_message', handleNewMessage);
    wsService.on('typing_update', handleTypingUpdate);
    wsService.on('ai:response', handleAIResponse);

    return () => {
      wsService.off('new_message', handleNewMessage);
      wsService.off('typing_update', handleTypingUpdate);
      wsService.off('ai:response', handleAIResponse);
    };
  }, [groupId, queryClient]);

  // Typing indicator
  const handleTyping = (isTyping: boolean) => {
    wsService.emit('typing', { groupId, isTyping });
  };

  // Message rendering with AI enhancements
  const renderMessage = (message: EnhancedMessage) => {
    const isOwnMessage = message.userId === currentUser.id;
    const isAI = message.isAIGenerated;
    const isMetaQuery = message.metadata?.isMetaQuery;
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 p-4',
          isOwnMessage ? 'flex-row-reverse' : 'flex-row',
          isAI && !isMetaQuery && 'bg-purple-50 border-l-4 border-purple-500',
          isMetaQuery && 'bg-blue-50 border-l-4 border-blue-500'
        )}
      >
        {/* Avatar */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
          isMetaQuery ? 'bg-blue-500' : 
          isAI ? 'bg-purple-500' : 
          isOwnMessage ? 'bg-blue-500' : 'bg-gray-500'
        )}>
          {isMetaQuery ? <Bot className="w-4 h-4" /> :
           isAI ? <Brain className="w-4 h-4" /> : 
           (message.user?.firstName?.[0] || message.userId.slice(0, 2).toUpperCase())}
        </div>

        {/* Message Content */}
        <div className={cn('flex-1 max-w-md', isOwnMessage && 'text-right')}>
          {/* Header */}
          <div className={cn('flex items-center gap-2 mb-1', isOwnMessage && 'justify-end')}>
            <span className="text-sm font-medium text-gray-900">
              {isMetaQuery ? 'AI System Info' :
               isAI ? 'AI Facilitator' : 
               message.user ? `${message.user.firstName} ${message.user.lastName}` : 
               'Unknown User'}
            </span>
            
            {message.aiContext && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-purple-600">
                  {Math.round(message.aiContext.confidence * 100)}%
                </span>
              </div>
            )}
            
            <span className="text-xs text-gray-500">
              {(() => {
                try {
                  const timestamp = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
                  if (isNaN(timestamp.getTime())) {
                    return 'Just now';
                  }
                  return formatDistanceToNow(timestamp, { addSuffix: true });
                } catch (error) {
                  console.warn('Invalid timestamp for message:', message.id, message.timestamp);
                  return 'Just now';
                }
              })()}
            </span>
          </div>

          {/* Message Body */}
          <div className={cn(
            'rounded-lg px-3 py-2 text-sm',
            isOwnMessage ? 'bg-blue-500 text-white' : 
            isMetaQuery ? 'bg-blue-100 text-blue-900 border border-blue-200' :
            isAI ? 'bg-purple-100 text-purple-900 border border-purple-200' : 
            'bg-gray-100 text-gray-900'
          )}>
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  code: ({ className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const { node, inline, ...rest } = props;
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneLight as any}
                        language={match[1]} 
                        PreTag="div"
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* AI Context Info */}
          {message.aiContext && (
            <div className="mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Agents: {message.aiContext.agentUsed.join(', ')}</span>
                {message.aiContext.interventionType && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                    {message.aiContext.interventionType}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-white border rounded-full text-xs cursor-pointer hover:bg-gray-50"
                >
                  {reaction.emoji} {reaction.count || reaction.users.length}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Crisis intervention button for facilitators */}
        {crisisDetection.facilitatorAlerts.some(alert => alert.messageId === message.id) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => crisisDetection.actions.handleCrisisIntervention(message.id, 'moderate')}
            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
          >
            <AlertCircle className="w-4 h-4" />
          </Button>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header with AI Status */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">{group.name}</h2>
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              orchestration.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
            )} />
            <span className="text-sm text-gray-600">
              {orchestration.isConnected ? 'AI Active' : 'AI Offline'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCallAgent('facilitator')}
            disabled={!orchestration.sessionId}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            <Heart className="w-4 h-4 mr-1" />
            Ask Maya
          </Button>

          <Button
            variant="outline" 
            size="sm"
            onClick={() => orchestration.actions.requestInsights()}
            disabled={!orchestration.sessionId}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Brain className="w-4 h-4 mr-1" />
            Insights
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAISettings(!showAISettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* AI Settings Panel */}
      <AnimatePresence>
        {showAISettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4">
              <AIAgentIndicator
                agentStatus={orchestration.agentStatus}
                groupContext={orchestration.groupContext}
                isConnected={orchestration.isConnected}
                variant="compact"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to {group.name}</h3>
              <p className="text-gray-600 mb-4">
                Start the conversation! Our AI facilitator Maya is here to support the discussion.
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCallAgent('facilitator', 'Please introduce yourself and welcome everyone to the group.')}
                  disabled={!orchestration.sessionId}
                >
                  <Bot className="w-4 h-4 mr-1" />
                  Get AI Welcome
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map(renderMessage)}
            
            {/* AI Typing Indicator */}
            {orchestration.aiTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-4 text-purple-600"
              >
                <Brain className="w-6 h-6" />
                <div className="flex items-center gap-1">
                  <span className="text-sm">AI is analyzing...</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-100" />
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Typing Users */}
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-4 text-gray-500 text-sm"
              >
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
                <span>
                  {typingUsers.length === 1 ? 'Someone is' : `${typingUsers.length} people are`} typing...
                </span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <Input
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              handleTyping(e.target.value.length > 0);
            }}
            onBlur={() => handleTyping(false)}
            placeholder="Share your thoughts with the group..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          
          <Button
            type="submit"
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {/* Quick AI Suggestions and Meta Queries */}
        <div className="mt-2 flex gap-2 flex-wrap">
          {orchestration.lastInsights.length > 0 && (
            <>
              <span className="text-xs text-gray-500">AI Suggestions:</span>
              {orchestration.lastInsights.slice(0, 2).map((insight, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setMessageInput(insight.summary)}
                  className="text-xs"
                >
                  {insight.type}: {insight.summary.slice(0, 30)}...
                </Button>
              ))}
            </>
          )}
          
          {/* Meta-query quick buttons */}
          {messages.length === 0 && (
            <>
              <span className="text-xs text-gray-500">Ask about the AI:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessageInput("How many agents are there?")}
                className="text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                <Bot className="w-3 h-3 mr-1" />
                Agent Count
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessageInput("What tools do you have?")}
                className="text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                <Zap className="w-3 h-3 mr-1" />
                Tools List
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMessageInput("What are your capabilities?")}
                className="text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              >
                <Brain className="w-3 h-3 mr-1" />
                Capabilities
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Floating AI Agent Indicator */}
      <AIAgentIndicator
        agentStatus={orchestration.agentStatus}
        groupContext={orchestration.groupContext}
        isConnected={orchestration.isConnected}
        variant="floating"
        className="fixed bottom-20 right-4 z-40"
      />

      {/* Crisis Alerts */}
      <AnimatePresence>
        {crisisDetection.activeCrises.map(crisis => (
          <motion.div
            key={crisis.messageId}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Crisis Detected</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Severity: {crisis.severity} - Support resources have been provided.
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => crisisDetection.actions.dismissCrisis(crisis.messageId)}
                className="text-red-600 border-red-200"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}