import { create } from 'zustand';
import { Group, Message, User } from '@/types';
import { PeerMatchingService } from '@/services/matchingService';
import { AIFacilitatorService } from '@/services/aiFacilitatorService';

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;

  // Actions
  loadGroups: () => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string, userId: string) => Promise<void>;
  setActiveGroup: (group: Group | null) => void;
  findSuggestedGroups: (user: User) => Group[];
  createGroup: (groupData: Partial<Group>) => Promise<Group>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [
    {
      id: '1',
      name: 'Recovery Support Circle',
      description: 'A safe space for those in recovery to share experiences and support each other',
      type: 'recovery' as const,
      createdBy: '1',
      facilitators: ['1'], // User IDs as strings
      members: ['1', '2'], // User IDs as strings
      maxMembers: 8,
      isPrivate: false,
      isActive: true,
      tags: ['recovery', 'support'],
      createdAt: new Date(),
      lastActivity: new Date(),
    },
    {
      id: '2',
      name: 'Anxiety Management Group',
      description: 'Learn and practice techniques for managing anxiety together',
      type: 'wellness' as const, // Changed from 'anxiety' to 'wellness'
      createdBy: '3',
      facilitators: ['3'],
      members: ['3', '4'], // User IDs as strings
      maxMembers: 6,
      isPrivate: false,
      isActive: true,
      tags: ['anxiety', 'coping'],
      createdAt: new Date(),
      lastActivity: new Date(),
    },
    {
      id: '3',
      name: 'Daily Check-ins',
      description: 'Start your day with positive intention and connection',
      type: 'general' as const,
      createdBy: '2',
      facilitators: ['2'],
      members: ['1', '2', '3', '4'], // User IDs as strings
      maxMembers: 10,
      isPrivate: false,
      isActive: true,
      tags: ['daily', 'check-in', 'motivation'],
      createdAt: new Date(),
      lastActivity: new Date(),
    },
  ] as Group[],
  activeGroup: null,
  messages: {},
  isLoading: false,

  loadGroups: async () => {
    set({ isLoading: true });
    try {
      // Mock data for development
      const mockGroups: Group[] = [
        {
          id: '1',
          name: 'Recovery Support Circle',
          description: 'A safe space for those in recovery to share experiences and support each other',
          type: 'recovery' as const,
          createdBy: '1',
          facilitators: ['1'], // User IDs as strings
          members: ['1', '2'], // User IDs as strings
          maxMembers: 8,
          isPrivate: false,
          isActive: true,
          tags: ['recovery', 'support'],
          createdAt: new Date(),
          lastActivity: new Date(),
        },
        {
          id: '2',
          name: 'Anxiety Management Group',
          description: 'Learn and practice techniques for managing anxiety together',
          type: 'wellness' as const, // Changed from 'anxiety' to 'wellness'
          createdBy: '3',
          facilitators: ['3'],
          members: ['3', '4'], // User IDs as strings
          maxMembers: 6,
          isPrivate: false,
          isActive: true,
          tags: ['anxiety', 'coping'],
          createdAt: new Date(),
          lastActivity: new Date(),
        },
        {
          id: '3',
          name: 'Daily Check-ins',
          description: 'Start your day with positive intention and connection',
          type: 'general' as const,
          createdBy: '2',
          facilitators: ['2'],
          members: ['1', '2', '3', '4'], // User IDs as strings
          maxMembers: 10,
          isPrivate: false,
          isActive: true,
          tags: ['daily', 'check-in', 'motivation'],
          createdAt: new Date(),
          lastActivity: new Date(),
        },
      ];

      set({ groups: mockGroups });
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  joinGroup: async (groupId: string) => {
    const { groups } = get();
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    if (group.members.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    console.log(`Joining group: ${group.name}`);
  },

  leaveGroup: async (groupId: string) => {
    const { groups } = get();
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');

    console.log(`Leaving group: ${group.name}`);
  },

  sendMessage: async (groupId: string, content: string, userId: string) => {
    const { messages } = get();
    const groupMessages = messages[groupId] || [];

    const newMessage: Message = {
      id: Date.now().toString(),
      groupId,
      userId,
      content,
      timestamp: new Date(),
      type: 'user',
      reactions: [],
    };

    const updatedMessages = [...groupMessages, newMessage];

    set({
      messages: {
        ...messages,
        [groupId]: updatedMessages,
      },
    });

    setTimeout(async () => {
      const shouldFacilitatorRespond = AIFacilitatorService.shouldInterject(
        updatedMessages,
        new Date(Date.now() - 5 * 60 * 1000)
      );

      if (shouldFacilitatorRespond) {
        const facilitatorResponse = await AIFacilitatorService.generateResponse({
          type: 'encourage',
          context: {
            groupType: 'recovery',
            recentMessages: updatedMessages.slice(-5),
            activeUsers: [],
            sessionLength: 30,
            lastActivity: new Date(),
          },
        });

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          groupId,
          userId: 'ai',
          content: facilitatorResponse.message,
          timestamp: new Date(),
          type: 'ai_facilitator',
          reactions: [],
        };

        const { messages: currentMessages } = get();
        set({
          messages: {
            ...currentMessages,
            [groupId]: [...(currentMessages[groupId] || []), aiMessage],
          },
        });
      }
    }, 2000);
  },

  setActiveGroup: (group: Group | null) => {
    set({ activeGroup: group });
  },

  findSuggestedGroups: (user: User) => {
    const { groups } = get();
    return PeerMatchingService.suggestGroupForUser(user, groups);
  },

  createGroup: async (groupData: Partial<Group>) => {
    const { groups } = get();

    const newGroup: Group = {
      id: Date.now().toString(),
      name: groupData.name || 'New Group',
      description: groupData.description || '',
      type: groupData.type || 'general',
      createdBy: groupData.createdBy || 'system',
      facilitators: groupData.facilitators || ['ai-maya'],
      members: groupData.members || [],
      maxMembers: groupData.maxMembers || 6,
      isPrivate: groupData.isPrivate || false,
      isActive: groupData.isActive !== false,
      tags: groupData.tags || [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    set({ groups: [...groups, newGroup] });
    return newGroup;
  },
}));