import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  Eye,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  FileText,
  Activity,
  Heart,
  Shield,
  Mail,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { api } from '@/lib/api';
import { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';

interface ClientFilters {
  search: string;
  riskLevel: string;
  progressTrend: string;
  groupId: string;
  engagementLevel: string;
}

interface ClientProgress {
  trend: 'improving' | 'stable' | 'declining' | 'at_risk';
  engagementScore: number;
  lastActive: string;
  sessionsCompleted: number;
  goalsMet: number;
  totalGoals: number;
  riskFactors: string[];
  recentMilestones: string[];
}

interface ExtendedClient extends User {
  progress: ClientProgress;
  currentGroups: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  assignedTherapist?: string;
  notes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export default function ClientManagement() {
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    riskLevel: 'all',
    progressTrend: 'all',
    groupId: 'all',
    engagementLevel: 'all'
  });
  
  const [selectedClient, setSelectedClient] = useState<ExtendedClient | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [showAssignGroup, setShowAssignGroup] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const queryClient = useQueryClient();

  // Fetch therapist's clients
  const { data: clientsData } = useQuery({
    queryKey: ['therapist-clients', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        role: 'therapist-clients', // Special filter for therapist view
        ...(filters.search && { search: filters.search }),
        ...(filters.riskLevel !== 'all' && { riskLevel: filters.riskLevel }),
        ...(filters.progressTrend !== 'all' && { progressTrend: filters.progressTrend }),
        ...(filters.groupId !== 'all' && { groupId: filters.groupId }),
        ...(filters.engagementLevel !== 'all' && { engagementLevel: filters.engagementLevel })
      });
      
      const response = await api.get(`/therapist/clients?${params}`);
      return response as any;
    },
    refetchInterval: 60000 // Refresh every minute for real-time updates
  });

  // Fetch groups for filtering
  const { data: groupsData } = useQuery({
    queryKey: ['therapist-groups'],
    queryFn: async () => {
      const response = await api.get('/therapist/groups');
      return response as any;
    }
  });

  const clients = clientsData?.data?.clients || [];
  const totalClients = clientsData?.data?.total || 0;
  const totalPages = Math.ceil(totalClients / pageSize);
  const groups = groupsData?.data?.groups || [];

  // Debug logging
  console.log('🔍 ClientManagement - Raw clientsData:', clientsData);
  console.log('📋 ClientManagement - Processed clients:', clients);
  console.log('📊 ClientManagement - Total clients:', totalClients);

  // Add client note
  // const addNoteMutation = useMutation({
  //   mutationFn: ({ clientId, note }: { clientId: string; note: string }) =>
  //     api.post(`/therapist/clients/${clientId}/notes`, { note }),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
  //     toast.success('Note added successfully');
  //   },
  //   onError: () => toast.error('Failed to add note')
  // });

  // Flag client for crisis intervention
  const flagClientMutation = useMutation({
    mutationFn: ({ clientId, reason }: { clientId: string; reason: string }) =>
      api.post(`/therapist/clients/${clientId}/flag-crisis`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      toast.success('Client flagged for crisis intervention');
    },
    onError: () => toast.error('Failed to flag client')
  });

  // Assign client to group
  const assignGroupMutation = useMutation({
    mutationFn: ({ userId, groupId, notes }: { userId: string; groupId: string; notes?: string }) =>
      api.post('/therapist/group-assignments', { userId, groupId, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      toast.success('Client assigned to group successfully');
    },
    onError: () => toast.error('Failed to assign client to group')
  });

  // Remove client from group
  const removeGroupMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      api.delete(`/therapist/group-assignments/${userId}/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      toast.success('Client removed from group successfully');
    },
    onError: () => toast.error('Failed to remove client from group')
  });

  // Add new client
  const addClientMutation = useMutation({
    mutationFn: (clientData: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string;
      emergencyContact?: any;
      initialNotes?: string;
    }) => api.post('/therapist/clients', clientData),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      toast.success('Client added successfully');
      setShowAddClient(false);
      
      // Show temporary password in a success message
      if (response?.data?.tempPassword) {
        toast.success(`Temporary password: ${response.data.tempPassword}`, {
          duration: 10000,
        });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add client');
    }
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'stable': return <Activity className="w-4 h-4 text-blue-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'at_risk': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'bg-green-100 text-green-800';
      case 'stable': return 'bg-blue-100 text-blue-800';
      case 'declining': return 'bg-orange-100 text-orange-800';
      case 'at_risk': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskLevel = (client: ExtendedClient) => {
    const riskFactors = client.progress.riskFactors?.length || 0;
    const engagementScore = client.progress.engagementScore;
    
    if (riskFactors >= 3 || engagementScore < 30) return 'high';
    if (riskFactors >= 2 || engagementScore < 50) return 'medium';
    return 'low';
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Client Management</h2>
          <p className="text-gray-600 mt-1">Monitor client progress and provide professional oversight</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button
            onClick={() => setShowAddClient(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-red-600">
                  {clients.filter((c: any) => getRiskLevel(c) === 'high').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Improving</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter((c: any) => c.progress?.trend === 'improving').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Engagement</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(clients.reduce((acc: number, c: any) => acc + (c.progress?.engagementScore || 0), 0) / clients.length) || 0}%
                </p>
              </div>
              <Heart className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search clients..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <select
              title="Risk Level"
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
            
            <select
              title="Progress Trend"
              value={filters.progressTrend}
              onChange={(e) => setFilters({ ...filters, progressTrend: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Trends</option>
              <option value="improving">Improving</option>
              <option value="stable">Stable</option>
              <option value="declining">Declining</option>
              <option value="at_risk">At Risk</option>
            </select>
            
            <select
              title="Group"
              value={filters.groupId}
              onChange={(e) => setFilters({ ...filters, groupId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Groups</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            
            <select
              title="Engagement Level"
              value={filters.engagementLevel}
              onChange={(e) => setFilters({ ...filters, engagementLevel: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Engagement</option>
              <option value="high">High (80%+)</option>
              <option value="medium">Medium (50-79%)</option>
              <option value="low">Low (&lt;50%)</option>
            </select>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({totalClients})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress Trend
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.map((client: ExtendedClient) => {
                  const riskLevel = getRiskLevel(client);
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {client.firstName[0]}{client.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {client.firstName} {client.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {client.currentGroups?.slice(0, 2).map((group) => (
                            <span key={group.id} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {group.name}
                            </span>
                          ))}
                          {client.currentGroups?.length > 2 && (
                            <span className="text-xs text-gray-500">+{client.currentGroups.length - 2} more</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTrendIcon(client.progress?.trend || 'stable')}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTrendColor(client.progress?.trend || 'stable')}`}>
                            {client.progress?.trend || 'stable'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${getEngagementColor(client.progress?.engagementScore || 0)}`}>
                            {client.progress?.engagementScore || 0}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (client.progress?.engagementScore || 0) >= 80 ? 'bg-green-500' :
                                (client.progress?.engagementScore || 0) >= 60 ? 'bg-blue-500' :
                                (client.progress?.engagementScore || 0) >= 40 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${client.progress?.engagementScore || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskBadgeColor(riskLevel)}`}>
                          {riskLevel.toUpperCase()}
                        </span>
                        {client.progress?.riskFactors?.length > 0 && (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">{client.progress.riskFactors.length} factors</span>
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {client.progress?.lastActive || 'Never'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowClientDetail(true);
                            }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedClient(client);
                              setShowAssignGroup(true);
                            }}
                            title="Assign to Group"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Send Message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalClients)} of {totalClients} clients
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      {showClientDetail && selectedClient && (
        <Dialog open={showClientDetail} onOpenChange={setShowClientDetail}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Client Profile: {selectedClient.firstName} {selectedClient.lastName}
              </DialogTitle>
            </DialogHeader>
            <ClientDetailView 
              client={selectedClient} 
              onClose={() => setShowClientDetail(false)}
              onFlagCrisis={(reason) => flagClientMutation.mutate({ clientId: selectedClient.id, reason })}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Group Assignment Dialog */}
      {showAssignGroup && selectedClient && (
        <Dialog open={showAssignGroup} onOpenChange={setShowAssignGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Assign {selectedClient.firstName} {selectedClient.lastName} to Group
              </DialogTitle>
            </DialogHeader>
            <GroupAssignmentDialog 
              client={selectedClient}
              groups={groups}
              onAssign={(groupId, notes) => assignGroupMutation.mutate({ userId: selectedClient.id, groupId, notes })}
              onRemove={(groupId) => removeGroupMutation.mutate({ userId: selectedClient.id, groupId })}
              onClose={() => setShowAssignGroup(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Client Dialog */}
      {showAddClient && (
        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <AddClientDialog 
              onSubmit={(data) => addClientMutation.mutate(data)}
              onClose={() => setShowAddClient(false)}
              isLoading={addClientMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Add Client Dialog Component
function AddClientDialog({
  onSubmit,
  onClose,
  isLoading
}: {
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    initialNotes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      emergencyContact: formData.emergencyContact.name ? formData.emergencyContact : undefined
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <Input
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <Input
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
              required
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              required
            />
            <p className="text-xs text-gray-500 mt-1">A temporary password will be generated and sent to you</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Emergency Contact (Optional)</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Name
            </label>
            <Input
              value={formData.emergencyContact.name}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                emergencyContact: { ...prev.emergencyContact, name: e.target.value }
              }))}
              placeholder="Enter emergency contact name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Phone
              </label>
              <Input
                value={formData.emergencyContact.phone}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  emergencyContact: { ...prev.emergencyContact, phone: e.target.value }
                }))}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship
              </label>
              <select
                value={formData.emergencyContact.relationship}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  emergencyContact: { ...prev.emergencyContact, relationship: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select relationship</option>
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Initial Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Initial Notes (Optional)
        </label>
        <textarea
          value={formData.initialNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, initialNotes: e.target.value }))}
          placeholder="Add any initial observations or notes about the client..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding Client...' : 'Add Client'}
        </Button>
      </div>
    </form>
  );
}

// Group Assignment Dialog Component
function GroupAssignmentDialog({
  client,
  groups,
  onAssign,
  onRemove,
  onClose
}: {
  client: ExtendedClient;
  groups: any[];
  onAssign: (groupId: string, notes?: string) => void;
  onRemove: (groupId: string) => void;
  onClose: () => void;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [notes, setNotes] = useState('');

  const availableGroups = groups.filter(group => 
    !client.currentGroups?.some(currentGroup => currentGroup.id === group.id)
  );

  return (
    <div className="space-y-6">
      {/* Current Groups */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Current Groups</h4>
        {client.currentGroups && client.currentGroups.length > 0 ? (
          <div className="space-y-2">
            {client.currentGroups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{group.name}</p>
                  <p className="text-sm text-gray-600">Role: {group.role}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemove(group.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Client is not assigned to any groups</p>
        )}
      </div>

      {/* Assign New Group */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Assign to New Group</h4>
        {availableGroups.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Group
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a group...</option>
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.participants || 0}/{group.maxMembers || 6} members)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about why this group is suitable for the client..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <Button
              onClick={() => {
                if (selectedGroupId) {
                  onAssign(selectedGroupId, notes);
                  setSelectedGroupId('');
                  setNotes('');
                  onClose();
                }
              }}
              disabled={!selectedGroupId}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign to Group
            </Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No available groups to assign</p>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

// Client Detail View Component
function ClientDetailView({ 
  client, 
  onClose, 
  onFlagCrisis 
}: { 
  client: ExtendedClient; 
  onClose: () => void;
  onFlagCrisis: (reason: string) => void;
}) {
  const [showCrisisDialog, setShowCrisisDialog] = useState(false);
  const [crisisReason, setCrisisReason] = useState('');

  return (
    <div className="space-y-6">
      {/* Client Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">
                  {client.firstName[0]}{client.lastName[0]}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{client.firstName} {client.lastName}</h3>
              <p className="text-sm text-gray-600">{client.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Member since {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Progress Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Engagement Score</span>
                <span className="text-sm font-medium">{client.progress?.engagementScore || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sessions Completed</span>
                <span className="text-sm font-medium">{client.progress?.sessionsCompleted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Goals Met</span>
                <span className="text-sm font-medium">
                  {client.progress?.goalsMet || 0}/{client.progress?.totalGoals || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3">Emergency Contact</h4>
            {client.emergencyContact ? (
              <div className="space-y-1">
                <p className="text-sm font-medium">{client.emergencyContact.name}</p>
                <p className="text-sm text-gray-600">{client.emergencyContact.relationship}</p>
                <p className="text-sm text-gray-600">{client.emergencyContact.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No emergency contact on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Factors & Milestones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.progress?.riskFactors?.length > 0 ? (
              <ul className="space-y-2">
                {client.progress.riskFactors.map((factor, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    {factor}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No current risk factors identified</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Recent Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {client.progress?.recentMilestones?.length > 0 ? (
              <ul className="space-y-2">
                {client.progress.recentMilestones.map((milestone, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    {milestone}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No recent milestones recorded</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Current Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.currentGroups?.map((group) => (
              <div key={group.id} className="p-3 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900">{group.name}</h4>
                <p className="text-sm text-gray-600">Role: {group.role}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t">
        <Button
          onClick={() => setShowCrisisDialog(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Shield className="w-4 h-4 mr-2" />
          Flag for Crisis Intervention
        </Button>
        
        <Button variant="outline">
          <MessageCircle className="w-4 h-4 mr-2" />
          Send Secure Message
        </Button>
        
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
        
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Crisis Flag Dialog */}
      {showCrisisDialog && (
        <Dialog open={showCrisisDialog} onOpenChange={setShowCrisisDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag for Crisis Intervention</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please provide the reason for flagging this client for crisis intervention:
              </p>
              <textarea
                value={crisisReason}
                onChange={(e) => setCrisisReason(e.target.value)}
                placeholder="Describe the concerning behavior or indicators..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={4}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCrisisDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onFlagCrisis(crisisReason);
                    setShowCrisisDialog(false);
                    setCrisisReason('');
                  }}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!crisisReason.trim()}
                >
                  Flag Client
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}