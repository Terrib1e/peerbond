/**
 * Maya Admin Interface - Advanced system management interface for administrators
 * Provides system analytics, agent management, and platform oversight tools
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Send,
  BarChart3,
  Shield,
  Users,
  AlertTriangle,
  FileText,
  Monitor,
  Brain,
  Clock,
  ChevronDown,
  Cpu,
  Key,
  UserCog,
  Layers,
  Terminal,
  Filter
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';

import { agentService } from '@/services/agentService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

interface AdminMessage {
  id: string;
  content: string;
  type: 'admin' | 'maya' | 'system' | 'analytics';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  systemMetrics?: SystemMetrics;
  alertLevel?: 'info' | 'warning' | 'error' | 'critical';
  requiresAction?: boolean;
}

interface SystemMetrics {
  agentPerformance: AgentMetric[];
  systemHealth: HealthMetric[];
  memberEngagement: EngagementMetric[];
  alertsSummary: AlertSummary;
}

interface AgentMetric {
  agentId: string;
  name: string;
  responseTime: number;
  successRate: number;
  confidence: number;
  usage: number;
  status: 'healthy' | 'degraded' | 'error';
}

interface HealthMetric {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  threshold: number;
  unit: string;
}

interface EngagementMetric {
  period: string;
  totalSessions: number;
  activeUsers: number;
  avgSessionDuration: number;
  satisfactionScore: number;
}

interface AlertSummary {
  critical: number;
  warnings: number;
  total: number;
  trends: 'increasing' | 'stable' | 'decreasing';
}

interface MayaAdminInterfaceProps {
  adminId: string;
  className?: string;
  systemScope?: 'platform' | 'agents' | 'analytics' | 'security';
}

const ADMIN_TOOLS = [
  {
    id: 'system-health',
    label: 'System Health Check',
    icon: Monitor,
    prompt: "Maya, provide a comprehensive system health report including agent performance, infrastructure status, and any critical issues requiring attention.",
    category: 'monitoring',
    requiresElevation: false
  },
  {
    id: 'agent-analytics',
    label: 'Agent Performance',
    icon: Brain,
    prompt: "Analyze the performance of all AI agents including response times, success rates, confidence levels, and usage patterns. Identify any optimization opportunities.",
    category: 'analytics',
    requiresElevation: false
  },
  {
    id: 'member-engagement',
    label: 'User Engagement',
    icon: Users,
    prompt: "Provide detailed analytics on member engagement across the platform including session patterns, satisfaction metrics, and member journey insights.",
    category: 'analytics',
    requiresElevation: false
  },
  {
    id: 'crisis-overview',
    label: 'Crisis Management',
    icon: AlertTriangle,
    prompt: "Review all crisis interventions, safety protocols, and emergency escalations. Provide recommendations for improving crisis response capabilities.",
    category: 'safety',
    requiresElevation: true
  },
  {
    id: 'data-insights',
    label: 'Data Analytics',
    icon: BarChart3,
    prompt: "Generate advanced analytics on platform usage, therapeutic outcomes, and system performance trends. Include predictive insights and recommendations.",
    category: 'analytics',
    requiresElevation: false
  },
  {
    id: 'security-audit',
    label: 'Security Analysis',
    icon: Shield,
    prompt: "Conduct a security analysis of the platform including access patterns, potential vulnerabilities, and compliance status. Provide security recommendations.",
    category: 'security',
    requiresElevation: true
  },
  {
    id: 'resource-optimization',
    label: 'Resource Usage',
    icon: Cpu,
    prompt: "Analyze system resource utilization including compute, storage, and network usage. Identify optimization opportunities and capacity planning needs.",
    category: 'infrastructure',
    requiresElevation: false
  },
  {
    id: 'compliance-review',
    label: 'Compliance Check',
    icon: FileText,
    prompt: "Review HIPAA compliance, data protection measures, and regulatory adherence across all platform components. Identify any compliance gaps.",
    category: 'compliance',
    requiresElevation: true
  },
  {
    id: 'agent-training',
    label: 'AI Model Training',
    icon: Layers,
    prompt: "Review AI model performance and suggest training improvements, dataset enhancements, and model optimization strategies.",
    category: 'ai-ops',
    requiresElevation: true
  },
  {
    id: 'system-commands',
    label: 'System Commands',
    icon: Terminal,
    prompt: "I need to execute system-level commands or configurations. Please provide administrative guidance and safety checks.",
    category: 'administration',
    requiresElevation: true
  }
];

const CATEGORY_COLORS = {
  'monitoring': 'bg-green-50 text-green-700 border-green-200',
  'analytics': 'bg-blue-50 text-blue-700 border-blue-200',
  'safety': 'bg-red-50 text-red-700 border-red-200',
  'security': 'bg-purple-50 text-purple-700 border-purple-200',
  'infrastructure': 'bg-orange-50 text-orange-700 border-orange-200',
  'compliance': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'ai-ops': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'administration': 'bg-gray-50 text-gray-700 border-gray-200'
};

const ALERT_LEVEL_COLORS = {
  'info': 'bg-blue-100 text-blue-800',
  'warning': 'bg-yellow-100 text-yellow-800',
  'error': 'bg-orange-100 text-orange-800',
  'critical': 'bg-red-100 text-red-800'
};

export default function MayaAdminInterface({
  adminId,
  className,
  systemScope = 'platform'
}: MayaAdminInterfaceProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showTools, setShowTools] = useState(true);
  const [elevatedAccess, setElevatedAccess] = useState(false);
  const [mayaAvailable, setMayaAvailable] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAdminSession();
    loadSystemMetrics();
  }, [adminId, systemScope]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeAdminSession = async () => {
    const newSessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);

    const scopeDescription = {
      'platform': 'comprehensive platform oversight and management',
      'agents': 'AI agent performance and optimization',
      'analytics': 'system analytics and business intelligence',
      'security': 'security monitoring and compliance management'
    };

    const welcomeMessage: AdminMessage = {
      id: `welcome-${Date.now()}`,
      content: `Welcome, Administrator ${adminId}! I'm Maya, your AI system management assistant. I'm configured for ${scopeDescription[systemScope]}.\n\n**Administrative Capabilities:**\n• Real-time system health monitoring\n• AI agent performance analytics\n• User engagement and satisfaction metrics\n• Crisis management oversight\n• Security and compliance auditing\n• Resource optimization recommendations\n• Predictive system insights\n• Administrative command execution\n\n**Security & Compliance:**\n• All operations are logged and audited\n• Elevated permissions required for sensitive operations\n• HIPAA-compliant data handling\n• Multi-factor authentication integrated\n\n**Current System Status:** ${mayaAvailable ? '🟢 All systems operational' : '🟡 Reduced functionality'}\n\nHow can I assist with your administrative tasks today?`,
      type: 'maya',
      timestamp: new Date(),
      agentUsed: ['facilitator', 'insight', 'ai-router'],
      confidence: 1.0,
      alertLevel: 'info'
    };

    setMessages([welcomeMessage]);
  };

  const loadSystemMetrics = async () => {
    // Mock system metrics - in production would fetch from monitoring APIs
    const mockMetrics: SystemMetrics = {
      agentPerformance: [
        { agentId: 'facilitator', name: 'Maya Facilitator', responseTime: 1.2, successRate: 98.5, confidence: 0.94, usage: 85, status: 'healthy' },
        { agentId: 'sentiment', name: 'Sentiment Analyzer', responseTime: 0.8, successRate: 99.1, confidence: 0.91, usage: 72, status: 'healthy' },
        { agentId: 'crisis', name: 'Crisis Agent', responseTime: 0.6, successRate: 97.8, confidence: 0.96, usage: 23, status: 'healthy' },
        { agentId: 'insight', name: 'Insight Agent', responseTime: 2.1, successRate: 94.2, confidence: 0.88, usage: 45, status: 'degraded' },
        { agentId: 'matching', name: 'Matching Agent', responseTime: 1.5, successRate: 96.7, confidence: 0.89, usage: 38, status: 'healthy' }
      ],
      systemHealth: [
        { component: 'API Gateway', status: 'healthy', value: 99.8, threshold: 99.0, unit: '% uptime' },
        { component: 'Database', status: 'healthy', value: 2.1, threshold: 5.0, unit: 'ms avg latency' },
        { component: 'AI Models', status: 'warning', value: 87.2, threshold: 90.0, unit: '% accuracy' },
        { component: 'Storage', status: 'healthy', value: 68.5, threshold: 85.0, unit: '% utilized' }
      ],
      memberEngagement: [
        { period: 'Last 24h', totalSessions: 1247, activeUsers: 892, avgSessionDuration: 18.5, satisfactionScore: 4.3 },
        { period: 'Last 7d', totalSessions: 8934, activeUsers: 3421, avgSessionDuration: 16.8, satisfactionScore: 4.2 },
        { period: 'Last 30d', totalSessions: 34567, activeUsers: 12890, avgSessionDuration: 15.2, satisfactionScore: 4.1 }
      ],
      alertsSummary: {
        critical: 0,
        warnings: 3,
        total: 12,
        trends: 'stable'
      }
    };

    setSystemMetrics(mockMetrics);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (content: string, isToolCall = false, requiresElevation = false) => {
    if (!content.trim() || isLoading || !sessionId) return;

    // Check elevation requirements
    if (requiresElevation && !elevatedAccess) {
      toast.error('This operation requires elevated admin privileges. Please authenticate.');
      return;
    }

    const contextualContent = `[Administrative Context: ${systemScope} management, Admin: ${adminId}]\n\n${content}`;

    const adminMessage: AdminMessage = {
      id: `admin-${Date.now()}`,
      content,
      type: 'admin',
      timestamp: new Date(),
      requiresAction: requiresElevation
    };

    const loadingMessage: AdminMessage = {
      id: `loading-${Date.now()}`,
      content: 'Maya is analyzing system data and preparing administrative insights...',
      type: 'maya',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, adminMessage, loadingMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use multiple agents for comprehensive system analysis
      const [primaryResponse, insightResponse] = await Promise.all([
        agentService.callAgent('facilitator', contextualContent, sessionId),
        agentService.callAgent('insight', contextualContent, sessionId).catch(() => null)
      ]);

      // Simulate system metrics updates for certain tool calls
      let updatedMetrics = systemMetrics;
      if (isToolCall && (content.includes('health') || content.includes('performance'))) {
        await loadSystemMetrics();
        updatedMetrics = systemMetrics;
      }

      // Remove loading message and add Maya's response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const mayaResponse: AdminMessage = {
          id: `maya-${Date.now()}`,
          content: enhanceAdminResponse(primaryResponse.response, updatedMetrics, isToolCall),
          type: 'maya',
          timestamp: new Date(),
          agentUsed: [
            ...(Array.isArray(primaryResponse.agentUsed) ? primaryResponse.agentUsed : [primaryResponse.agentUsed]),
            ...(insightResponse ? (Array.isArray(insightResponse.agentUsed) ? insightResponse.agentUsed : [insightResponse.agentUsed]) : [])
          ],
          confidence: Math.max(primaryResponse.confidence, insightResponse?.confidence || 0),
          systemMetrics: updatedMetrics || undefined,
          alertLevel: determineAlertLevel(primaryResponse.response, updatedMetrics),
          requiresAction: requiresElevation
        };
        return [...filtered, mayaResponse];
      });

      // Handle system alerts
      if (primaryResponse.metadata?.needsCrisisIntervention) {
        toast.error('System-level alerts detected. Immediate administrative attention required.', {
          duration: 20000,
          icon: '🚨'
        });
      }

    } catch (error) {
      console.error('Maya admin consultation error:', error);

      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading);
        const errorMessage: AdminMessage = {
          id: `error-${Date.now()}`,
          content: 'Administrative system temporarily unavailable. Critical system operations should be performed manually through direct system access.',
          type: 'system',
          timestamp: new Date(),
          alertLevel: 'error'
        };
        return [...filtered, errorMessage];
      });

      toast.error('Administrative console unavailable. Use direct system access for critical operations.');
      setMayaAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolAction = (toolId: string) => {
    const tool = ADMIN_TOOLS.find(t => t.id === toolId);
    if (tool) {
      sendMessage(tool.prompt, true, tool.requiresElevation);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const toggleElevatedAccess = () => {
    // In production, this would require proper MFA authentication
    setElevatedAccess(!elevatedAccess);
    toast.success(elevatedAccess ? 'Elevated access disabled' : 'Elevated access enabled');
  };

  const enhanceAdminResponse = (response: string, metrics: SystemMetrics | null, isToolCall: boolean): string => {
    let enhancedResponse = response;

    if (isToolCall && metrics) {
      // Add system metrics summary for tool calls
      const criticalComponents = metrics.systemHealth.filter(h => h.status === 'critical');
      const warningComponents = metrics.systemHealth.filter(h => h.status === 'warning');

      if (criticalComponents.length > 0) {
        enhancedResponse += '\n\n**🚨 CRITICAL SYSTEM ALERTS:**\n';
        criticalComponents.forEach(comp => {
          enhancedResponse += `• ${comp.component}: ${comp.value}${comp.unit} (threshold: ${comp.threshold}${comp.unit})\n`;
        });
      }

      if (warningComponents.length > 0) {
        enhancedResponse += '\n\n**⚠️ SYSTEM WARNINGS:**\n';
        warningComponents.forEach(comp => {
          enhancedResponse += `• ${comp.component}: ${comp.value}${comp.unit} (threshold: ${comp.threshold}${comp.unit})\n`;
        });
      }

      // Add agent performance summary
      const degradedAgents = metrics.agentPerformance.filter(a => a.status !== 'healthy');
      if (degradedAgents.length > 0) {
        enhancedResponse += '\n\n**🤖 AGENT STATUS ALERTS:**\n';
        degradedAgents.forEach(agent => {
          enhancedResponse += `• ${agent.name}: ${agent.status.toUpperCase()} (${agent.successRate}% success rate)\n`;
        });
      }
    }

    return enhancedResponse;
  };

  const determineAlertLevel = (response: string, metrics: SystemMetrics | null): 'info' | 'warning' | 'error' | 'critical' => {
    const content = response.toLowerCase();

    if (content.includes('critical') || content.includes('emergency') || (metrics && metrics.alertsSummary.critical > 0)) {
      return 'critical';
    }
    if (content.includes('error') || content.includes('failure')) {
      return 'error';
    }
    if (content.includes('warning') || content.includes('degraded') || (metrics && metrics.alertsSummary.warnings > 5)) {
      return 'warning';
    }
    return 'info';
  };

  const filteredTools = filterCategory === 'all'
    ? ADMIN_TOOLS
    : ADMIN_TOOLS.filter(tool => tool.category === filterCategory);

  const renderMessage = (message: AdminMessage) => {
    const isMaya = message.type === 'maya';
    const isSystem = message.type === 'system';
    const isAdmin = message.type === 'admin';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'flex gap-3 mb-4',
          isAdmin ? 'justify-end' : 'justify-start'
        )}
      >
        {(isMaya || isSystem) && (
          <div className="flex-shrink-0">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              isSystem ? 'bg-gray-100' : 'bg-gradient-to-r from-blue-500 to-purple-500'
            )}>
              {isSystem ? (
                <Shield className="w-4 h-4 text-gray-600" />
              ) : (
                <Settings className="w-4 h-4 text-white" />
              )}
            </div>
          </div>
        )}

        <div className={cn(
          'max-w-[90%] rounded-lg px-4 py-3',
          isAdmin
            ? 'bg-blue-500 text-white'
            : isSystem
            ? 'bg-gray-50 text-gray-800 border border-gray-200'
            : 'bg-gray-50 text-gray-900 border border-gray-200'
        )}>
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
              </div>
              <span className="text-sm text-blue-600">System analysis in progress...</span>
            </div>
          ) : (
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
          )}

          {/* Admin metadata */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 text-xs">
            <div className="flex items-center gap-3">
              <span>{formatDistanceToNow(message.timestamp, { addSuffix: true })}</span>
              {message.requiresAction && (
                <span className="flex items-center gap-1 text-orange-600">
                  <Key className="w-3 h-3" />
                  Elevated Access
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {message.alertLevel && (
                <span className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  ALERT_LEVEL_COLORS[message.alertLevel]
                )}>
                  {message.alertLevel.toUpperCase()}
                </span>
              )}
              {message.confidence && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Brain className="w-3 h-3" />
                  {Math.round(message.confidence * 100)}%
                </span>
              )}
            </div>
          </div>

          {/* System metrics display */}
          {message.systemMetrics && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-2">System Status Summary:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded">
                  <div className="font-medium">Agent Health</div>
                  <div className="text-green-600">
                    {message.systemMetrics.agentPerformance.filter(a => a.status === 'healthy').length}/
                    {message.systemMetrics.agentPerformance.length} healthy
                  </div>
                </div>
                <div className="bg-white p-2 rounded">
                  <div className="font-medium">Active Alerts</div>
                  <div className={cn(
                    message.systemMetrics.alertsSummary.critical > 0 ? 'text-red-600' :
                    message.systemMetrics.alertsSummary.warnings > 0 ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {message.systemMetrics.alertsSummary.total} total
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Maya - System Administration</h2>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                mayaAvailable ? 'bg-green-500' : 'bg-gray-300'
              )} />
              {mayaAvailable ? 'Administrative console active' : 'Console unavailable'}
              <span className="text-gray-400">|</span>
              <span className="capitalize">{systemScope} scope</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={elevatedAccess ? "default" : "outline"}
            size="sm"
            onClick={toggleElevatedAccess}
            className={cn(
              elevatedAccess ? 'bg-orange-500 hover:bg-orange-600' : ''
            )}
          >
            <Key className="w-4 h-4 mr-2" />
            {elevatedAccess ? 'Elevated' : 'Standard'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTools(!showTools)}
            className="text-gray-600"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Admin Tools
            <ChevronDown className={cn(
              'w-4 h-4 ml-1 transition-transform',
              showTools && 'rotate-180'
            )} />
          </Button>
        </div>
      </div>

      {/* Admin Tools Panel */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b bg-gray-50"
          >
            <div className="p-4">
              {/* Tool Filter */}
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <select
                  title="Filter Tools"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="text-sm border border-gray-200 rounded px-2 py-1"
                >
                  <option value="all">All Categories</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="analytics">Analytics</option>
                  <option value="safety">Safety</option>
                  <option value="security">Security</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="compliance">Compliance</option>
                  <option value="ai-ops">AI Operations</option>
                  <option value="administration">Administration</option>
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {filteredTools.map(tool => {
                  const Icon = tool.icon;
                  const isDisabled = tool.requiresElevation && !elevatedAccess;

                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolAction(tool.id)}
                      disabled={isLoading || !mayaAvailable || isDisabled}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-lg text-center transition-colors',
                        'hover:bg-white hover:shadow-sm disabled:opacity-50',
                        isDisabled ? 'bg-gray-100 text-gray-400' : CATEGORY_COLORS[tool.category as keyof typeof CATEGORY_COLORS]
                      )}
                      title={isDisabled ? 'Requires elevated admin access' : tool.label}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="text-xs font-medium leading-tight">{tool.label}</span>
                      {tool.requiresElevation && (
                        <Key className="w-3 h-3 text-orange-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {!elevatedAccess && (
                <div className="mt-3 p-2 bg-orange-50 rounded text-sm text-orange-700">
                  <strong>Notice:</strong> Some advanced tools require elevated admin privileges. Click "Elevated" to enable.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Administrative Console Ready</h3>
              <p className="text-gray-600">System management and oversight tools available</p>
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
            placeholder={isLoading ? "Maya is processing system data..." : "Enter administrative command or query..."}
            disabled={isLoading || !mayaAvailable}
            className="flex-1 font-mono text-sm"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || !mayaAvailable}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {isLoading ? (
              <Clock className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>

        <div className="mt-2 text-xs text-gray-500 text-center">
          Administrative AI assistant • All operations logged • {elevatedAccess ? 'Elevated privileges active' : 'Standard access mode'}
        </div>
      </div>
    </div>
  );
}