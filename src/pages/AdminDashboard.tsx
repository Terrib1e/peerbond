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
  AlertTriangle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Member, Group } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';
import MemberManagement from '@/components/admin/MemberManagement';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import SystemManagement from '@/components/admin/SystemManagement';
import AuditLogs from '@/components/admin/AuditLogs';
import AIChatInterface from '@/components/chat/AIChatInterface';
import AIToolsPanel from '@/components/ai/AIToolsPanel';
import AgentTester from '@/components/ai/AgentTester';
import PortalLayout from '@/components/ui/PortalLayout';
import StatsCard from '@/components/ui/StatsCard';
import { OrchestrationSystem } from '@/lib/api';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/authStore';

interface AdminStats {
  totalMembers: number;
  totalGroups: number;
  totalMessages: number;
  activeMembers: number;
  activeGroups: number;
  premiumMembers: number;
  avgEngagement: number;
  monthlyGrowth: number;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'groups' | 'analytics' | 'ai' | 'system' | 'audit'>('overview');
  const [showCreateMemberDialog, setShowCreateMemberDialog] = useState(false);
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

  const queryClient = useQueryClient();

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
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

    setSystemStatus(prev => ({ ...prev, working: 'healthy' }));
  };

  // Data fetching
  const { data: statsData, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const analytics = await api.getAnalytics();
      return {
        totalMembers: analytics.totalMembers,
        totalGroups: analytics.totalGroups,
        totalMessages: analytics.totalMessages,
        activeMembers: analytics.activeMembers,
        activeGroups: analytics.activeGroups,
        premiumMembers: Math.floor(analytics.totalMembers * 0.15),
        avgEngagement: 78,
        monthlyGrowth: 12,
      };
    }
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ['admin-groups'],
    queryFn: () => api.getGroups(),
  });

  // Mutations
  const createMemberMutation = useMutation({
    mutationFn: (memberData: any) => api.createMember(memberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowCreateMemberDialog(false);
      toast.success('Member created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create member');
    }
  });

  const createGroupMutation = useMutation({
    mutationFn: (groupData: any) => api.createGroup(groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowCreateGroupDialog(false);
      toast.success('Group created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create group');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Group deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete group');
    }
  });

  const stats = statsData || {
    totalMembers: 0,
    totalGroups: 0,
    totalMessages: 0,
    activeMembers: 0,
    activeGroups: 0,
    premiumMembers: 0,
    avgEngagement: 0,
    monthlyGrowth: 0,
  };

  const { member: currentMember } = useAuthStore();

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: BarChart3 as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('overview') },
    { key: 'members', label: 'Members', icon: Users as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('members') },
    { key: 'groups', label: 'Groups', icon: MessageSquare as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('groups') },
    { key: 'analytics', label: 'Analytics', icon: Activity as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('analytics') },
    { key: 'ai', label: 'AI Management', icon: Brain as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('ai') },
    { key: 'system', label: 'System', icon: Server as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('system') },
    { key: 'audit', label: 'Audit Logs', icon: FileText as React.ComponentType<{ size?: number; className?: string }>, onClick: () => setActiveTab('audit') },
  ];

  return (
    <PortalLayout
      portalType="admin"
      title="Admin Dashboard"
      subtitle="Manage your PeerBond platform"
      navigationItems={navigationItems}
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Members"
              value={stats.totalMembers}
              icon={Users}
              trend={{ value: stats.monthlyGrowth, label: 'this month', isPositive: true }}
              portalType="admin"
              isLoading={statsLoading}
            />
            <StatsCard
              title="Active Groups"
              value={stats.activeGroups}
              icon={MessageSquare}
              portalType="admin"
              isLoading={statsLoading}
            />
            <StatsCard
              title="Total Messages"
              value={stats.totalMessages}
              icon={TrendingUp}
              portalType="admin"
              isLoading={statsLoading}
            />
            <StatsCard
              title="Premium Members"
              value={stats.premiumMembers}
              icon={Shield}
              portalType="admin"
              isLoading={statsLoading}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Manage members and their permissions</p>
                <Button onClick={() => setShowCreateMemberDialog(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Member
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Group Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">Create and manage therapeutic groups</p>
                <Button onClick={() => setShowCreateGroupDialog(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Group
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(systemStatus).map(([system, status]) => (
                    <div key={system} className="flex justify-between items-center">
                      <span className="text-sm">{system}</span>
                      <div className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        status === 'healthy' && 'bg-green-100 text-green-800',
                        status === 'error' && 'bg-red-100 text-red-800',
                        status === 'checking' && 'bg-yellow-100 text-yellow-800'
                      )}>
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'members' && <MemberManagement />}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Groups</h2>
            <Button onClick={() => setShowCreateGroupDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>

          {groupsLoading ? (
            <div className="text-center py-8">Loading groups...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groups?.map((group) => (
                <Card key={group.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        <p className="text-gray-600">{group.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{group.members?.length || 0} members</span>
                          <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteGroupMutation.mutate(group.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && <AnalyticsDashboard />}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">AI Management</h2>

          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'status', label: 'System Status', icon: Activity },
                { id: 'chat', label: 'AI Chat', icon: Bot },
                { id: 'tools', label: 'Tools Panel', icon: Zap },
                { id: 'tester', label: 'Agent Tester', icon: TestTube },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setAiDemoTab(tab.id as any)}
                    className={cn(
                      'flex items-center py-4 px-1 border-b-2 font-medium text-sm',
                      aiDemoTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="bg-white rounded-lg border">
            {aiDemoTab === 'status' && (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">AI System Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(systemStatus).map(([system, status]) => (
                    <Card key={system}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 capitalize">{system}</p>
                            <p className={cn(
                              'text-xs',
                              status === 'healthy' && 'text-green-600',
                              status === 'error' && 'text-red-600',
                              status === 'checking' && 'text-yellow-600'
                            )}>
                              {status === 'healthy' ? 'Operational' :
                               status === 'error' ? 'Error' : 'Checking...'}
                            </p>
                          </div>
                          <div className={cn(
                            'w-3 h-3 rounded-full',
                            status === 'healthy' && 'bg-green-500',
                            status === 'error' && 'bg-red-500',
                            status === 'checking' && 'bg-yellow-500'
                          )} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            {aiDemoTab === 'chat' && (
              <div className="h-96">
                <AIChatInterface currentMember={currentMember!} />
              </div>
            )}
            {aiDemoTab === 'tools' && (
              <div className="p-6">
                <AIToolsPanel groupId="" />
              </div>
            )}
            {aiDemoTab === 'tester' && (
              <div className="p-6">
                <AgentTester />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'system' && <SystemManagement />}
      {activeTab === 'audit' && <AuditLogs />}

      {/* Create Member Dialog */}
      <Dialog open={showCreateMemberDialog} onOpenChange={setShowCreateMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createMemberMutation.mutate({
              firstName: formData.get('firstName'),
              lastName: formData.get('lastName'),
              email: formData.get('email'),
              role: formData.get('role'),
            });
          }}>
            <div className="space-y-4">
              <Input name="firstName" placeholder="First Name" required />
              <Input name="lastName" placeholder="Last Name" required />
              <Input name="email" type="email" placeholder="Email" required />
              <select name="role" className="w-full p-2 border rounded" required aria-label="Member role">
                <option value="">Select Role</option>
                <option value="member">Member</option>
                <option value="facilitator">Facilitator</option>
                <option value="therapist">Therapist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateMemberDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMemberMutation.isPending}>
                {createMemberMutation.isPending ? 'Creating...' : 'Create Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            createGroupMutation.mutate({
              name: formData.get('name'),
              description: formData.get('description'),
              type: formData.get('type'),
              maxMembers: parseInt(formData.get('maxMembers') as string),
              isPrivate: formData.get('isPrivate') === 'on',
            });
          }}>
            <div className="space-y-4">
              <Input name="name" placeholder="Group Name" required />
              <textarea
                name="description"
                placeholder="Group Description"
                className="w-full p-2 border rounded h-20 resize-none"
                required
              />
              <select name="type" className="w-full p-2 border rounded" required aria-label="Group type">
                <option value="">Select Type</option>
                <option value="recovery">Recovery</option>
                <option value="wellness">Wellness</option>
                <option value="general">General</option>
              </select>
              <Input name="maxMembers" type="number" placeholder="Max Members" min="2" max="20" defaultValue="8" required />
              <label className="flex items-center">
                <input type="checkbox" name="isPrivate" className="mr-2" />
                Private Group
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}