import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Users,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Calendar,
  MessageSquare,
  UserPlus,
  UserMinus,
  Edit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AddClientModal from './AddClientModal';
import AssignGroupModal from './AssignGroupModal';
import ScheduleSessionModal from './ScheduleSessionModal';
import ClientProfileModal from './ClientProfileModal';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  experienceLevel: string;
  isPremium: boolean;
  isActive: boolean;
  lastActive: string | null;
  progress: {
    trend: 'improving' | 'stable' | 'declining' | 'at_risk';
    engagementScore: number;
    lastActive: string;
    sessionsCompleted: number;
    goalsMet: number;
    totalGoals: number;
    riskFactors: string[];
  };
  currentGroups: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export default function ClientList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTrend, setFilterTrend] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const { data: clientsData, isLoading } = useQuery({
    queryKey: ['therapist-clients', searchTerm, filterTrend],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterTrend !== 'all') params.append('progressTrend', filterTrend);

      const response = await api.get<{ clients: Client[]; total: number }>(
        `/therapist/clients?${params.toString()}`
      );
      return response;
    }
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await api.delete(`/therapist/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
      toast.success('Client removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove client');
    }
  });

  const handleRemoveClient = (clientId: string) => {
    if (confirm('Are you sure you want to remove this client from your list?')) {
      removeClientMutation.mutate(clientId);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getTrendBadgeClass = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'bg-green-100 text-green-800';
      case 'stable':
        return 'bg-blue-100 text-blue-800';
      case 'declining':
        return 'bg-yellow-100 text-yellow-800';
      case 'at_risk':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clients = clientsData?.clients || [];

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-semibold">My Clients</h2>
              <span className="ml-2 text-sm text-gray-500">
                ({clientsData?.total || 0} total)
              </span>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Client
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                title="Filter Clients"
                value={filterTrend}
                onChange={(e) => setFilterTrend(e.target.value)}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Clients</option>
                <option value="improving">Improving</option>
                <option value="stable">Stable</option>
                <option value="declining">Declining</option>
                <option value="at_risk">At Risk</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No clients found</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-primary-600 hover:text-primary-700"
              >
                Add your first client
              </button>
            </div>
          ) : (
            clients.map((client) => (
              <div key={client.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium">
                          {client.firstName[0]}{client.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-medium text-gray-900">
                          {client.firstName} {client.lastName}
                        </h3>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center space-x-6 text-sm">
                      <div className="flex items-center">
                        {getTrendIcon(client.progress.trend)}
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${getTrendBadgeClass(client.progress.trend)}`}>
                          {client.progress.trend}
                        </span>
                      </div>

                      <div className="text-gray-500">
                        Last active: {client.progress.lastActive}
                      </div>

                      <div className="text-gray-500">
                        Engagement: {client.progress.engagementScore}%
                      </div>

                      {client.progress.riskFactors.length > 0 && (
                        <div className="flex items-center text-red-600">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {client.progress.riskFactors.length} risk factors
                        </div>
                      )}
                    </div>

                    {client.currentGroups.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {client.currentGroups.map((group) => (
                          <span key={group.id} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {group.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative ml-4">
                    <button
                      title="Open Action Menu"
                      onClick={() => setActionMenuOpen(actionMenuOpen === client.id ? null : client.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>

                    {actionMenuOpen === client.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10 py-1">
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowProfileModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2 text-gray-500" />
                          View Profile
                        </button>

                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowScheduleModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          Schedule Session
                        </button>

                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowAssignGroupModal(true);
                            setActionMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <UserPlus className="h-4 w-4 mr-2 text-gray-500" />
                          Assign to Group
                        </button>

                        <button
                          onClick={() => {
                            // Navigate to messages with this client
                            window.location.href = `/therapist/messages/${client.id}`;
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                        >
                          <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />
                          Send Message
                        </button>

                        <hr className="my-1" />

                        <button
                          onClick={() => {
                            handleRemoveClient(client.id);
                            setActionMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center text-red-600"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove Client
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
          }}
        />
      )}

      {showAssignGroupModal && selectedClient && (
        <AssignGroupModal
          client={selectedClient}
          onClose={() => {
            setShowAssignGroupModal(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowAssignGroupModal(false);
            setSelectedClient(null);
            queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
          }}
        />
      )}

      {showScheduleModal && selectedClient && (
        <ScheduleSessionModal
          client={selectedClient}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedClient(null);
          }}
          onSuccess={() => {
            setShowScheduleModal(false);
            setSelectedClient(null);
          }}
        />
      )}

      {showProfileModal && selectedClient && (
        <ClientProfileModal
          client={selectedClient}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedClient(null);
          }}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['therapist-clients'] });
          }}
        />
      )}
    </>
  );
}