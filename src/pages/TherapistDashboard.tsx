import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  AlertCircle,
  Calendar,
  Target,
  Shield,
  Plus,
  TrendingUp,
  Activity,
  Trash2
} from 'lucide-react';
import ClientManagement from '@/components/therapist/ClientManagement';
import SessionManagement from '@/components/therapist/SessionManagement';
import ProgressTracking from '@/components/therapist/ProgressTracking';
import CrisisMonitoring from '@/components/therapist/CrisisMonitoring';
import CreateGroupDialog from '@/components/therapist/CreateGroupDialog';
import GroupMemberManagement from '@/components/therapist/GroupMemberManagement';
import MayaAccessCard from '@/components/MayaAccessCard';
import PortalLayout from '@/components/ui/PortalLayout';
import StatsCard from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { getPortalComponentClasses } from '@/lib/design-system';
import { cn } from '@/utils/cn';

function TherapistDashboard() {
  const portalType = 'therapist';
  const portalClasses = getPortalComponentClasses(portalType);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'sessions' | 'progress' | 'crisis' | 'groups'>('overview');
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [selectedGroupForManagement, setSelectedGroupForManagement] = useState<{id: string, name: string} | null>(null);
  const queryClient = useQueryClient();

  // Fetch real therapist data
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['therapist-stats'],
    queryFn: async () => {
      const response = await api.get('/therapist/stats');
      return response as any;
    }
  });

  const { data: _clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['therapist-clients-overview'],
    queryFn: async () => {
      const response = await api.get('/therapist/clients?limit=5');
      return response as any;
    }
  });

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['therapist-groups-overview'],
    queryFn: async () => {
      const response = await api.get('/therapist/groups?limit=5');
      return response as any;
    }
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['therapist-crisis-alerts'],
    queryFn: async () => {
      const response = await api.get('/therapist/crisis-alerts?limit=5');
      return response as any;
    }
  });

  // Group creation mutation
  const createGroupMutation = useMutation({
    mutationFn: async (groupData: {
      name: string;
      description: string;
      type: string;
      maxMembers: number;
      isPrivate: boolean;
    }) => {
      const response = await api.post('/therapist/groups', groupData);
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-groups-overview'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-stats'] });
      setIsCreateGroupDialogOpen(false);
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
    }
  });

  // Group deletion mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const response = await api.delete(`/therapist/groups/${groupId}`);
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-groups-overview'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-stats'] });
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    }
  });

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone and will remove all group data including messages.`)) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const stats = statsData?.data || {
    totalClients: 0,
    activeGroups: 0,
    criticalAlerts: 0,
    avgEngagement: 0
  };

  // const recentClients = clientsData?.clients || [];
  const recentGroups = groupsData?.data?.groups || [];
  const recentAlerts = alertsData?.data?.alerts || [];

  const isLoading = statsLoading || clientsLoading || groupsLoading || alertsLoading;

  const navigationItems = [
    { key: 'overview', label: 'Overview', icon: Activity as any, onClick: () => setActiveTab('overview') },
    { key: 'clients', label: 'Clients', icon: Users as any, onClick: () => setActiveTab('clients') },
    { key: 'groups', label: 'Groups', icon: Users as any, onClick: () => setActiveTab('groups') },
    { key: 'sessions', label: 'Sessions', icon: Calendar as any, onClick: () => setActiveTab('sessions') },
    { key: 'progress', label: 'Progress', icon: Target as any, onClick: () => setActiveTab('progress') },
    { key: 'crisis', label: 'Crisis Monitoring', icon: Shield as any, onClick: () => setActiveTab('crisis') },
  ];

  return (
    <PortalLayout
      portalType="therapist"
      title="Therapist Portal"
      subtitle="Manage your clients and therapeutic groups"
      navigationItems={navigationItems as any}
    >

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards - Enhanced with unified design */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Total Clients"
              value={isLoading ? '...' : stats.totalClients}
              icon={Users}
              portalType={portalType}
              isLoading={isLoading}
              variant="interactive"
            />
            <StatsCard
              title="Active Groups"
              value={isLoading ? '...' : stats.activeGroups}
              icon={Users}
              portalType={portalType}
              isLoading={isLoading}
              variant="interactive"
            />
            <StatsCard
              title="Critical Alerts"
              value={isLoading ? '...' : stats.criticalAlerts}
              icon={AlertCircle}
              portalType={portalType}
              isLoading={isLoading}
              variant="interactive"
            />
            <StatsCard
              title="Avg Engagement"
              value={isLoading ? '...' : `${Math.round(stats.avgEngagement)}%`}
              icon={TrendingUp}
              portalType={portalType}
              isLoading={isLoading}
              variant="interactive"
            />
          </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Maya Clinical Assistant Card */}
              <MayaAccessCard
                memberRole="therapist"
                variant="full"
                className="md:col-span-1"
              />
              <Card className={portalClasses.card('hover')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => setActiveTab('clients')}
                      className="w-full justify-start"
                      variant="outline"
                      portalType={portalType}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Client
                    </Button>
                    <Button
                      onClick={() => setIsCreateGroupDialogOpen(true)}
                      className="w-full justify-start"
                      variant="primary"
                      portalType={portalType}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Group
                    </Button>
                    <Button
                      onClick={() => setActiveTab('sessions')}
                      className="w-full justify-start"
                      variant="outline"
                      portalType={portalType}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Session
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={portalClasses.card('hover')}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      portalType={portalType}
                      onClick={() => setActiveTab('crisis')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {isLoading ? (
                      <p className="text-sm text-gray-500">Loading alerts...</p>
                    ) : recentAlerts.length > 0 ? (
                      recentAlerts.slice(0, 3).map((alert: any) => (
                        <div key={alert.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 transition-colors hover:bg-yellow-100">
                          <AlertCircle className="text-yellow-600" size={20} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{alert.alertType}</p>
                            <p className="text-xs text-gray-600">{alert.clientName}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No recent alerts</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'clients' && <ClientManagement />}
        {activeTab === 'sessions' && <SessionManagement />}
        {activeTab === 'progress' && <ProgressTracking />}
        {activeTab === 'crisis' && <CrisisMonitoring />}
        {activeTab === 'groups' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Therapeutic Groups</h2>
              <Button 
                onClick={() => setIsCreateGroupDialogOpen(true)}
                variant="primary"
                portalType={portalType}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Group
              </Button>
            </div>

            {isLoading ? (
              <p className="text-gray-500">Loading groups...</p>
            ) : recentGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {recentGroups.map((group: any) => (
                  <Card key={group.id} className={portalClasses.card('hover')}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            {group.participants || 0} members
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              portalType={portalType}
                              onClick={() => setSelectedGroupForManagement({ id: group.id, name: group.name })}
                            >
                              Manage Members
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                              disabled={deleteGroupMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{group.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span>Type: {group.type}</span>
                        <span>Created: {new Date(group.createdAt).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {/* Show member list if available */}
                      {group.members && group.members.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Members:</h4>
                          <div className="flex flex-wrap gap-2">
                            {group.members.slice(0, 5).map((member: any) => (
                              <span
                                key={member.memberId}
                                className={`px-2 py-1 rounded-full text-xs ${
                                  member.role === 'facilitator'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {member.member?.firstName} {member.member?.lastName} ({member.role})
                              </span>
                            ))}
                            {group.members.length > 5 && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                +{group.members.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className={portalClasses.card('base')}>
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Yet</h3>
                  <p className="text-gray-600 mb-4">Create your first therapeutic group to start managing clients</p>
                  <Button 
                    onClick={() => setIsCreateGroupDialogOpen(true)}
                    variant="primary"
                    portalType={portalType}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Group
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

      {/* Create Group Dialog */}
      <CreateGroupDialog
        isOpen={isCreateGroupDialogOpen}
        onClose={() => setIsCreateGroupDialogOpen(false)}
        onSubmit={(groupData) => createGroupMutation.mutate(groupData)}
        isLoading={createGroupMutation.isPending}
      />

      {/* Group Member Management Modal */}
      {selectedGroupForManagement && (
        <GroupMemberManagement
          groupId={selectedGroupForManagement.id}
          groupName={selectedGroupForManagement.name}
          isOpen={!!selectedGroupForManagement}
          onClose={() => setSelectedGroupForManagement(null)}
        />
      )}
    </PortalLayout>
  );
}

export default TherapistDashboard;