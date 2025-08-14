import { useState, useEffect, useRef, JSXElementConstructor, Key, ReactElement, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, Heart, ThumbsUp, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { api } from '@/lib/api';
import { wsService } from '@/lib/websocket';
import { Message, Member, Group } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

interface ChatInterfaceProps {
  groupId: string;
  currentMember: Member;
  group: Group;
}

interface MessageWithMember extends Message {
  member?: Member;
  isLoading?: boolean;
  error?: string;
}

export default function ChatInterface({ groupId, currentMember, group }: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Debug logging
  console.log('ChatInterface initialized with groupId:', groupId, 'currentMember:', currentMember?.email);

  // Fetch messages
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
          // Safely handle timestamp conversion - backend uses createdAt field
          let timestamp: Date;
          try {
            const timestampValue = (msg as any).timestamp || (msg as any).createdAt;
            if (timestampValue) {
              timestamp = new Date(timestampValue);
              // Validate the date is actually valid
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp for message', msg.id, ':', timestampValue);
                timestamp = new Date(); // Fallback to current time
              }
            } else {
              console.warn('Missing timestamp for message', msg.id);
              timestamp = new Date(); // Fallback to current time
            }
          } catch (error) {
            console.error('Error parsing timestamp for message', msg.id, ':', error);
            timestamp = new Date(); // Fallback to current time
          }

          return {
            ...msg,
            member: currentMember.id === msg.memberId ? currentMember : undefined,
            timestamp,
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentMember || !groupId) {
        throw new Error('Member not authenticated or group not selected');
      }

      // Optimistic update - add temporary message
      const tempMessage: MessageWithMember = {
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

      queryClient.setQueryData<MessageWithMember[]>(['messages', groupId], (old = []) => [
        ...old,
        tempMessage,
      ]);

      try {
        console.log('Attempting to send message:', { groupId, content, type: 'text' });
        return await api.sendMessage({ groupId, content, type: 'text' });
      } catch (error) {
        console.error('Send message error details:', {
          error: error,
          message: (error as Error).message,
          groupId,
          content: content?.substring(0, 50) + '...',
        });
        // Remove failed message from optimistic update
        queryClient.setQueryData<MessageWithMember[]>(['messages', groupId], (old = []) =>
          old.filter(msg => !msg.isLoading && !msg.id.startsWith('temp-'))
        );
        throw error;
      }
    },
    onSuccess: (newMessage) => {
      // Replace temporary message with actual message
      queryClient.setQueryData<MessageWithMember[]>(['messages', groupId], (old = []) => {
        // Remove all loading messages (temporary ones)
        const filtered = old.filter(msg => !msg.isLoading && !msg.id.startsWith('temp-'));

        // Check if this message already exists to prevent duplicates
        const exists = filtered.some(m => m.id === newMessage.id);
        if (exists) {
          console.log('🚫 Message already exists, skipping duplicate:', newMessage.id);
          return filtered;
        }

        // Safely handle timestamp for the new message - backend may use createdAt
        let timestamp: Date;
        try {
          const timestampValue = (newMessage as any).timestamp || (newMessage as any).createdAt;
          if (timestampValue) {
            timestamp = new Date(timestampValue);
            if (isNaN(timestamp.getTime())) {
              console.warn('Invalid timestamp for new message', newMessage.id, ':', timestampValue);
              timestamp = new Date();
            }
          } else {
            timestamp = new Date();
          }
        } catch (error) {
          console.error('Error parsing timestamp for new message', newMessage.id, ':', error);
          timestamp = new Date();
        }

        console.log('✅ Adding confirmed message to chat:', newMessage.content.substring(0, 50));
        return [...filtered, { ...newMessage, member: currentMember, timestamp }];
      });

      setMessageInput('');
      setIsTyping(false);

      // Delayed refresh to get AI responses, but only if WebSocket is not working
      setTimeout(() => {
        if (!wsService.isConnected()) {
          console.log('🔄 WebSocket not connected, refreshing for AI responses...');
          queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
        } else {
          console.log('✅ WebSocket connected, skipping refresh (will get AI via WebSocket)');
        }
      }, 2000); // Increased delay to allow AI processing
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
      console.error('Send message error:', error);
    },
    retry: 2,
    retryDelay: 1000,
  });

  // WebSocket connection and real-time messaging
  useEffect(() => {
    let isMounted = true;
    let pollInterval: NodeJS.Timeout;

    const initializeWebSocket = async () => {
      console.log('🔌 Initializing WebSocket connection...');
      try {
        await wsService.connect();
        if (isMounted) {
          await wsService.joinGroup(groupId);
          console.log('✅ WebSocket initialized successfully');
        }
      } catch (error) {
        console.error('❌ Failed to connect to WebSocket, falling back to polling:', error);
        // Fall back to polling for messages every 5 seconds (less aggressive)
        if (isMounted) {
          console.log('📡 Starting message polling fallback (WebSocket failed)');
          pollInterval = setInterval(() => {
            console.log('🔄 Polling for new messages (WebSocket fallback)...');
            queryClient.invalidateQueries({ queryKey: ['messages', groupId] });
          }, 5000); // Increased from 3000ms to 5000ms to reduce race conditions
        }
      }
    };

    const handleNewMessage = (message: Message) => {
      console.log('📨 Received new message via WebSocket:', message);
      if (isMounted) {
        queryClient.setQueryData<MessageWithMember[]>(['messages', groupId], (old: MessageWithMember[] | undefined = []) => {
          // Enhanced duplicate prevention - check by ID and content/timestamp similarity
          const isDuplicate = old.some(m => {
            // Check by ID first
            if (m.id === message.id) return true;

            // Check for near-duplicate content from same member within 5 seconds
            if (m.memberId === message.memberId && m.content === message.content) {
              const messageTime = new Date((message as any).timestamp || (message as any).createdAt || Date.now()).getTime();
              const existingTime = new Date(m.timestamp).getTime();
              return Math.abs(messageTime - existingTime) < 5000; // 5 second window
            }

            return false;
          });

          if (isDuplicate) {
            console.log('🚫 Duplicate message detected, skipping:', message.id);
            return old;
          }

          // Safely handle timestamp conversion - backend may use createdAt
          let timestamp: Date;
          try {
            const timestampValue = (message as any).timestamp || (message as any).createdAt;
            if (timestampValue) {
              timestamp = new Date(timestampValue);
              // Validate the date is actually valid
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp for WebSocket message', message.id, ':', timestampValue);
                timestamp = new Date(); // Fallback to current time
              }
            } else {
              console.warn('Missing timestamp for WebSocket message', message.id);
              timestamp = new Date(); // Fallback to current time
            }
          } catch (error) {
            console.error('Error parsing timestamp for WebSocket message', message.id, ':', error);
            timestamp = new Date(); // Fallback to current time
          }

          const messageWithUser: MessageWithMember = {
            ...message,
            member: currentMember.id === message.memberId ? currentMember : undefined,
            timestamp,
          };

          console.log('✅ Added WebSocket message to chat:', messageWithUser.content.substring(0, 50));
          return [...old, messageWithUser];
        });
      }
    };

    initializeWebSocket();
    wsService.onNewMessage(handleNewMessage);

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      wsService.offNewMessage(handleNewMessage);
      wsService.leaveGroup(groupId);
    };
  }, [groupId, currentMember, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicators
  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    sendMessageMutation.mutate(messageInput);
  };

  const handleRequestFacilitator = async (type: 'general' | 'check_in' | 'welcome') => {
    try {
      // Always use message fallback for reliability
      const facilitatorTriggers = {
        general: "I'd like some facilitator guidance and support.",
        check_in: "Can we do a group check-in?",
        welcome: "Hello everyone, I'm new here."
      };

      console.log(`🤖 Requesting Maya via message: "${facilitatorTriggers[type]}"`);
      await sendMessageMutation.mutateAsync(facilitatorTriggers[type]);
      toast.success('Maya should respond to your message...');
    } catch (error) {
      console.error('Failed to request facilitator:', error);
      toast.error('Failed to send facilitator request message');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    setIsTyping(true);
  };

  const addReaction = (messageId: string, emoji: string) => {
    // Implementation for adding reactions
    console.log('Adding reaction:', messageId, emoji);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
            <p className="text-sm text-gray-500">
              {group.members.length} members • {group.type} • {wsService.isConnected() ? '🟢 Real-time' : '🟡 Polling'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              <div
                className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center"
                title={`${currentMember.firstName} ${currentMember.lastName}`}
              >
                <span className="text-xs font-medium text-primary-600">
                  {currentMember.firstName[0]}{currentMember.lastName[0]}
                </span>
              </div>
              {group.members.length > 1 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    +{group.members.length - 1}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble
                message={message}
                currentMember={currentMember}
                onAddReaction={addReaction}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 px-6 py-4">
        {/* Facilitator Request Buttons */}
        <div className="flex gap-2 mb-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRequestFacilitator('general')}
            className="text-xs"
          >
            <Bot className="w-3 h-3 mr-1" />
            Ask Maya
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRequestFacilitator('check_in')}
            className="text-xs"
          >
            Check-in
          </Button>
        </div>

        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1 relative">
            <Input
              value={messageInput}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="pr-12"
              disabled={sendMessageMutation.isPending}
            />
            {isTyping && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            className="px-4"
          >
            {sendMessageMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: MessageWithMember;
  currentMember: Member;
  onAddReaction: (messageId: string, emoji: string) => void;
}

function MessageBubble({ message, currentMember, onAddReaction }: MessageBubbleProps) {
  const isOwnMessage = message.memberId === currentMember.id;
  const isAI = message.type === 'ai_facilitator';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex',
      isOwnMessage ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-xs lg:max-w-md',
        isOwnMessage ? 'order-2' : 'order-1'
      )}>
        {/* User info */}
        {!isOwnMessage && (
          <div className="flex items-center space-x-2 mb-1">
            {isAI ? (
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center border border-primary-200">
                <span className="text-xs font-bold text-primary-600">M</span>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {message.member?.firstName?.[0] || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-900">
              {isAI 
                ? (message.member?.firstName === 'Maya' 
                    ? `${message.member.firstName} ${message.member.lastName || '(AI Facilitator)'}` 
                    : 'Maya (AI Facilitator)')
                : (message.member?.firstName || 'Unknown User')
              }
            </span>
            <span className="text-xs text-gray-500">
              {message.timestamp && !isNaN(message.timestamp.getTime())
                ? formatDistanceToNow(message.timestamp, { addSuffix: true })
                : 'just now'
              }
            </span>
          </div>
        )}

        {/* Message content */}
        <div className={cn(
          'relative rounded-lg px-4 py-2 shadow-sm',
          isOwnMessage
            ? 'bg-primary-600 text-white'
            : isAI
            ? 'bg-blue-50 text-blue-900 border border-blue-200'
            : 'bg-gray-100 text-gray-900'
        )}>
          {message.isLoading && (
            <div className="absolute -top-1 -right-1">
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
          )}

          {message.error && (
            <div className="absolute -top-1 -right-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          )}

          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter
                      style={oneLight as any}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction: { emoji: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined; members: string | string[]; }, index: Key | null | undefined) => (
                <button
                  key={index}
                  onClick={() => onAddReaction(message.id, reaction.emoji as string)}
                  className={cn(
                    'inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs',
                    reaction.members.includes(currentMember.id)
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.members.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick reactions */}
          {!isOwnMessage && !message.isLoading && (
            <div className="flex space-x-1 mt-2">
              <button title="Love"
                onClick={() => onAddReaction(message.id, '❤️')}
                className="opacity-60 hover:opacity-100 text-xs"
              >
                <Heart className="w-3 h-3" />
              </button>
              <button title="Thumbs Up"
                onClick={() => onAddReaction(message.id, '👍')}
                className="opacity-60 hover:opacity-100 text-xs"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
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
    </div>
  );
}