import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, MessageCircle, Search, X, Trash2, Star, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Group, CreateGroupRequest } from '@/types';

function GroupsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAssignment, setFilterAssignment] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuthStore();
  const [newGroup, setNewGroup] = useState<CreateGroupRequest>({
    name: '',
    description: '',
    type: 'general',
    maxMembers: 8,
    isPrivate: false,
    tags: []
  });

  const queryClient = useQueryClient();

  const { data: groups = [], isLoading, error } = useQuery<Group[]>({
    queryKey: ['user-available-groups'],
    queryFn: async () => {
      const result = await api.getUserAvailableGroups();
      console.log('Fetched available groups:', result);
      return result;
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (groupData: CreateGroupRequest) => api.createGroup(groupData),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['user-available-groups'] });
      setShowCreateModal(false);
      setNewGroup({
        name: '',
        description: '',
        type: 'general',
        maxMembers: 8,
        isPrivate: false,
        tags: []
      });
    },
    onError: (error) => {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-available-groups'] });
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
      alert('Failed to delete group. Please try again.');
    }
  });

  const joinGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.joinGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-available-groups'] });
    },
    onError: (error) => {
      console.error('Failed to join group:', error);
      alert('Failed to join group. Please try again.');
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-available-groups'] });
    },
    onError: (error) => {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group. Please try again.');
    }
  });

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (group.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || group.type === filterType;
    const matchesAssignment = filterAssignment === 'all' || 
      (filterAssignment === 'assigned' && group.isAssigned) ||
      (filterAssignment === 'public' && !group.isAssigned);
    return matchesSearch && matchesType && matchesAssignment;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load groups. Please try again.</p>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recovery': return 'bg-success-100 text-success-800';
      case 'wellness': return 'bg-warning-100 text-warning-800';
      case 'general': return 'bg-primary-100 text-primary-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.name.trim() || !newGroup.description.trim()) {
      alert('Please fill in all required fields.');
      return;
    }
    createGroupMutation.mutate(newGroup);
  };

  const handleInputChange = (field: keyof CreateGroupRequest, value: any) => {
    setNewGroup(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (confirm(`Are you sure you want to delete "${groupName}"? This action cannot be undone.`)) {
      deleteGroupMutation.mutate(groupId);
    }
  };

  const handleJoinGroup = (groupId: string, groupName: string) => {
    if (confirm(`Join "${groupName}"?`)) {
      joinGroupMutation.mutate(groupId);
    }
  };

  const handleLeaveGroup = (groupId: string, groupName: string) => {
    if (confirm(`Leave "${groupName}"? You can rejoin later.`)) {
      leaveGroupMutation.mutate(groupId);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
          <p className="text-gray-600 mt-2">Connect with your support communities</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Create New Group
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          title="Filter Type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Types</option>
          <option value="recovery">Recovery</option>
          <option value="wellness">Wellness</option>
          <option value="general">General</option>
        </select>
        <select
          title="Filter Assignment"
          value={filterAssignment}
          onChange={(e) => setFilterAssignment(e.target.value)}
          className="input sm:w-48"
        >
          <option value="all">All Groups</option>
          <option value="assigned">Assigned Groups</option>
          <option value="public">Public Groups</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {filteredGroups.map((group) => (
          <Link
            key={group.id}
            to={`/app/groups/${group.id}`}
            className="card p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">{group.name}</h3>
                  {group.isAssigned && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      <Star size={12} />
                      Assigned
                    </div>
                  )}
                  {group.isPrivate && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <Shield size={12} />
                      Private
                    </div>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{group.description}</p>
                {group.isAssigned && group.assignedBy && (
                  <p className="text-xs text-blue-600 mb-2">
                    Assigned by {group.assignedBy.firstName} {group.assignedBy.lastName} ({group.assignedBy.role})
                    {group.assignmentNotes && ` - ${group.assignmentNotes}`}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users size={16} />
                    {group.memberCount || 0}/{group.maxMembers}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle size={16} />
                    {new Date(group.lastActivity).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(group.type)}`}>
                  {group.type}
                </span>
                {group.memberCount >= group.maxMembers && (
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                    Full
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteGroup(group.id, group.name);
                  }}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Delete group"
                >
                  <Trash2 size={16} />
                </button>
                {group.isMember ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleLeaveGroup(group.id, group.name);
                    }}
                    className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                  >
                    Leave Group
                  </button>
                ) : group.canJoin ? (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleJoinGroup(group.id, group.name);
                    }}
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Join Group
                  </button>
                ) : (
                  <span className="text-gray-500 text-sm">
                    {group.memberCount >= group.maxMembers ? 'Group Full' : 'Cannot Join'}
                  </span>
                )}
                <Link
                  to={`/app/groups/${group.id}`}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View Group →
                </Link>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested Groups</h2>
        <p className="text-gray-600 mb-6">
          Suggested groups will be available once you set up your profile and preferences.
        </p>
        <div className="text-center py-8">
          <p className="text-gray-500">No suggestions available yet</p>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="input w-full"
                  placeholder="Enter group name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input w-full h-20 resize-none"
                  placeholder="Describe your group's purpose and focus"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Type
                </label>
                <select
                  value={newGroup.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="input w-full"
                  title="Select group type"
                >
                  <option value="general">General Support</option>
                  <option value="recovery">Recovery</option>
                  <option value="wellness">Wellness</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Members
                </label>
                <input
                  type="number"
                  value={newGroup.maxMembers}
                  onChange={(e) => handleInputChange('maxMembers', parseInt(e.target.value))}
                  className="input w-full"
                  min="2"
                  max="20"
                  title="Maximum number of group members"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newGroup.isPrivate}
                  onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                  className="mr-2"
                  title="Make group private"
                />
                <label htmlFor="isPrivate" className="text-sm text-gray-700">
                  Private Group (invitation only)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupsPage;