/**
 * AI Agent Presence Indicator - Shows active AI agents in group chat
 */

import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Heart, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Bot,
  Zap,
  Eye,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';

export interface AIAgentStatus {
  facilitator: boolean;      // Maya - therapeutic support
  sentiment: boolean;        // Sentiment monitoring
  crisis: boolean;          // Crisis detection active
  insight: boolean;         // Progress tracking
  matching: boolean;        // Group recommendations
}

export interface GroupContext {
  mood?: 'positive' | 'neutral' | 'concerning' | 'crisis';
  activity?: 'high' | 'moderate' | 'low';
  memberCount?: number;
}

interface AIAgentIndicatorProps {
  agentStatus: AIAgentStatus;
  groupContext?: GroupContext;
  isConnected?: boolean;
  className?: string;
  variant?: 'compact' | 'detailed' | 'floating';
}

const AGENT_CONFIGS = {
  facilitator: {
    name: 'Maya',
    description: 'Therapeutic facilitator',
    icon: Heart,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    activeColor: 'bg-purple-500'
  },
  sentiment: {
    name: 'Sentiment Monitor',
    description: 'Emotional analysis',
    icon: Eye,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    activeColor: 'bg-blue-500'
  },
  crisis: {
    name: 'Crisis Detection',
    description: 'Safety monitoring',
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    activeColor: 'bg-red-500'
  },
  insight: {
    name: 'Progress Insights',
    description: 'Growth tracking',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    activeColor: 'bg-green-500'
  },
  matching: {
    name: 'Group Matching',
    description: 'Connection suggestions',
    icon: Users,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    activeColor: 'bg-orange-500'
  }
};

const MOOD_INDICATORS = {
  positive: { color: 'text-green-500', bgColor: 'bg-green-100', label: 'Positive' },
  neutral: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Neutral' },
  concerning: { color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'Needs Support' },
  crisis: { color: 'text-red-500', bgColor: 'bg-red-100', label: 'Crisis Detected' }
};

export default function AIAgentIndicator({ 
  agentStatus, 
  groupContext, 
  isConnected = true, 
  className,
  variant = 'detailed'
}: AIAgentIndicatorProps) {
  console.log('🤖 [AI-INDICATOR] Received agentStatus:', agentStatus);
  console.log('🤖 [AI-INDICATOR] isConnected:', isConnected);
  
  const activeAgents = Object.entries(agentStatus).filter(([_, active]) => active);
  const agentCount = activeAgents.length;
  
  console.log('🤖 [AI-INDICATOR] Active agents:', activeAgents);
  console.log('🤖 [AI-INDICATOR] Agent count:', agentCount);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 px-3 py-2 bg-white border rounded-lg shadow-sm', className)}>
        <div className="flex items-center gap-1">
          <Bot className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">
            {agentCount} AI {agentCount === 1 ? 'Agent' : 'Agents'}
          </span>
        </div>
        
        {isConnected && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600">Active</span>
          </div>
        )}

        {groupContext?.mood && (
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            MOOD_INDICATORS[groupContext.mood].color,
            MOOD_INDICATORS[groupContext.mood].bgColor
          )}>
            {MOOD_INDICATORS[groupContext.mood].label}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'floating') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-lg border p-4 max-w-xs',
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="font-semibold text-gray-800">AI Agents</span>
          </div>
          <div className={cn(
            'w-3 h-3 rounded-full',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          )} />
        </div>

        <div className="space-y-2">
          {activeAgents.map(([agentKey]) => {
            const config = AGENT_CONFIGS[agentKey as keyof AIAgentStatus];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={agentKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-sm"
              >
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  config.bgColor,
                  config.borderColor,
                  'border'
                )}>
                  <Icon className={cn('w-3 h-3', config.color)} />
                </div>
                <span className="text-gray-700">{config.name}</span>
              </motion.div>
            );
          })}
        </div>

        {groupContext && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-gray-500 mb-1">Group Status</div>
            <div className="flex items-center justify-between text-sm">
              {groupContext.mood && (
                <span className={cn('font-medium', MOOD_INDICATORS[groupContext.mood].color)}>
                  {MOOD_INDICATORS[groupContext.mood].label}
                </span>
              )}
              {groupContext.activity && (
                <span className="text-gray-600 capitalize">{groupContext.activity} Activity</span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Default detailed variant
  return (
    <div className={cn('bg-white border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-gray-800">AI Agents</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
          )} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence>
          {Object.entries(AGENT_CONFIGS).map(([agentKey, config]) => {
            const isActive = agentStatus[agentKey as keyof AIAgentStatus];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={agentKey}
                initial={{ opacity: 0.5 }}
                animate={{ 
                  opacity: isActive ? 1 : 0.3,
                  scale: isActive ? 1 : 0.95
                }}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
                  isActive ? config.bgColor : 'bg-gray-50',
                  isActive ? config.borderColor : 'border-gray-200'
                )}
              >
                <div className="relative">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border',
                    isActive ? config.bgColor : 'bg-white',
                    isActive ? config.borderColor : 'border-gray-200'
                  )}>
                    <Icon className={cn(
                      'w-4 h-4',
                      isActive ? config.color : 'text-gray-400'
                    )} />
                  </div>
                  
                  {isActive && (
                    <div className={cn(
                      'absolute -top-1 -right-1 w-3 h-3 rounded-full',
                      config.activeColor
                    )}>
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'font-medium',
                      isActive ? 'text-gray-800' : 'text-gray-500'
                    )}>
                      {config.name}
                    </span>
                    
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">Active</span>
                      </motion.div>
                    )}
                  </div>
                  
                  <p className={cn(
                    'text-sm',
                    isActive ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {config.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {groupContext && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium text-gray-800 mb-2">Group Context</h4>
          <div className="grid grid-cols-2 gap-3">
            {groupContext.mood && (
              <div className={cn(
                'px-3 py-2 rounded-lg text-center',
                MOOD_INDICATORS[groupContext.mood].bgColor
              )}>
                <div className="text-xs text-gray-600 mb-1">Mood</div>
                <div className={cn(
                  'font-medium text-sm',
                  MOOD_INDICATORS[groupContext.mood].color
                )}>
                  {MOOD_INDICATORS[groupContext.mood].label}
                </div>
              </div>
            )}
            
            {groupContext.activity && (
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-center">
                <div className="text-xs text-gray-600 mb-1">Activity</div>
                <div className="font-medium text-sm text-gray-800 capitalize">
                  {groupContext.activity}
                </div>
              </div>
            )}
            
            {groupContext.memberCount && (
              <div className="px-3 py-2 bg-blue-50 rounded-lg text-center col-span-2">
                <div className="text-xs text-gray-600 mb-1">Members</div>
                <div className="font-medium text-sm text-blue-600">
                  {groupContext.memberCount} {groupContext.memberCount === 1 ? 'Member' : 'Members'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}