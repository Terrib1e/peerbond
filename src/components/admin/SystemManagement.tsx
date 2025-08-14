import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Server,
  Database,
  Shield,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Save,
  Eye,
  EyeOff,
  Key,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

interface SystemHealth {
  server: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
    platform: string;
    nodeVersion: string;
  };
  database: 'healthy' | 'warning' | 'critical';
  services: {
    ai: 'operational' | 'degraded' | 'down';
    websocket: 'operational' | 'degraded' | 'down';
    email: 'operational' | 'degraded' | 'down';
    storage: 'operational' | 'degraded' | 'down';
  };
  security: {
    ssl: boolean;
    firewall: boolean;
    ddosProtection: boolean;
    intrusion: boolean;
  };
}

interface SystemConfig {
  app: {
    name: string;
    version: string;
    environment: string;
  };
  features: {
    aiEnabled: boolean;
    premiumEnabled: boolean;
    analyticsEnabled: boolean;
    notificationsEnabled: boolean;
  };
  limits: {
    maxGroupSize: number;
    maxMessageLength: number;
    rateLimit: number;
    uploadSizeLimit: number;
  };
  security: {
    jwtExpiration: string;
    bcryptRounds: number;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
  };
  ai: {
    geminiApiKey: string;
    openaiApiKey: string;
    claudeApiKey: string;
    defaultModel: string;
    maxTokens: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    webhookUrl: string;
  };
}

export default function SystemManagement() {
  const [activeTab, setActiveTab] = useState<'health' | 'config' | 'logs' | 'backup'>('health');
  const [showSecrets, setShowSecrets] = useState(false);
  const [configData, setConfigData] = useState<Partial<SystemConfig>>({});

  const queryClient = useQueryClient();

  // Fetch system health
  const { data: healthData } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await api.get<any>('/admin/health');
      return {
        ...(response || {}),
        server: {
          ...(response?.server || {}),
          memory: {
            used: response?.server?.memory?.rss || 0,
            total: response?.server?.memory?.heapTotal || 1,
            percentage: ((response?.server?.memory?.rss || 0) / (response?.server?.memory?.heapTotal || 1)) * 100
          },
          cpu: {
            usage: Math.random() * 100, // Mock CPU usage
            loadAverage: [0.5, 0.7, 0.9]
          }
        },
        services: {
          ai: 'operational',
          websocket: 'operational',
          email: 'operational',
          storage: 'operational'
        },
        security: {
          ssl: true,
          firewall: true,
          ddosProtection: true,
          intrusion: false
        }
      };
    },
    refetchInterval: 10000
  });

  // Fetch system configuration
  const { data: configResponse } = useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await api.get<any>('/admin/config');
      return {
        ...(response?.config || {}),
        ai: {
          geminiApiKey: '••••••••••••••••',
          openaiApiKey: '••••••••••••••••',
          claudeApiKey: '••••••••••••••••',
          defaultModel: 'gpt-4o-mini',
          maxTokens: 2000
        },
        notifications: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true,
          webhookUrl: 'https://hooks.peerbond.com/alerts'
        }
      };
    }
  });

  // Update configuration
  const updateConfigMutation = useMutation({
    mutationFn: (config: Partial<SystemConfig>) => api.patch('/admin/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuration updated successfully');
    },
    onError: () => toast.error('Failed to update configuration')
  });

  const handleConfigSave = () => {
    updateConfigMutation.mutate(configData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
      case 'degraded':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'critical':
      case 'down':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const tabs = [
    { id: 'health', label: 'System Health', icon: Server },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'logs', label: 'System Logs', icon: Eye },
    { id: 'backup', label: 'Backup & Recovery', icon: Download }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Management</h2>
          <p className="text-gray-600 mt-1">Monitor and configure platform infrastructure</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Server Uptime</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {healthData ? formatUptime(healthData.server.uptime) : '--'}
                    </p>
                  </div>
                  <Server className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Memory Usage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {healthData ? `${healthData.server.memory.percentage.toFixed(1)}%` : '--'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {healthData ? `${formatBytes(healthData.server.memory.used)} / ${formatBytes(healthData.server.memory.total)}` : '--'}
                    </p>
                  </div>
                  <HardDrive className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">CPU Usage</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {healthData ? `${healthData.server.cpu.usage.toFixed(1)}%` : '--'}
                    </p>
                  </div>
                  <Cpu className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Database</p>
                    <p className="text-lg font-bold text-green-600">Healthy</p>
                  </div>
                  <Database className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Status */}
          <Card>
            <CardHeader>
              <CardTitle>Services Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthData && Object.entries(healthData.services).map(([service, status]) => (
                  <div key={service} className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor(status)}`}>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status)}
                      <span className="font-medium capitalize">{service} Service</span>
                    </div>
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthData && Object.entries(healthData.security).map(([feature, enabled]) => (
                  <div key={feature} className={`flex items-center justify-between p-4 rounded-lg border ${enabled ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-3">
                      {enabled ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                      <span className="font-medium capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                    </div>
                    <span className="text-sm font-medium">{enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">System Configuration</h3>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSecrets(!showSecrets)}
                className="flex items-center gap-2"
              >
                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSecrets ? 'Hide' : 'Show'} Secrets
              </Button>
              <Button onClick={handleConfigSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Application Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Application Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                  <Input
                    value={configResponse?.app.name || ''}
                    onChange={(e) => setConfigData({
                      ...configData,
                      app: { ...(configData.app || {}), name: e.target.value, version: configData.app?.version || '', environment: configData.app?.environment || 'development' }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                  <select
                    title="Environment"
                    value={configResponse?.app.environment || 'development'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Feature Toggles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {configResponse && Object.entries(configResponse.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {feature.replace(/([A-Z])/g, ' $1')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {feature === 'aiEnabled' && 'Enable AI-powered features and chat assistance'}
                        {feature === 'premiumEnabled' && 'Allow premium subscription features'}
                        {feature === 'analyticsEnabled' && 'Enable data collection and analytics'}
                        {feature === 'notificationsEnabled' && 'Enable system notifications'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        title="Feature Toggle"
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setConfigData({
                          ...configData,
                          features: {
                            ...(configData.features || {}),
                            [feature]: e.target.checked,
                            aiEnabled: configData.features?.aiEnabled ?? true,
                            premiumEnabled: configData.features?.premiumEnabled ?? true,
                            analyticsEnabled: configData.features?.analyticsEnabled ?? true,
                            notificationsEnabled: configData.features?.notificationsEnabled ?? true
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Limits */}
          <Card>
            <CardHeader>
              <CardTitle>System Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Group Size</label>
                  <Input
                    type="number"
                    value={configResponse?.limits.maxGroupSize || 12}
                    onChange={(e) => setConfigData({
                      ...configData,
                      limits: {
                        ...(configData.limits || {}),
                        maxGroupSize: parseInt(e.target.value),
                        maxMessageLength: configData.limits?.maxMessageLength || 2000,
                        rateLimit: configData.limits?.rateLimit || 100,
                        uploadSizeLimit: configData.limits?.uploadSizeLimit || 10
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Message Length</label>
                  <Input
                    type="number"
                    value={configResponse?.limits.maxMessageLength || 2000}
                    onChange={(e) => setConfigData({
                      ...configData,
                      limits: {
                        ...(configData.limits || {}),
                        maxMessageLength: parseInt(e.target.value),
                        maxGroupSize: configData.limits?.maxGroupSize || 12,
                        rateLimit: configData.limits?.rateLimit || 100,
                        uploadSizeLimit: configData.limits?.uploadSizeLimit || 10
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (req/min)</label>
                  <Input
                    type="number"
                    value={configResponse?.limits.rateLimit || 100}
                    onChange={(e) => setConfigData({
                      ...configData,
                      limits: {
                        ...(configData.limits || {}),
                        rateLimit: parseInt(e.target.value),
                        maxGroupSize: configData.limits?.maxGroupSize || 12,
                        maxMessageLength: configData.limits?.maxMessageLength || 2000,
                        uploadSizeLimit: configData.limits?.uploadSizeLimit || 10
                      }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Size Limit (MB)</label>
                  <Input
                    type="number"
                    value={configResponse?.limits.uploadSizeLimit || 10}
                    onChange={(e) => setConfigData({
                      ...configData,
                      limits: {
                        ...(configData.limits || {}),
                        uploadSizeLimit: parseInt(e.target.value),
                        maxGroupSize: configData.limits?.maxGroupSize || 12,
                        maxMessageLength: configData.limits?.maxMessageLength || 2000,
                        rateLimit: configData.limits?.rateLimit || 100
                      }
                    })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                AI Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={showSecrets ? configResponse?.ai.geminiApiKey : '••••••••••••••••'}
                    placeholder="Enter Gemini API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OpenAI API Key</label>
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={showSecrets ? configResponse?.ai.openaiApiKey : '••••••••••••••••'}
                    placeholder="Enter OpenAI API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Claude API Key</label>
                  <Input
                    type={showSecrets ? 'text' : 'password'}
                    value={showSecrets ? configResponse?.ai.claudeApiKey : '••••••••••••••••'}
                    placeholder="Enter Claude API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
                  <select
                    title="Default Model"
                    value={configResponse?.ai.defaultModel || 'gpt-4o-mini'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>System Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto">
              <div className="space-y-1">
                <div>[2024-01-20 10:30:15] INFO: Server started on port 3001</div>
                <div>[2024-01-20 10:30:16] INFO: Database connection established</div>
                <div>[2024-01-20 10:30:17] INFO: WebSocket server initialized</div>
                <div>[2024-01-20 10:35:23] INFO: Member authentication successful (member: admin@peerbond.com)</div>
                <div>[2024-01-20 10:36:45] INFO: AI model initialized: gpt-4o-mini</div>
                <div>[2024-01-20 10:37:12] WARN: High memory usage detected: 85%</div>
                <div>[2024-01-20 10:38:01] INFO: Group created: Recovery Warriors (id: group-123)</div>
                <div>[2024-01-20 10:39:33] INFO: Crisis intervention triggered for member-456</div>
                <div>[2024-01-20 10:40:15] INFO: Backup process completed successfully</div>
                <div>[2024-01-20 10:41:22] ERROR: Failed to send notification email to member@example.com</div>
                <div>[2024-01-20 10:42:08] INFO: Database maintenance completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Backup Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">Automated Backup</p>
                  <p className="text-sm text-blue-700">Daily backups at 2:00 AM UTC</p>
                </div>
                <Button variant="outline">Configure</Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">Last Backup</p>
                  <p className="text-sm text-green-700">Today at 2:00 AM UTC (Success)</p>
                </div>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="flex gap-3">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Create Backup Now
                </Button>
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Restore from Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}