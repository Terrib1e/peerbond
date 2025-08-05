/**
 * Group Service - Handle group-related API calls
 * Provides methods for fetching, joining, and managing groups
 */

export interface Group {
  id: string;
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers: number;
  isPrivate: boolean;
  isActive: boolean;
  lastActivity?: string;
  createdAt: string;
  members: string[];
  facilitators: string[];
  memberCount: number;
  tags?: string[];
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: string;
    author: string;
  };
}

export interface GroupsResponse {
  success: boolean;
  data: {
    groups: Group[];
    total: number;
  };
  error?: string;
}

export interface MemberGroupsResponse {
  success: boolean;
  data: Group[];
  error?: string;
}

class GroupService {
  private baseUrl = '/api/groups';

  /**
   * Get groups the current member is part of
   */
  async getMemberGroups(): Promise<Group[]> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/member`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        throw new Error(`Failed to fetch member groups: ${response.statusText}`);
      }

      const result: MemberGroupsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch member groups');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching member groups:', error);
      throw error;
    }
  }

  /**
   * Search for available groups to join
   */
  async searchGroups(params: {
    search?: string;
    type?: 'recovery' | 'wellness' | 'general';
    page?: number;
    limit?: number;
  } = {}): Promise<GroupsResponse> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const queryParams = new URLSearchParams();
      if (params.search) queryParams.append('search', params.search);
      if (params.type) queryParams.append('type', params.type);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(`${this.baseUrl}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        throw new Error(`Failed to search groups: ${response.statusText}`);
      }

      const result: GroupsResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to search groups');
      }

      return result;
    } catch (error) {
      console.error('Error searching groups:', error);
      throw error;
    }
  }

  /**
   * Get details for a specific group
   */
  async getGroupById(groupId: string): Promise<Group> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/${groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        if (response.status === 404) {
          throw new Error('Group not found');
        }
        throw new Error(`Failed to fetch group: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch group');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  }

  /**
   * Join a group
   */
  async joinGroup(groupId: string): Promise<void> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Cannot join group');
        }
        throw new Error(`Failed to join group: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to join group');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<void> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/${groupId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        throw new Error(`Failed to leave group: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  }

  /**
   * Create a new group
   */
  async createGroup(groupData: {
    name: string;
    description: string;
    type: 'recovery' | 'wellness' | 'general';
    maxMembers?: number;
    isPrivate?: boolean;
    tags?: string[];
  }): Promise<Group> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Invalid group data');
        }
        throw new Error(`Failed to create group: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create group');
      }

      return result.data;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }

  /**
   * Update group settings (for facilitators/admins)
   */
  async updateGroup(groupId: string, updates: {
    name?: string;
    description?: string;
    maxMembers?: number;
    isPrivate?: boolean;
    tags?: string[];
  }): Promise<Group> {
    try {
      const token = localStorage.getItem('peerbond_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${this.baseUrl}/${groupId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to update this group');
        }
        throw new Error(`Failed to update group: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update group');
      }

      return result.data;
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const groupService = new GroupService();

// Export utility functions for easy use
export const getMemberGroups = () => groupService.getMemberGroups();
export const searchGroups = (params?: Parameters<typeof groupService.searchGroups>[0]) => 
  groupService.searchGroups(params);
export const getGroupById = (groupId: string) => groupService.getGroupById(groupId);
export const joinGroup = (groupId: string) => groupService.joinGroup(groupId);
export const leaveGroup = (groupId: string) => groupService.leaveGroup(groupId);
export const createGroup = (groupData: Parameters<typeof groupService.createGroup>[0]) => 
  groupService.createGroup(groupData);

export default groupService;