import { useState, useEffect } from 'react';
import { Bot, Brain, Zap, Heart, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

import AIChatInterface from '@/components/chat/AIChatInterface';
import AIToolsPanel from '@/components/ai/AIToolsPanel';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, OrchestrationSystem } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

function AIToolsPage() {
  const { user } = useAuthStore();
  const [systemStatus, setSystemStatus] = useState<{
    [key in OrchestrationSystem]: 'checking' | 'healthy' | 'error';
  }>({
    simple: 'checking',
    production: 'checking',
    main: 'checking',
    working: 'checking'
  });
  const [selectedDemo, setSelectedDemo] = useState<'chat' | 'tools' | 'status'>('chat');

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    // Check all orchestration systems now that they're fixed
    const systems: OrchestrationSystem[] = ['simple', 'production', 'main'];

    for (const system of systems) {
      try {
        await api.checkOrchestrationHealth(system);
        setSystemStatus(prev => ({ ...prev, [system]: 'healthy' }));
      } catch (error) {
        console.warn(`Health check failed for ${system}:`, error);
        setSystemStatus(prev => ({ ...prev, [system]: 'error' }));
      }
    }

    // Mark working as healthy since it's our fallback
    setSystemStatus(prev => ({ ...prev, working: 'healthy' }));
  };

  const systemConfigs = {
    simple: {
      name: 'Simple AI',
      icon: Zap,
      description: 'Quick responses for immediate support',
      features: ['Fast responses', 'Basic conversation', 'Lightweight processing'],
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    production: {
      name: 'Full AI Agents',
      icon: Brain,
      description: 'Complete multi-agent therapeutic system',
      features: ['Crisis detection', 'Group matching', 'Therapeutic facilitation', 'Progress insights'],
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    main: {
      name: 'Advanced AI',
      icon: Bot,
      description: 'Next-generation orchestration platform',
      features: ['Advanced reasoning', 'Context awareness', 'Personalized responses'],
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  };

  const StatusIcon = ({ status }: { status: 'checking' | 'healthy' | 'error' }) => {
    switch (status) {
      case 'checking':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="p-8 text-center">
          <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h2>
          <p className="text-gray-600">You need to be signed in to access AI wellness tools.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI-Powered Wellness Tools</h1>
        <p className="text-gray-600 mb-6">
          Experience our intelligent therapeutic agents designed for peer support and mental wellness.
        </p>

        {/* Navigation */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedDemo === 'chat' ? 'default' : 'outline'}
            onClick={() => setSelectedDemo('chat')}
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Chat
          </Button>
          <Button
            variant={selectedDemo === 'status' ? 'default' : 'outline'}
            onClick={() => setSelectedDemo('status')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            System Status
          </Button>
          <Button
            variant={selectedDemo === 'tools' ? 'default' : 'outline'}
            onClick={() => setSelectedDemo('tools')}
          >
            <Brain className="w-4 h-4 mr-2" />
            AI Tools
          </Button>
        </div>
      </div>

      {selectedDemo === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AIChatInterface currentUser={user} className="h-[600px]" />
          </div>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                AI Capabilities
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>🤖 <strong>FacilitatorAgent:</strong> Therapeutic conversation guidance</p>
                <p>💭 <strong>SentimentAgent:</strong> Mood analysis and crisis detection</p>
                <p>🔗 <strong>MatchingAgent:</strong> Group and peer recommendations</p>
                <p>📊 <strong>InsightAgent:</strong> Progress tracking and insights</p>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                Safety Features
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>🚨 Automatic crisis detection</p>
                <p>🛡️ HIPAA-compliant processing</p>
                <p>👥 Therapist escalation protocols</p>
                <p>📝 Session analytics and insights</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {selectedDemo === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(systemConfigs).map(([key, config]) => {
            const Icon = config.icon;
            const status = systemStatus[key as OrchestrationSystem];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * Object.keys(systemConfigs).indexOf(key) }}
              >
                <Card className={cn(
                  'p-6 h-full transition-all duration-200',
                  config.bgColor,
                  config.borderColor,
                  status === 'healthy' ? 'ring-2 ring-green-200' : '',
                  status === 'error' ? 'ring-2 ring-red-200' : ''
                )}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-6 h-6', config.color)} />
                      <h3 className="font-semibold">{config.name}</h3>
                    </div>
                    <StatusIcon status={status} />
                  </div>

                  <p className="text-gray-600 text-sm mb-4">{config.description}</p>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Features:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {config.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className={cn('w-1.5 h-1.5 rounded-full',
                            status === 'healthy' ? 'bg-green-500' :
                            status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                          )} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <span className={cn(
                        'font-medium capitalize',
                        status === 'healthy' ? 'text-green-600' :
                        status === 'error' ? 'text-red-600' : 'text-yellow-600'
                      )}>
                        {status === 'checking' ? 'Checking...' : status}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedDemo === 'tools' && (
        <AIToolsPanel groupId="ai-tools-demo" />
      )}
    </div>
  );
}

export default AIToolsPage;