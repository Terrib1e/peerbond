import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, Calendar, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Group } from '@/types';
import ChatInterface from '@/components/chat/ChatInterface';

function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'chat'>('overview');
  const { user } = useAuthStore();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.getGroups(),
  });

  const group = groups.find(g => g.id === groupId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Group Not Found</h1>
          <p className="text-gray-600 mb-6">The group you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/app/groups" className="btn-primary">
            <ArrowLeft size={16} className="mr-2" />
            Back to Groups
          </Link>
        </div>
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/app/groups" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Groups
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
            <p className="text-gray-600 mb-4">{group.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users size={16} />
                {group.members.length}/{group.maxMembers} members
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                Created {new Date(group.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle size={16} />
                Last active {new Date(group.lastActivity).toLocaleDateString()}
              </div>
            </div>
          </div>
          <span className={`px-3 py-1 text-sm rounded-full ${getTypeColor(group.type)}`}>
            {group.type}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'members', label: 'Members' },
            { id: 'chat', label: 'Chat' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Group</h3>
              <p className="text-gray-600 mb-4">{group.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Group Details</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>Type: <span className="capitalize">{group.type}</span></li>
                    <li>Privacy: {group.isPrivate ? 'Private' : 'Public'}</li>
                    <li>Status: {group.isActive ? 'Active' : 'Inactive'}</li>
                    <li>Max Members: {group.maxMembers}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Activity</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>Created: {new Date(group.createdAt).toLocaleDateString()}</li>
                    <li>Last Activity: {new Date(group.lastActivity).toLocaleDateString()}</li>
                    <li>Current Members: {group.members.length}</li>
                  </ul>
                </div>
              </div>
            </div>

            {group.tags && group.tags.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h3>
            <div className="space-y-3">
              {group.members.map((memberId, index) => (
                <div key={memberId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-sm">
                        {user && memberId === user.id ? user.firstName[0] : 'M'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user && memberId === user.id ? `${user.firstName} ${user.lastName}` : `Member ${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user && memberId === user.id ? user.email : 'member@example.com'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {user && memberId === user.id && user.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && user && (
          <div className="h-[600px] border border-gray-200 rounded-lg overflow-hidden">
            <ChatInterface
              groupId={groupId!}
              currentUser={user}
              group={group}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetailPage;