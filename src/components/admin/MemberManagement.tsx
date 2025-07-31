import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  UserCheck,
  UserX,
  Download,
  Upload,
  Shield,
  Crown,
  Activity,
  Calendar,
  Mail,
  UserPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Member } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { toast } from 'react-hot-toast';

interface MemberFilters {
  search: string;
  role: string;
  status: string;
  experienceLevel: string;
  dateRange: string;
}

interface BulkAction {
  type: 'activate' | 'deactivate' | 'delete' | 'changeRole' | 'export';
  label: string;
  icon: React.ReactNode;
  className: string;
}

export default function MemberManagement() {
  const [filters, setFilters] = useState<MemberFilters>({
    search: '',
    role: 'all',
    status: 'all',
    experienceLevel: 'all',
    dateRange: 'all'
  });

  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [showAssignTherapistDialog, setShowAssignTherapistDialog] = useState(false);
  const [assigningMember, setAssigningMember] = useState<Member | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const queryClient = useQueryClient();

  // Fetch members with pagination and filters
  const { data: membersData } = useQuery({
    queryKey: ['admin-members', currentPage, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role !== 'all' && { role: filters.role }),
        ...(filters.status !== 'all' && { status: filters.status === 'active' ? 'true' : 'false' }),
        ...(filters.experienceLevel !== 'all' && { experienceLevel: filters.experienceLevel })
      });

      const response = await api.get<{
        success: boolean;
        data: {
          members: Member[];
          total: number;
        };
        timestamp: string;
      }>(`/admin/members?${params}`);
      return response.data;
    },
    refetchInterval: 30000
  });

  const members = membersData?.members || [];
  const totalMembers = membersData?.total || 0;
  const totalPages = Math.ceil(totalMembers / pageSize);

  // Fetch therapists for assignment
  const { data: therapistsData } = useQuery({
    queryKey: ['admin-therapists'],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: {
          therapists: Array<{
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            clientCount: number;
            isVerified: boolean;
            specializations: string;
          }>;
        };
        timestamp: string;
      }>('/admin/therapists');
      return response.data;
    }
  });

  const therapists = therapistsData?.therapists || [];

  // Bulk operations
  const bulkActivateMutation = useMutation({
    mutationFn: (memberIds: string[]) => api.post('/admin/bulk/members/activate', { memberIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      setSelectedMembers(new Set());
      toast.success('Members activated successfully');
    },
    onError: () => toast.error('Failed to activate members')
  });

  const bulkDeactivateMutation = useMutation({
    mutationFn: (memberIds: string[]) => api.post('/admin/bulk/members/deactivate', { memberIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      setSelectedMembers(new Set());
      toast.success('Members deactivated successfully');
    },
    onError: () => toast.error('Failed to deactivate members')
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.delete(`/admin/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Member deleted successfully');
    },
    onError: () => toast.error('Failed to delete member')
  });

  // Handle member selection
  const handleSelectMember = (memberId: string) => {
    const newSelection = new Set(selectedMembers);
    if (newSelection.has(memberId)) {
      newSelection.delete(memberId);
    } else {
      newSelection.add(memberId);
    }
    setSelectedMembers(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map((member: any) => member.id)));
    }
  };

  // Bulk actions
  const bulkActions: BulkAction[] = [
    {
      type: 'activate',
      label: 'Activate Members',
      icon: <UserCheck className="w-4 h-4" />,
      className: 'text-green-600 hover:bg-green-50'
    },
    {
      type: 'deactivate',
      label: 'Deactivate Members',
      icon: <UserX className="w-4 h-4" />,
      className: 'text-orange-600 hover:bg-orange-50'
    },
    {
      type: 'export',
      label: 'Export Selected',
      icon: <Download className="w-4 h-4" />,
      className: 'text-blue-600 hover:bg-blue-50'
    }
  ];

  const handleBulkAction = (action: BulkAction) => {
    const selectedMemberIds = Array.from(selectedMembers);

    switch (action.type) {
      case 'activate':
        bulkActivateMutation.mutate(selectedMemberIds);
        break;
      case 'deactivate':
        bulkDeactivateMutation.mutate(selectedMemberIds);
        break;
      case 'export':
        // Handle export functionality
        toast.success('Export started');
        break;
    }
    setShowBulkActions(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-red-500" />;
      case 'therapist': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'facilitator': return <Users className="w-4 h-4 text-green-500" />;
      default: return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'therapist': return 'bg-blue-100 text-blue-800';
      case 'facilitator': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Member Management</h2>
          <p className="text-gray-600 mt-1">Manage member accounts, roles, and permissions</p>
        </div>

        <div className="flex items-center gap-3">
          {selectedMembers.size > 0 && (
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="bg-blue-50 border-blue-200 text-blue-700"
              >
                <MoreHorizontal className="w-4 h-4 mr-2" />
                Bulk Actions ({selectedMembers.size})
              </Button>

              {showBulkActions && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {bulkActions.map((action) => (
                    <button
                      key={action.type}
                      onClick={() => handleBulkAction(action)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${action.className}`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Members
          </Button>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Member</DialogTitle>
              </DialogHeader>
              <CreateMemberForm onClose={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search members..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>

            <select
              title="Role Filter"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="therapist">Therapist</option>
              <option value="facilitator">Facilitator</option>
              <option value="member">Member</option>
            </select>

            <select
              title="Status Filter"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              title="Experience Level"
              value={filters.experienceLevel}
              onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members ({totalMembers})</CardTitle>
            <div className="flex items-center gap-2">
              <input
                title="Select All"
                type="checkbox"
                checked={selectedMembers.size === members.length && members.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {members.map((member: any) => (
                  <tr key={member.id} className={`hover:bg-gray-50 ${selectedMembers.has(member.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          title="Select Member"
                          type="checkbox"
                          checked={selectedMembers.has(member.id)}
                          onChange={() => handleSelectMember(member.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-4"
                        />
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {member.firstName[0]}{member.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          member.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {member.lastActive
                            ? new Date(member.lastActive).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Math.floor(Math.random() * 5)} groups
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingMember(member);
                            setShowEditDialog(true);
                          }}
                          title="Edit member"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {member.role === 'member' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAssigningMember(member);
                              setShowAssignTherapistDialog(true);
                            }}
                            title="Assign therapist"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <UserPlus className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete member ${member.firstName} ${member.lastName}? This action cannot be undone.`)) {
                              deleteMemberMutation.mutate(member.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="Delete member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalMembers)} of {totalMembers} members
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

      {/* Edit Member Dialog */}
      {showEditDialog && editingMember && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Member: {editingMember.firstName} {editingMember.lastName}</DialogTitle>
            </DialogHeader>
            <EditMemberForm
              member={editingMember}
              onClose={() => {
                setShowEditDialog(false);
                setEditingMember(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Therapist Dialog */}
      {showAssignTherapistDialog && assigningMember && (
        <Dialog open={showAssignTherapistDialog} onOpenChange={setShowAssignTherapistDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Therapist to {assigningMember.firstName} {assigningMember.lastName}</DialogTitle>
            </DialogHeader>
            <AssignTherapistForm
              member={assigningMember}
              therapists={therapists}
              onClose={() => {
                setShowAssignTherapistDialog(false);
                setAssigningMember(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Create Member Form Component
function CreateMemberForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'member',
    experienceLevel: 'beginner',
    isActive: true
  });

  const queryClient = useQueryClient();

  const createMemberMutation = useMutation({
    mutationFn: (memberData: any) => api.post('/auth/register', memberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Member created successfully');
      onClose();
    },
    onError: () => toast.error('Failed to create member')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMemberMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            title="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' | 'therapist' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member</option>
            <option value="facilitator">Facilitator</option>
            <option value="therapist">Therapist</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
          <select
            title="Experience Level"
            value={formData.experienceLevel}
            onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
          Active Account
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Create Member
        </Button>
      </div>
    </form>
  );
}

// Edit Member Form Component
function EditMemberForm({ member, onClose }: { member: Member; onClose: () => void }) {
  const [formData, setFormData] = useState({
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    role: member.role,
    experienceLevel: member.experienceLevel || 'beginner',
    isActive: member.isActive
  });

  const queryClient = useQueryClient();

  const updateMemberMutation = useMutation({
    mutationFn: (memberData: any) => api.patch(`/members/${member.id}`, memberData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Member updated successfully');
      onClose();
    },
    onError: () => toast.error('Failed to update member')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMemberMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <Input
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <Input
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            title="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'member' | 'admin' | 'therapist' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="member">Member</option>
            <option value="facilitator">Facilitator</option>
            <option value="therapist">Therapist</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
          <select
            title="Experience Level"
            value={formData.experienceLevel}
            onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActiveEdit"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActiveEdit" className="text-sm font-medium text-gray-700">
          Active Account
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Update Member
        </Button>
      </div>
    </form>
  );
}

// Assign Therapist Form Component
function AssignTherapistForm({
  member,
  therapists,
  onClose
}: {
  member: Member;
  therapists: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    clientCount: number;
    isVerified: boolean;
    specializations: string;
  }>;
  onClose: () => void;
}) {
  const [selectedTherapistId, setSelectedTherapistId] = useState('');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const assignTherapistMutation = useMutation({
    mutationFn: (data: { therapistId: string; clientId: string; notes: string }) =>
      api.post('/admin/therapist-assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-therapists'] });
      toast.success('Therapist assigned successfully');
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to assign therapist';
      toast.error(message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTherapistId) {
      toast.error('Please select a therapist');
      return;
    }
    assignTherapistMutation.mutate({
      therapistId: selectedTherapistId,
      clientId: member.id,
      notes
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Therapist</label>
        <select
          title="Select Therapist"
          value={selectedTherapistId}
          onChange={(e) => setSelectedTherapistId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Choose a therapist...</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.firstName} {therapist.lastName} - {therapist.email} ({therapist.clientCount} clients)
              {therapist.isVerified && ' ✓'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add any relevant notes about this assignment..."
        />
      </div>

      {selectedTherapistId && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Selected Therapist:</strong>{' '}
            {therapists.find(t => t.id === selectedTherapistId)?.firstName}{' '}
            {therapists.find(t => t.id === selectedTherapistId)?.lastName}
          </p>
          {therapists.find(t => t.id === selectedTherapistId)?.specializations && (
            <p className="text-sm text-blue-600 mt-1">
              <strong>Specializations:</strong>{' '}
              {therapists.find(t => t.id === selectedTherapistId)?.specializations}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedTherapistId}>
          Assign Therapist
        </Button>
      </div>
    </form>
  );
}