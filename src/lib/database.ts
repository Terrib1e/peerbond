import { Member, Group, Message, ActionItem, Insight } from '@/types';
import { nanoid } from 'nanoid';

export interface DatabaseConfig {
  storage: 'localStorage' | 'indexedDB' | 'memory';
  encryptionKey?: string;
}

export class Database {
  private config: DatabaseConfig;
  private data: {
    members: Map<string, Member>;
    groups: Map<string, Group>;
    messages: Map<string, Message[]>;
    actionItems: Map<string, ActionItem[]>;
    insights: Map<string, Insight[]>;
    memberSessions: Map<string, { memberId: string; expiresAt: Date }>;
  };

  constructor(config: DatabaseConfig = { storage: 'localStorage' }) {
    this.config = config;
    this.data = {
      members: new Map(),
      groups: new Map(),
      messages: new Map(),
      actionItems: new Map(),
      insights: new Map(),
      memberSessions: new Map(),
    };

    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    if (this.config.storage === 'localStorage' && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('peerbond_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          this.data.members = new Map(parsed.members || []);
          this.data.groups = new Map(parsed.groups || []);
          this.data.messages = new Map(parsed.messages || []);
          this.data.actionItems = new Map(parsed.actionItems || []);
          this.data.insights = new Map(parsed.insights || []);
          this.data.memberSessions = new Map(parsed.memberSessions || []);
        }
      } catch (error) {
        console.error('Failed to load data from localStorage:', error);
      }
    }
  }

  private async saveToStorage(): Promise<void> {
    if (this.config.storage === 'localStorage' && typeof window !== 'undefined') {
      try {
        const toStore = {
          members: Array.from(this.data.members.entries()),
          groups: Array.from(this.data.groups.entries()),
          messages: Array.from(this.data.messages.entries()),
          actionItems: Array.from(this.data.actionItems.entries()),
          insights: Array.from(this.data.insights.entries()),
          memberSessions: Array.from(this.data.memberSessions.entries()),
        };
        localStorage.setItem('peerbond_data', JSON.stringify(toStore));
      } catch (error) {
        console.error('Failed to save data to localStorage:', error);
      }
    }
  }

  // Member operations
  async createMember(memberData: Omit<Member, 'id' | 'createdAt'>): Promise<Member> {
    const member: Member = {
      id: nanoid(),
      ...memberData,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    this.data.members.set(member.id, member);
    await this.saveToStorage();
    return member;
  }

  async getMemberByEmail(email: string): Promise<Member | null> {
    for (const member of this.data.members.values()) {
      if (member.email === email) {
        return member;
      }
    }
    return null;
  }

  async getMemberById(id: string): Promise<Member | null> {
    return this.data.members.get(id) || null;
  }

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
    const member = this.data.members.get(id);
    if (!member) return null;

    const updatedUser = { ...member, ...updates, lastActive: new Date() };
    this.data.members.set(id, updatedUser);
    await this.saveToStorage();
    return updatedUser;
  }

  async deleteMember(id: string): Promise<boolean> {
    const deleted = this.data.members.delete(id);
    if (deleted) {
      await this.saveToStorage();
    }
    return deleted;
  }

  async getAllMembers(): Promise<Member[]> {
    return Array.from(this.data.members.values());
  }

  // Group operations
  async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'lastActivity'>): Promise<Group> {
    const group: Group = {
      id: nanoid(),
      ...groupData,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.data.groups.set(group.id, group);
    this.data.messages.set(group.id, []);
    this.data.actionItems.set(group.id, []);
    this.data.insights.set(group.id, []);
    await this.saveToStorage();
    return group;
  }

  async getGroupById(id: string): Promise<Group | null> {
    return this.data.groups.get(id) || null;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
    const group = this.data.groups.get(id);
    if (!group) return null;

    const updatedGroup = { ...group, ...updates, lastActivity: new Date() };
    this.data.groups.set(id, updatedGroup);
    await this.saveToStorage();
    return updatedGroup;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const deleted = this.data.groups.delete(id);
    if (deleted) {
      this.data.messages.delete(id);
      this.data.actionItems.delete(id);
      this.data.insights.delete(id);
      await this.saveToStorage();
    }
    return deleted;
  }

  async getAllGroups(): Promise<Group[]> {
    return Array.from(this.data.groups.values());
  }

  async getMemberGroups(_memberId: string): Promise<Group[]> {
    const groups = Array.from(this.data.groups.values());
    return groups.filter(group => group.members.some(memberId => memberId === memberId));
  }

  // Message operations
  async addMessage(groupId: string, messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const message: Message = {
      id: nanoid(),
      ...messageData,
      timestamp: new Date(),
    };

    const messages = this.data.messages.get(groupId) || [];
    messages.push(message);
    this.data.messages.set(groupId, messages);

    // Update group last activity
    const group = this.data.groups.get(groupId);
    if (group) {
      group.lastActivity = new Date();
      this.data.groups.set(groupId, group);
    }

    await this.saveToStorage();
    return message;
  }

  async getMessages(groupId: string, limit?: number): Promise<Message[]> {
    const messages = this.data.messages.get(groupId) || [];
    return limit ? messages.slice(-limit) : messages;
  }

  async deleteMessage(groupId: string, messageId: string): Promise<boolean> {
    const messages = this.data.messages.get(groupId) || [];
    const filteredMessages = messages.filter(msg => msg.id !== messageId);

    if (filteredMessages.length !== messages.length) {
      this.data.messages.set(groupId, filteredMessages);
      await this.saveToStorage();
      return true;
    }
    return false;
  }

  // Action Item operations
  async addActionItem(groupId: string, actionItemData: Omit<ActionItem, 'id' | 'createdAt'>): Promise<ActionItem> {
    const actionItem: ActionItem = {
      id: nanoid(),
      ...actionItemData,
      createdAt: new Date(),
    };

    const actionItems = this.data.actionItems.get(groupId) || [];
    actionItems.push(actionItem);
    this.data.actionItems.set(groupId, actionItems);
    await this.saveToStorage();
    return actionItem;
  }

  async getActionItems(groupId: string): Promise<ActionItem[]> {
    return this.data.actionItems.get(groupId) || [];
  }

  async updateActionItem(groupId: string, actionItemId: string, updates: Partial<ActionItem>): Promise<ActionItem | null> {
    const actionItems = this.data.actionItems.get(groupId) || [];
    const index = actionItems.findIndex(item => item.id === actionItemId);

    if (index === -1) return null;

    actionItems[index] = { ...actionItems[index], ...updates };
    this.data.actionItems.set(groupId, actionItems);
    await this.saveToStorage();
    return actionItems[index];
  }

  // Insight operations
  async addInsight(groupId: string, insightData: Omit<Insight, 'id' | 'generatedAt'>): Promise<Insight> {
    const insight: Insight = {
      id: nanoid(),
      ...insightData,
      generatedAt: new Date(),
    };

    const insights = this.data.insights.get(groupId) || [];
    insights.push(insight);
    this.data.insights.set(groupId, insights);
    await this.saveToStorage();
    return insight;
  }

  async getInsights(groupId: string): Promise<Insight[]> {
    return this.data.insights.get(groupId) || [];
  }

  // Session management
  async createSession(memberId: string, expiresIn: number = 86400000): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + expiresIn);

    this.data.memberSessions.set(sessionId, { memberId, expiresAt });
    await this.saveToStorage();
    return sessionId;
  }

  async getSessionMember(sessionId: string): Promise<Member | null> {
    const session = this.data.memberSessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) {
      this.data.memberSessions.delete(sessionId);
      await this.saveToStorage();
      return null;
    }

    return this.getMemberById(session.memberId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = this.data.memberSessions.delete(sessionId);
    if (deleted) {
      await this.saveToStorage();
    }
    return deleted;
  }

  // Analytics
  async getStats(): Promise<{
    totalUsers: number;
    totalGroups: number;
    totalMessages: number;
    activeUsers: number;
    activeGroups: number;
  }> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const members = Array.from(this.data.members.values());
    const groups = Array.from(this.data.groups.values());
    const allMessages = Array.from(this.data.messages.values()).flat();

    return {
      totalUsers: members.length,
      totalGroups: groups.length,
      totalMessages: allMessages.length,
      activeUsers: members.filter(member => member.lastActive && member.lastActive > dayAgo).length,
      activeGroups: groups.filter(group => group.lastActivity > dayAgo).length,
    };
  }

  // Search functionality
  async searchMembers(query: string): Promise<Member[]> {
    const members = Array.from(this.data.members.values());
    const searchQuery = query.toLowerCase();

    return members.filter(member =>
      member.firstName.toLowerCase().includes(searchQuery) ||
      member.lastName.toLowerCase().includes(searchQuery) ||
      member.email.toLowerCase().includes(searchQuery)
    );
  }

  async searchGroups(query: string): Promise<Group[]> {
    const groups = Array.from(this.data.groups.values());
    const searchQuery = query.toLowerCase();

    return groups.filter(group =>
      group.name.toLowerCase().includes(searchQuery) ||
      (group.description && group.description.toLowerCase().includes(searchQuery))
    );
  }
}

export const db = new Database();