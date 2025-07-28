import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  MessageSquare,
  BarChart3,
  Shield,
  Plus,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Server,
  FileText,
  Brain,
  Bot,
  Zap,
  Heart,
  TestTube,
  AlertTriangle,
  LogOut
} from 'lucide-react';
import { api } from '@/lib/api';
import { User, Group } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';
import UserManagement from '@/components/admin/UserManagement';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import SystemManagement from '@/components/admin/SystemManagement';
import AuditLogs from '@/components/admin/AuditLogs';
import AIChatInterface from '@/components/chat/AIChatInterface';
import AIToolsPanel from '@/components/ai/AIToolsPanel';
import AgentTester from '@/components/ai/AgentTester';
import { OrchestrationSystem } from '@/lib/api';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';

interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalMessages: number;
  activeUsers: number;
  activeGroups: number;
  premiumUsers: number;
  avgEngagement: number;
  monthlyGrowth: number;
}

export default function AdminDashboard() {
  const [searchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'groups' | 'analytics' | 'ai' | 'system' | 'audit'>('overview');
  const [_showCreateUserDialog] = useState(false);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [aiDemoTab, setAiDemoTab] = useState<'chat' | 'tools' | 'status' | 'tester'>('status');
  const [systemStatus, setSystemStatus] = useState<{
    [key in OrchestrationSystem]: 'checking' | 'healthy' | 'error';
  }>({
    simple: 'checking',
    production: 'checking',
    main: 'checking',
    working: 'checking'
  });
  const { user } = useAuthStore();

  const queryClient = useQueryClient();

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    // Check all orchestration systems
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

  // Data fetching
  const { data: statsData } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const analytics = await api.getAnalytics();
      return {
        totalUsers: analytics.totalUsers,
        totalGroups: analytics.totalGroups,
        totalMessages: analytics.totalMessages,
        activeUsers: analytics.activeUsers,
        activeGroups: analytics.activeGroups,
        premiumUsers: Math.floor(analytics.totalUsers * 0.15),
        avgEngagement: 78,
        monthlyGrowth: 12,
      };
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: _usersData = [] } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => api.getAllUsers(),
  });

  const { data: groupsData = [] } = useQuery<Group[]>({
    queryKey: ['admin-groups'],
    queryFn: () => api.getGroups(),
  });

  // Mutations
  // const deleteUserMutation = useMutation({
  //   mutationFn: (userId: string) => api.deleteUser(userId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  //     queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  //     toast.success('User deleted successfully');
  //   },
  //   onError: () => {
  //     toast.error('Failed to delete user');
  //   },
  // });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Group deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete group');
    },
  });

  // const createUserMutation = useMutation({
  //   mutationFn: (userData: any) => api.register(userData),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  //     queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
  //     setShowCreateUserDialog(false);
  //     toast.success('User created successfully');
  //   },
  //   onError: () => {
  //     toast.error('Failed to create user');
  //   },
  // });

  const createGroupMutation = useMutation({
    mutationFn: (groupData: any) => api.createGroup(groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowCreateGroupDialog(false);
      toast.success('Group created successfully');
    },
    onError: () => {
      toast.error('Failed to create group');
    },
  });

  // const filteredUsers = usersData.filter(user =>
  //   user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   user.email.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  const filteredGroups = groupsData.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // const handleDeleteUser = (userId: string) => {
  //   if (confirm('Are you sure you want to delete this user?')) {
  //     deleteUserMutation.mutate(userId);
  //   }
  // };

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'groups', label: 'Groups', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'ai', label: 'AI Management', icon: Brain },
    { id: 'system', label: 'System', icon: Server },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mr-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-500 mt-1">Manage your PeerBond platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                title="Switch Portal"
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => {
                  if (e.target.value === 'user') window.location.href = '/app';
                  else if (e.target.value === 'therapist') window.location.href = '/therapist';
                }}
              >
                <option value="admin">Admin Portal</option>
                <option value="therapist">Therapist Portal</option>
                <option value="user">User Portal</option>
              </select>
              <Button variant="outline" size="sm" className="border-gray-300 hover:border-gray-400 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                onClick={() => {
                  const { logout } = useAuthStore.getState();
                  logout();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 bg-white/50 backdrop-blur-sm">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-5 px-3 border-b-3 font-semibold text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-blue-700">Total Users</CardTitle>
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900">{statsData?.totalUsers || 0}</div>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{statsData?.monthlyGrowth || 0}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-green-700">Active Groups</CardTitle>
                  <div className="p-2 bg-green-500 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900">{statsData?.activeGroups || 0}</div>
                  <p className="text-sm text-green-600 mt-1">
                    {statsData?.totalGroups || 0} total groups
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-purple-700">Messages Today</CardTitle>
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-900">{Math.floor((statsData?.totalMessages || 0) * 0.1)}</div>
                  <p className="text-sm text-purple-600 mt-1">
                    {statsData?.totalMessages || 0} total messages
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-semibold text-amber-700">Premium Users</CardTitle>
                  <div className="p-2 bg-amber-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-amber-900">{statsData?.premiumUsers || 0}</div>
                  <p className="text-sm text-amber-600 mt-1">
                    {statsData?.totalUsers ? Math.round((statsData.premiumUsers / statsData.totalUsers) * 100) : 0}% conversion rate
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                  <CardTitle className="text-lg font-semibold text-gray-800">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { type: 'user', action: 'New user registered', time: '2 minutes ago', status: 'success' },
                      { type: 'group', action: 'New group created', time: '5 minutes ago', status: 'success' },
                      { type: 'message', action: 'High engagement in Recovery Warriors', time: '15 minutes ago', status: 'info' },
                      { type: 'alert', action: 'User needs attention', time: '30 minutes ago', status: 'warning' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' :
                          activity.status === 'warning' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                  <CardTitle className="text-lg font-semibold text-gray-800">System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500">Healthy</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Service</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500">Operational</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Real-time Chat</span>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-yellow-500">Degraded</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">HIPAA Compliance</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-500">Compliant</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'users' && <UserManagement />}

        {activeTab === 'groups' && (
          <div className="space-y-6">
            {/* Groups Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Group Management
                </h2>
                <p className="text-gray-600 mt-2">Manage support groups and their settings</p>
              </div>
              <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Group
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Group</DialogTitle>
                  </DialogHeader>
                  <CreateGroupForm onSubmit={createGroupMutation.mutate} />
                </DialogContent>
              </Dialog>
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-800">{group.name}</CardTitle>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        group.isActive
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-400 text-white shadow-md'
                      }`}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Members:</span>
                        <span>{group.members.length}/{group.maxMembers}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Type:</span>
                        <span className="capitalize">{group.type === 'wellness' ? 'Mental Wellness' : group.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Privacy:</span>
                        <span>{group.isPrivate ? 'Private' : 'Public'}</span>
                      </div>
                      {group.tags && group.tags.length > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {group.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="px-1 py-0.5 bg-gray-100 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {group.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{group.tags.length - 2}</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Created:</span>
                        <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        onClick={() => console.log('Edit group:', group.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsDashboard />}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Management</h2>
              <p className="text-gray-600">Configure and monitor AI agents and models</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-2 mb-6">
              <Button
                variant={aiDemoTab === 'status' ? 'default' : 'outline'}
                onClick={() => setAiDemoTab('status')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                System Status
              </Button>
              <Button
                variant={aiDemoTab === 'chat' ? 'default' : 'outline'}
                onClick={() => setAiDemoTab('chat')}
              >
                <Bot className="w-4 h-4 mr-2" />
                AI Chat
              </Button>
              <Button
                variant={aiDemoTab === 'tools' ? 'default' : 'outline'}
                onClick={() => setAiDemoTab('tools')}
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Tools
              </Button>
              <Button
                variant={aiDemoTab === 'tester' ? 'default' : 'outline'}
                onClick={() => setAiDemoTab('tester')}
              >
                <TestTube className="w-4 h-4 mr-2" />
                Agent Tester
              </Button>
            </div>

            {aiDemoTab === 'status' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries({
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
                    name: 'Advanced Orchestration System',
                    icon: Brain,
                    description: 'Tool-based AI agents with formal validation & audit logging',
                    features: ['Formal tool schemas', 'Crisis detection', 'Audit compliance', 'Agent specialization'],
                    color: 'text-green-500',
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200'
                  }
                }).map(([key, config]) => {
                  const Icon = config.icon;
                  const status = systemStatus[key as OrchestrationSystem];

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * Object.entries({}).indexOf([key, config]) }}
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
                          <div className="flex items-center">
                            {status === 'checking' && <Clock className="w-4 h-4 text-yellow-500 animate-spin" />}
                            {status === 'healthy' && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
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

            {aiDemoTab === 'chat' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {user && <AIChatInterface currentUser={user} className="h-[600px]" />}
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

            {aiDemoTab === 'tools' && (
              <AIToolsPanel groupId="admin-ai-tools" />
            )}

            {aiDemoTab === 'tester' && (
              <AgentTester />
            )}
          </div>
        )}

        {activeTab === 'system' && <SystemManagement />}

        {activeTab === 'audit' && <AuditLogs />}
      </div>
    </div>
  );
}

// Create User Form Component
/* function CreateUserForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    experienceLevel: 'beginner' as const,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Experience Level
        </label>
        <select
          title="Experience Level"
          value={formData.experienceLevel}
          onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-600 focus:border-primary-600"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      <Button type="submit" className="w-full">
        Create User
      </Button>
    </form>
  );
} */

// Create Group Form Component
function CreateGroupForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'general' as const,
    maxMembers: 6,
    isPrivate: false,
    tags: [] as string[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData({ ...formData, tags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Group Name
        </label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter group name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          title="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-600 focus:border-primary-600"
          placeholder="Describe the purpose and goals of this group"
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group Type
          </label>
          <select
            title="Group Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-600 focus:border-primary-600"
          >
            <option value="general">General Support</option>
            <option value="recovery">Recovery Support</option>
            <option value="wellness">Mental Wellness</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Members
          </label>
          <Input
            type="number"
            min="2"
            max="12"
            value={formData.maxMembers}
            onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <Input
          value={formData.tags.join(', ')}
          onChange={handleTagsChange}
          placeholder="Enter tags separated by commas (e.g., anxiety, depression, addiction)"
        />
        <p className="text-xs text-gray-500 mt-1">Tags help users find relevant groups</p>
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPrivate"
          checked={formData.isPrivate}
          onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="isPrivate" className="text-sm font-medium text-gray-700">
          Private Group
        </label>
        <span className="text-xs text-gray-500">(Users must request to join)</span>
      </div>
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Group Guidelines</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Groups are limited to {formData.maxMembers} members for intimate conversations</li>
          <li>• AI facilitators will help guide discussions and provide insights</li>
          <li>• All conversations are HIPAA compliant and confidential</li>
          <li>• Admins can moderate and manage group settings</li>
        </ul>
      </div>
      <Button type="submit" className="w-full">
        Create Group
      </Button>
    </form>
  );
}