import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { PopulatedGroup } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuthStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch group data (assuming API returns PopulatedGroup with full user objects)
  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => api.getGroup(groupId!),
    enabled: !!groupId,
  }) as { data: PopulatedGroup | undefined; isLoading: boolean };

  // ... existing useEffect for scrolling ...

  if (isLoading) return <LoadingSpinner />;
  if (!group) return <div>Group not found</div>;
  if (!user) return <div>Please log in</div>;

  // For PopulatedGroup, members are User objects, so we can access .id directly
  const isMember = group.members.some((member: any) => member.id === user.id);

  if (!isMember) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-4">
            You are not a member of this group and cannot view the messages.
          </p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  // ... rest of the component with member objects properly typed ...

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Group Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-500">
              {group.members.length} members • {group.type}
            </p>
          </div>

          {/* Members List */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Members:</span>
            <div className="flex -space-x-2">
              {group.members.map((member: any) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium border-2 border-white"
                  title={`${member.firstName} ${member.lastName}`}
                >
                  {member.firstName?.[0]}{member.lastName?.[0]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Messages will be rendered here */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Button
            onClick={() => {
              // Handle send message
              setNewMessage('');
            }}
            disabled={!newMessage.trim()}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}