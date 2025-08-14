import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Bot,
  Heart,
  Clock,
  Brain,
  Zap,
  AlertCircle,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

import { api } from '@/lib/api';
import { wsService } from '@/lib/websocket';
import { Message, Member, Group } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

interface StreamlinedChatProps {
  groupId: string;
  currentMember: Member;
  group: Group;
  className?: string;
}

interface ChatMessage extends Message {
  member?: Member;
  isLoading?: boolean;
  error?: string;
  aiContext?: {
    agentUsed?: string[] | string;
    confidence?: number;
    interventionType?: string;
  };
}

export default function StreamlinedChatInterface({
  groupId,
  currentMember,
  group,
  className
}: StreamlinedChatProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', groupId] as const,
    queryFn: async () => {
      try {
        const msgs = await api.getMessages(groupId);
        if (!msgs || !Array.isArray(msgs)) return [];

        return msgs.map(msg => ({
          ...msg,
          member: currentMember.id === msg.memberId ? currentMember : undefined,
          timestamp: new Date(msg.timestamp || Date.now()),
        }));
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
  });

  // Send message mutation with AI orchestration
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        groupId,
        memberId: currentMember.id,
        content,
        timestamp: new Date(),
        type: 'member',
        reactions: [],
        member: currentMember,
        isLoading: true,
      };

      queryClient.setQueryData<ChatMessage[]>(['messages', groupId], (old = []) => [
        ...old,
        tempMessage,
      ]);

      try {
        // Start session if needed
        let currentSessionId = sessionId;
        if (!currentSessionId) {
          setThinkingMessage('Initializing AI session...');
          setAiThinking(true);

          // Generate a session ID
          currentSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setSessionId(currentSessionId);

          // Start the orchestration session
          try {
            await api.startOrchestrationSession('production', { groupId });
          } catch (sessionError) {
            console.warn('Failed to start orchestration session, continuing with generated ID:', sessionError);
          }
        }

        // Show AI thinking indicator
        setThinkingMessage('Maya is analyzing your message...');
        setAiThinking(true);

        // Send through orchestration for AI processing with groupId
        const orchestrationResponse = await api.sendOrchestrationMessage({
          content,
          sessionId: currentSessionId,
          messageType: 'member',
          groupId // Pass groupId so messages get persisted
        });

        // Update thinking message based on agents used
        if (orchestrationResponse.agentUsed && orchestrationResponse.agentUsed.length > 0) {
          const agentNames = orchestrationResponse.agentUsed.map(agent => {
            switch(agent) {
              case 'facilitator': return 'Maya (Therapeutic Support)';
              case 'matching': return 'Group Matching';
              case 'insight': return 'Progress Insights';
              case 'crisis': return 'Crisis Support';
              case 'sentiment': return 'Emotional Analysis';
              default: return agent;
            }
          }).join(', ');
          setThinkingMessage(`Processing with: ${agentNames}`);
        }

        // Remove temp message - messages are now persisted to database
        queryClient.setQueryData<ChatMessage[]>(['messages', groupId], (old = []) => {
          return old.filter(msg => !msg.isLoading && !msg.id.startsWith('temp-'));
        });
        
        // Refetch messages to get the persisted ones from database
        queryClient.invalidateQueries({ queryKey: ['messages', groupId] });

        // Clear AI thinking state
        setAiThinking(false);
        setThinkingMessage('');

        return orchestrationResponse;
      } catch (error) {
        console.error('Orchestration failed, falling back to regular message:', error);
        // Clear AI thinking state on error
        setAiThinking(false);
        setThinkingMessage('');

        // Fallback to regular message if orchestration fails
        queryClient.setQueryData<ChatMessage[]>(['messages', groupId], (old = []) =>
          old.filter(msg => !msg.isLoading && !msg.id.startsWith('temp-'))
        );

        // Try sending as regular message
        return await api.sendMessage({ groupId, content, type: 'text' });
      }
    },
    onSuccess: () => {
      // Messages are already handled in the mutation function
      setMessageInput('');
      setIsTyping(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
    }
  });

  // Initialize AI session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionResponse = await api.startOrchestrationSession('production', { groupId });
        if (sessionResponse.sessionId) {
          setSessionId(sessionResponse.sessionId);
        } else {
          setSessionId(newSessionId);
        }
      } catch (error) {
        console.warn('Failed to initialize AI session:', error);
        // Set a fallback session ID
        setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      }
    };

    initializeSession();
  }, [groupId]);

  // WebSocket setup
  useEffect(() => {
    let isMounted = true;

    const initializeWebSocket = async () => {
      try {
        await wsService.connect();
        if (isMounted) {
          await wsService.joinGroup(groupId);
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
      }
    };

    const handleNewMessage = (message: Message) => {
      if (isMounted) {
        queryClient.setQueryData<ChatMessage[]>(['messages', groupId], (old = []) => {
          const isDuplicate = old.some(m => m.id === message.id);
          if (isDuplicate) return old;

          const messageWithMember: ChatMessage = {
            ...message,
            member: currentMember.id === message.memberId ? currentMember : undefined,
            timestamp: new Date(message.timestamp || Date.now()),
          };

          return [...old, messageWithMember];
        });
      }
    };

    initializeWebSocket();
    wsService.onNewMessage(handleNewMessage);

    return () => {
      isMounted = false;
      wsService.offNewMessage(handleNewMessage);
      wsService.leaveGroup(groupId);
    };
  }, [groupId, currentMember, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleAIRequest = (prompt: string) => {
    setMessageInput(prompt);
    // Auto-send the AI request
    setTimeout(() => {
      if (sessionId) {
        setThinkingMessage('Preparing AI request...');
        sendMessageMutation.mutate(prompt);
      }
    }, 100);
  };

  const getAgentDisplayInfo = (agent: string) => {
    const agentInfo = {
      'facilitator': { name: 'Maya', color: 'bg-purple-100 text-purple-700', icon: '🧠' },
      'matching': { name: 'Group Finder', color: 'bg-blue-100 text-blue-700', icon: '🔍' },
      'insight': { name: 'Progress Tracker', color: 'bg-green-100 text-green-700', icon: '📈' },
      'crisis': { name: 'Crisis Support', color: 'bg-red-100 text-red-700', icon: '🚨' },
      'sentiment': { name: 'Emotion Analyzer', color: 'bg-yellow-100 text-yellow-700', icon: '💭' },
      'ai-router': { name: 'AI Router', color: 'bg-indigo-100 text-indigo-700', icon: '🎯' }
    } as const;

    return agentInfo[agent as keyof typeof agentInfo] || {
      name: agent.charAt(0).toUpperCase() + agent.slice(1),
      color: 'bg-gray-100 text-gray-700',
      icon: '🤖'
    };
  };

  const renderMessage = (message: ChatMessage) => {
    const isOwnMessage = message.memberId === currentMember.id;
    const isAI = message.type === 'ai_facilitator';
    const isSystem = message.type === 'system';

    if (isSystem) {
      return (
        <div key={message.id} className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex mb-4',
          isOwnMessage ? 'justify-end' : 'justify-start'
        )}
      >
        <div className={cn(
          'max-w-xs lg:max-w-md',
          isOwnMessage ? 'order-2' : 'order-1'
        )}>
          {/* Message header */}
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1">
              {isAI ? (
                <Bot className="w-4 h-4 text-purple-600" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                  {message.member?.firstName?.[0] || 'M'}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">
                {isAI ? 'Maya (AI Facilitator)' : (message.member?.firstName || 'Member')}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(message.timestamp, { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Message bubble */}
          <div className={cn(
            'relative rounded-2xl px-4 py-2 text-sm',
            isOwnMessage
              ? 'bg-blue-500 text-white rounded-br-md'
              : isAI
              ? 'bg-purple-50 text-purple-900 border border-purple-200 rounded-bl-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          )}>
            {message.isLoading && (
              <div className="absolute -top-1 -right-1">
                <Clock className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            )}

            <ReactMarkdown className="prose prose-sm max-w-none">
              {message.content}
            </ReactMarkdown>

            {/* AI context information */}
            {message.aiContext && (
              <div className="mt-2 space-y-1">
                {/* Agents used */}
                {message.aiContext.agentUsed && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Brain className="w-3 h-3 text-purple-500" />
                      <span className="text-purple-600 font-medium">Agents:</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {(Array.isArray(message.aiContext.agentUsed) ? message.aiContext.agentUsed : [message.aiContext.agentUsed]).map((agent, index) => {
                        const agentInfo = getAgentDisplayInfo(agent);
                        return (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1",
                              agentInfo.color
                            )}
                          >
                            <span>{agentInfo.icon}</span>
                            <span>{agentInfo.name}</span>
                          </motion.span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Confidence */}
                {message.aiContext.confidence && (
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <Zap className="w-3 h-3 text-green-500" />
                    <span>Confidence: {Math.round(message.aiContext.confidence * 100)}%</span>
                  </div>
                )}

                {/* Intervention type */}
                {message.aiContext.interventionType && (
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3 h-3 text-orange-500" />
                    <span className="text-orange-600 capitalize">{message.aiContext.interventionType} Response</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timestamp for own messages */}
          {isOwnMessage && (
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium">
              {currentMember.firstName[0]}
            </div>
            {group.members.length > 1 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 text-xs">
                +{group.members.length - 1}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-500">
              {group.members.length} members • {wsService.isConnected() ? 'Online' : 'Connecting...'} • {sessionId ? 'AI Ready' : 'AI Initializing...'}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAITools(!showAITools)}
          className={cn(
            'text-gray-600 hover:text-gray-900',
            showAITools && 'bg-blue-50 text-blue-600'
          )}
        >
          <Bot className="w-4 h-4" />
        </Button>
      </div>

      {/* AI Tools Panel */}
      <AnimatePresence>
        {showAITools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-blue-50"
          >
            <div className="p-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAIRequest("Maya, can you help facilitate our discussion?")}
                  className="text-xs bg-white"
                  disabled={!sessionId || sendMessageMutation.isPending || aiThinking}
                >
                  <Heart className="w-3 h-3 mr-1" />
                  Request Maya
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAIRequest("What tools are available?")}
                  className="text-xs bg-white"
                  disabled={!sessionId || sendMessageMutation.isPending || aiThinking}
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Show Tools
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAIRequest("Can you provide insights about our group?")}
                  className="text-xs bg-white"
                  disabled={!sessionId || sendMessageMutation.isPending || aiThinking}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  Get Insights
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to {group.name}!</h3>
              <p className="text-gray-600 mb-4">Start the conversation. Maya, our AI facilitator, is here to help.</p>
              <Button
                onClick={() => handleAIRequest("Maya, please welcome everyone to the group.")}
                className="bg-purple-500 hover:bg-purple-600"
                disabled={!sessionId || sendMessageMutation.isPending}
              >
                <Bot className="w-4 h-4 mr-2" />
                Get AI Welcome
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}

            {/* AI Thinking Indicator */}
            {aiThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex mb-4 justify-start"
              >
                <div className="max-w-xs lg:max-w-md">
                  {/* AI Avatar */}
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Maya (AI Facilitator)</span>
                  </div>

                  {/* Thinking bubble */}
                  <div className="bg-purple-50 text-purple-900 border border-purple-200 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      {/* Animated thinking dots */}
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200" />
                      </div>

                      {/* Thinking message */}
                      <div className="flex-1">
                        <div className="font-medium text-purple-800">{thinkingMessage || 'Thinking...'}</div>
                        <div className="text-xs text-purple-600 mt-1">
                          Processing your message with therapeutic AI
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t bg-white p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value);
                setIsTyping(e.target.value.length > 0);
              }}
              onBlur={() => setIsTyping(false)}
              placeholder={aiThinking ? "AI is thinking..." : "Type your message..."}
              className="resize-none border-gray-300"
              disabled={sendMessageMutation.isPending || aiThinking}
            />
          </div>

          <Button
            type="submit"
            disabled={!messageInput.trim() || sendMessageMutation.isPending || aiThinking}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {sendMessageMutation.isPending || aiThinking ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Floating connection status */}
      {!wsService.isConnected() && (
        <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
          Reconnecting...
        </div>
      )}
    </div>
  );
}