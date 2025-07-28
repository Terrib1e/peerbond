import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  X,
  UserCheck,
  UserX,
  Crown,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface GroupMember {
  userId: string;
  role: 'member' | 'facilitator';
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface GroupMemberManagementProps {
  groupId: string;
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
}

function GroupMemberManagement({ groupId, groupName, isOpen, onClose }: GroupMemberManagementProps) {
  const [showAddMember, setShowAddMember] = useState(false);
  const queryClient = useQueryClient();

  // Fetch group members
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const response = await api.get(`/therapist/groups/${groupId}/members`);
      return response as any;
    },
    enabled: isOpen && !!groupId
  });

  // Fetch therapist's clients for adding to group
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['therapist-clients-for-group'],
    queryFn: async () => {
      const response = await api.get('/therapist/clients?limit=100');
      return response as any;
    },
    enabled: showAddMember
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'member' | 'facilitator' }) => {
      const response = await api.post(`/therapist/groups/${groupId}/members`, { userId, role });
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['therapist-groups-overview'] });
      setShowAddMember(false);
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.delete(`/therapist/groups/${groupId}/members/${userId}`);
      return response as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['therapist-groups-overview'] });
    }
  });

  const members = membersData?.data?.members || [];
  const clients = clientsData?.data?.clients || [];

  // Filter out clients who are already members
  const availableClients = clients.filter((client: any) => 
    !members.some((member: GroupMember) => member.userId === client.id)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Manage Members - {groupName}
          </h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add Member Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add New Member</h3>
              <Button
                onClick={() => setShowAddMember(!showAddMember)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>

            {showAddMember && (
              <Card>
                <CardContent className="p-4">
                  {clientsLoading ? (
                    <p className="text-gray-500">Loading clients...</p>
                  ) : availableClients.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Available Clients:</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {availableClients.map((client: any) => (
                          <div
                            key={client.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {client.firstName} {client.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{client.email}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addMemberMutation.mutate({ userId: client.id, role: 'member' })}
                                disabled={addMemberMutation.isPending}
                              >
                                <UserCheck className="w-4 h-4 mr-1" />
                                Add as Member
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => addMemberMutation.mutate({ userId: client.id, role: 'facilitator' })}
                                disabled={addMemberMutation.isPending}
                              >
                                <Crown className="w-4 h-4 mr-1" />
                                Add as Facilitator
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">All your clients are already members of this group.</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Current Members Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Current Members ({members.length})
            </h3>

            {membersLoading ? (
              <p className="text-gray-500">Loading members...</p>
            ) : members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member: GroupMember) => (
                  <Card key={member.userId}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            member.role === 'facilitator' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {member.role === 'facilitator' ? (
                              <Shield className="w-4 h-4" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.user?.firstName || 'Unknown'} {member.user?.lastName || 'User'}
                            </p>
                            <p className="text-sm text-gray-500">{member.user?.email || 'No email'}</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              member.role === 'facilitator'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeMemberMutation.mutate(member.userId)}
                          disabled={removeMemberMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Members Yet</h4>
                  <p className="text-gray-600">This group doesn't have any members yet. Add some clients to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GroupMemberManagement;