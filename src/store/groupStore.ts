import { create } from 'zustand';
import { Group, Message, Member } from '@/types';
import { PeerMatchingService } from '@/services/matchingService';
import { AIFacilitatorService } from '@/services/aiFacilitatorService';
import { api } from '@/lib/api';

interface GroupState {
  groups: Group[];
  activeGroup: Group | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;

  // Actions
  loadGroups: () => Promise<void>;
  joinGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  sendMessage: (groupId: string, content: string, memberId: string) => Promise<void>;
  setActiveGroup: (group: Group | null) => void;
  findSuggestedGroups: (member: Member) => Group[];
  createGroup: (groupData: Partial<Group>) => Promise<Group>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [] as Group[],
  activeGroup: null,
  messages: {},
  isLoading: false,

  loadGroups: async () => {
    set({ isLoading: true });
    try {
      // Fetch real groups from API
      const groups = await api.getMemberAvailableGroups();
      console.log('Loaded groups from API:', groups);
      set({ groups });
    } catch (error) {
      console.error('Failed to load groups:', error);
      set({ groups: [] }); // Empty array on error instead of mock data
    } finally {
      set({ isLoading: false });
    }
  },

  joinGroup: async (groupId: string) => {
    try {
      await api.joinGroup(groupId);
      // Reload groups to get updated membership status
      await get().loadGroups();
    } catch (error) {
      console.error('Failed to join group:', error);
      throw error;
    }
  },

  leaveGroup: async (groupId: string) => {
    try {
      await api.leaveGroup(groupId);
      // Reload groups to get updated membership status
      await get().loadGroups();
    } catch (error) {
      console.error('Failed to leave group:', error);
      throw error;
    }
  },

  sendMessage: async (groupId: string, content: string, memberId: string) => {
    const { messages } = get();
    const groupMessages = messages[groupId] || [];

    const newMessage: Message = {
      id: Date.now().toString(),
      groupId,
      memberId,
      content,
      timestamp: new Date(),
      type: 'member',
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
            activeMembers: [],
            sessionLength: 30,
            lastActivity: new Date(),
          },
        });

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          groupId,
          memberId: 'ai',
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

  findSuggestedGroups: (member: Member) => {
    const { groups } = get();
    return PeerMatchingService.suggestGroupForMember(member, groups);
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