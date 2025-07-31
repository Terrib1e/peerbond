import { useState } from 'react';
import { X, Users, Search } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  type: string;
  participants: number;
  maxMembers: number;
}

interface AssignGroupModalProps {
  client: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignGroupModal({ client, onClose, onSuccess }: AssignGroupModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['available-groups', searchTerm],
    queryFn: async () => {
      const response = await api.get<{ groups: Group[] }>('/groups');
      return response;
    }
  });

  const assignGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await api.post(`/therapist/clients/${client.id}/groups`, { groupId });
    },
    onSuccess: () => {
      toast.success('Client assigned to group successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to assign client to group');
    }
  });

  const handleAssign = () => {
    if (selectedGroup) {
      assignGroupMutation.mutate(selectedGroup);
    }
  };

  const groups = groupsData?.groups || [];
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Assign to Group</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select a group for {client.firstName} {client.lastName}
              </p>
            </div>
            <button
              title="Close Modal"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No groups found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedGroup === group.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {group.type}
                        </span>
                        <span className="text-gray-500">
                          {group.participants}/{group.maxMembers} members
                        </span>
                      </div>
                    </div>
                    {selectedGroup === group.id && (
                      <div className="ml-4">
                        <div className="h-6 w-6 bg-primary-500 rounded-full flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              title="Assign to Group"
              disabled={!selectedGroup || assignGroupMutation.isPending}
              className="btn-primary"
            >
              {assignGroupMutation.isPending ? 'Assigning...' : 'Assign to Group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}