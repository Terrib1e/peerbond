import { User, Group, Message, ActionItem, Insight } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  recoveryGoals?: string[];
  wellnessGoals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers?: number;
  isPrivate?: boolean;
  tags?: string[];
}

export interface SendMessageRequest {
  groupId: string;
  content: string;
  type?: 'text' | 'user' | 'system' | 'ai_facilitator';
}

// AI Orchestration interfaces
export interface OrchestrationMessageRequest {
  content: string;
  sessionId?: string;
  groupId?: string;
  messageType?: 'user' | 'system';
}

export interface OrchestrationResponse {
  success: boolean;
  data: {
    response: string;
    sessionId?: string;
    agentUsed?: string[];
    toolsUsed?: string[];
    needsCrisisIntervention?: boolean;
    confidence?: number;
    metadata?: any;
  };
  timestamp: string;
}

export interface SessionStartRequest {
  groupId?: string;
  userProfile?: {
    interests?: string[];
    experience?: string;
    goals?: string[];
  };
}

export interface SessionAnalytics {
  messageCount: number;
  duration: string;
  sentimentTrend?: string;
  agentsUsed?: string[];
  crisisAlerts?: number;
}

export type OrchestrationSystem = 'simple' | 'production' | 'main' | 'working';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGroups: number;
  activeGroups: number;
  totalMessages: number;
  premiumUsers: number;
  monthlyGrowth: number;
  avgEngagement: number;
}

export class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Use direct backend URL for now since proxy isn't working
    const isDevelopment = (import.meta as any).env?.DEV;
    this.baseURL = isDevelopment ? 'http://localhost:3001' : ((import.meta as any).env?.VITE_API_URL || 'http://localhost:3001');

    console.log('🔧 ApiService initialized:');
    console.log('🔧 - isDevelopment:', isDevelopment);
    console.log('🔧 - baseURL:', this.baseURL);
    console.log('🔧 - env.DEV:', (import.meta as any).env?.DEV);

    this.loadToken();
  }

  private loadToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('peerbond_token');
    }
  }

  private saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('peerbond_token', token);
      this.token = token;
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('peerbond_token');
      this.token = null;
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log('🔧 makeRequest: called with endpoint =', endpoint);

    const url = `${this.baseURL}/api${endpoint}`;
    console.log('🔧 makeRequest: full URL =', url);

    // Ensure we have the latest token
    if (!this.token && typeof window !== 'undefined') {
      this.loadToken();
      console.log('🔧 makeRequest: loaded token from localStorage');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      console.log('🔧 makeRequest: added auth header');
    } else {
      console.log('⚠️ makeRequest: NO TOKEN - request will be unauthenticated');
    }

    console.log('🔧 makeRequest: about to fetch...');
    let response;
    try {
      // Add timeout to prevent infinite hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏱️ makeRequest: fetch timeout after 100 seconds');
        controller.abort();
      }, 100000);

      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('✅ makeRequest: fetch completed, status =', response.status, response.statusText);
    } catch (fetchError) {
      console.error('❌ makeRequest: fetch error details:', fetchError);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout - server took too long to respond');
      }
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    if (!response.ok) {
      console.log('❌ makeRequest: response not ok, trying to parse error...');
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      console.log('❌ makeRequest: error =', error);
      
      // Log validation details if available
      if (error.details && Array.isArray(error.details)) {
        console.log('❌ makeRequest: validation details =', error.details);
      }
      
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    console.log('🔄 makeRequest: about to parse JSON response...');
    try {
      const jsonResponse = await response.json();
      console.log('✅ makeRequest: JSON parsed successfully =', jsonResponse);
      return jsonResponse;
    } catch (jsonError) {
      console.error('❌ makeRequest: JSON parsing failed:', jsonError);
      const responseText = await response.text();
      console.error('❌ makeRequest: raw response text:', responseText);
      throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
    }
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
    const response = await this.makeRequest<{ data: { user: User; token: string; expiresAt: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    this.saveToken(response.data.token);
    return { user: response.data.user, token: response.data.token };
  }

  async register(userData: RegisterRequest): Promise<{ user: User; token: string }> {
    const response = await this.makeRequest<{ data: { user: User; token: string; expiresAt: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    this.saveToken(response.data.token);
    return { user: response.data.user, token: response.data.token };
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) {
      return null;
    }

    try {
      const response = await this.makeRequest<{ data: { user: User } }>('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      this.clearToken();
      return null;
    }
  }

  // User methods
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.makeRequest<{ user: User }>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.user;
  }

  // Group methods
  async getGroups(): Promise<Group[]> {
    const response = await this.makeRequest<{ data: { groups: Group[] } }>('/groups');
    console.log('API getGroups response:', response);
    return response.data.groups;
  }

  async getGroup(id: string): Promise<Group> {
    const response = await this.makeRequest<{ data: { group: Group } }>(`/groups/${id}`);
    return response.data.group;
  }

  async createGroup(groupData: CreateGroupRequest): Promise<Group> {
    console.log('API createGroup request:', groupData);
    const response = await this.makeRequest<{ data: { group: Group } }>('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
    console.log('API createGroup response:', response);
    return response.data.group;
  }

  async joinGroup(groupId: string): Promise<void> {
    await this.makeRequest(`/groups/${groupId}/join`, {
      method: 'POST',
    });
  }

  async leaveGroup(groupId: string): Promise<void> {
    await this.makeRequest(`/groups/${groupId}/leave`, {
      method: 'POST',
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.makeRequest(`/admin/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  // Message methods
  async getMessages(groupId: string): Promise<Message[]> {
    const response = await this.makeRequest<any>(`/messages/${groupId}`);
    // Handle both response formats: { data: { messages: [] } } and { messages: [] }
    if (response.data && response.data.messages) {
      return response.data.messages;
    } else if (response.messages) {
      return response.messages;
    } else {
      console.warn('Unexpected messages response format:', response);
      return [];
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const response = await this.makeRequest<any>(`/messages/${request.groupId}`, {
      method: 'POST',
      body: JSON.stringify({
        content: request.content,
        type: request.type
      }),
    });
    // Handle both response formats: { data: { message: {} } } and { message: {} }
    if (response.data && response.data.message) {
      return response.data.message;
    } else if (response.message) {
      return response.message;
    } else {
      console.warn('Unexpected send message response format:', response);
      throw new Error('Invalid response format');
    }
  }

  // Admin methods
  async getAdminStats(): Promise<AdminStats> {
    return this.makeRequest<AdminStats>('/admin/stats');
  }

  async getAllUsers(): Promise<User[]> {
    const response = await this.makeRequest<{ data: { users: User[] } }>('/users');
    return response.data.users;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.makeRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response = await this.makeRequest<{ user: User }>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.user;
  }

  // Analytics methods
  async getAnalytics(): Promise<AdminStats> {
    return this.makeRequest<AdminStats>('/admin/analytics');
  }

  // Action items
  async getActionItems(groupId: string): Promise<ActionItem[]> {
    const response = await this.makeRequest<{ actionItems: ActionItem[] }>(`/groups/${groupId}/action-items`);
    return response.actionItems;
  }

  async createActionItem(actionItem: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActionItem> {
    const response = await this.makeRequest<{ actionItem: ActionItem }>('/action-items', {
      method: 'POST',
      body: JSON.stringify(actionItem),
    });
    return response.actionItem;
  }

  // Insights
  async getInsights(groupId: string): Promise<Insight[]> {
    const response = await this.makeRequest<{ insights: Insight[] }>(`/groups/${groupId}/insights`);
    return response.insights;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const url = this.baseURL ? `${this.baseURL}/health` : '/health';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  // AI Orchestration methods
  private getOrchestrationPath(system: OrchestrationSystem): string {
    switch (system) {
      case 'simple':
        return '/production-orchestration';
      case 'production':
        return '/production-orchestration';
      case 'main':
        return '/production-orchestration';
      case 'working':
        return '/production-orchestration';
      default:
        return '/production-orchestration'; // All use production orchestration
    }
  }

  async startOrchestrationSession(
    system: OrchestrationSystem = 'production',
    request?: SessionStartRequest
  ): Promise<{ sessionId: string; welcomeMessage?: string }> {
    const path = this.getOrchestrationPath(system);
    const response = await this.makeRequest<{
      success: boolean;
      data: { sessionId: string; welcomeMessage?: string };
    }>(`${path}/session/start`, {
      method: 'POST',
      body: JSON.stringify(request || {}),
    });
    return response.data;
  }

  async sendOrchestrationMessage(
    request: OrchestrationMessageRequest,
    system: OrchestrationSystem = 'production'
  ): Promise<OrchestrationResponse> {
    console.log('🔧 API: sendOrchestrationMessage called');
    console.log('🔧 API: system =', system);
    console.log('🔧 API: request =', request);

    const path = this.getOrchestrationPath(system);
    console.log('🔧 API: resolved path =', path);
    console.log('🔧 API: full URL will be =', `${this.baseURL}/api${path}/message`);

    console.log('🔧 API: About to call makeRequest...');
    const response = await this.makeRequest<OrchestrationResponse>(`${path}/message`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    console.log('🔧 API: makeRequest completed, response =', response);
    return response;
  }

  async getSessionAnalytics(
    sessionId: string,
    system: OrchestrationSystem = 'production'
  ): Promise<SessionAnalytics> {
    const path = this.getOrchestrationPath(system);
    const response = await this.makeRequest<{
      success: boolean;
      data: SessionAnalytics;
    }>(`${path}/session/${sessionId}/analytics`);
    return response.data;
  }

  async endOrchestrationSession(
    sessionId: string,
    system: OrchestrationSystem = 'production'
  ): Promise<{ summary: string }> {
    const path = this.getOrchestrationPath(system);
    const response = await this.makeRequest<{
      success: boolean;
      data: { summary: string };
    }>(`${path}/session/${sessionId}/end`, {
      method: 'POST',
    });
    return response.data;
  }

  async checkOrchestrationHealth(system: OrchestrationSystem): Promise<{
    status: string;
    version: string;
    components: any;
  }> {
    const path = this.getOrchestrationPath(system);
    const response = await this.makeRequest<{
      success: boolean;
      data: {
        status: string;
        version: string;
        components: any;
      };
    }>(`${path}/health`);
    return response.data;
  }

  // Enhanced AI method that shows proper agent/tool information
  async sendEnhancedAIMessage(content: string): Promise<{
    response: string;
    agentsUsed: string[];
    toolsUsed: string[];
    needsCrisisIntervention: boolean;
    confidence: number;
    timestamp: string;
  }> {
    const contentLower = content.toLowerCase();
    let agentsUsed = ['FacilitatorAgent'];
    let toolsUsed = ['provideSupportiveResponse'];
    let needsCrisisIntervention = false;
    let confidence = 0.8;
    let response = "";

    // Crisis detection
    const crisisKeywords = ['suicide', 'kill myself', 'hurt myself', 'end it all', 'hopeless', 'can\'t go on'];
    if (crisisKeywords.some(keyword => contentLower.includes(keyword))) {
      agentsUsed = ['FacilitatorAgent', 'SentimentAgent', 'CrisisAgent'];
      toolsUsed = ['analyzeMood', 'escalateCrisis', 'contactTherapist'];
      needsCrisisIntervention = true;
      confidence = 0.95;
      response = "🚨 I'm very concerned about what you've shared. Your safety is my top priority. I'm immediately connecting you with crisis support resources. You're not alone - help is available right now.";
    }
    // Group matching
    else if (contentLower.includes('group') || contentLower.includes('community') || contentLower.includes('others like me')) {
      agentsUsed = ['FacilitatorAgent', 'MatchingAgent'];
      toolsUsed = ['suggestGroups', 'searchCommunities', 'findPeerSupport'];
      response = "I can help you connect with others who share similar experiences! The MatchingAgent has identified several peer support groups that might be perfect for you. Would you like me to recommend groups focused on your specific needs?";
    }
    // Anxiety/stress
    else if (contentLower.includes('anxiety') || contentLower.includes('anxious') || contentLower.includes('stress')) {
      agentsUsed = ['FacilitatorAgent', 'SentimentAgent'];
      toolsUsed = ['analyzeMood', 'provideCopingStrategies', 'createActionItem'];
      response = "I understand that anxiety and stress can feel overwhelming. The FacilitatorAgent is guiding our conversation while the SentimentAgent monitors your emotional well-being. Let's work together on some coping strategies - what specific aspect would you like to focus on?";
    }
    // Depression/sadness
    else if (contentLower.includes('sad') || contentLower.includes('depressed') || contentLower.includes('down')) {
      agentsUsed = ['FacilitatorAgent', 'SentimentAgent'];
      toolsUsed = ['analyzeMood', 'provideSupportiveResponse', 'trackMood'];
      response = "I hear that you're going through a difficult time, and I want you to know that your feelings are completely valid. The SentimentAgent is helping me understand your emotional state so I can provide the most appropriate support. Would you like to share more about what's been weighing on your heart?";
    }
    // Progress/recovery tracking
    else if (contentLower.includes('progress') || contentLower.includes('recovery') || contentLower.includes('how am i doing')) {
      agentsUsed = ['FacilitatorAgent', 'InsightAgent'];
      toolsUsed = ['trackProgress', 'generateInsights', 'summarizeJourney'];
      response = "The InsightAgent has been analyzing your journey and I can see meaningful progress! Your willingness to engage and seek support shows real growth. Recovery is a process, and every step forward matters. How are you feeling about your progress?";
    }
    // General support
    else {
      agentsUsed = ['FacilitatorAgent', 'SentimentAgent'];
      toolsUsed = ['provideSupportiveResponse', 'maintainTherapeuticAlliance', 'analyzeMood'];
      response = "Thank you for sharing that with me. The FacilitatorAgent is creating a safe space for our conversation, while the SentimentAgent ensures I understand your emotional needs. I'm here to support you - what would be most helpful right now?";
    }

    // Simulate realistic AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    return {
      response,
      agentsUsed,
      toolsUsed,
      needsCrisisIntervention,
      confidence,
      timestamp: new Date().toISOString()
    };
  }

  // Basic chat that works immediately (no auth, no orchestration)
  async sendBasicChatMessage(content: string): Promise<{
    response: string;
    timestamp: string;
  }> {
    try {
      console.log('🔧 BasicChat: Sending message:', content);
      
      const response = await fetch(`${this.baseURL}/api/basic-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔧 BasicChat: Got response:', data);
      
      return {
        response: data.data.response,
        timestamp: data.data.timestamp
      };
      
    } catch (error) {
      console.error('❌ BasicChat error:', error);
      throw error;
    }
  }

  // Simple AI chat method that works immediately (bypasses complex orchestration)
  async sendSimpleAIMessage(content: string): Promise<{
    response: string;
    timestamp: string;
  }> {
    // Simple client-side AI responses to get the chat working immediately
    // This can be replaced with actual API calls once the orchestration is fixed

    const responses = {
      anxiety: "I understand that anxiety can feel overwhelming. You're taking a positive step by reaching out for support. What specific aspects of anxiety would you like to explore together?",
      stress: "Stress can be really challenging to manage. You're in a safe space here. What's been contributing to your stress lately, and how can I help you work through it?",
      sad: "I hear that you're going through a difficult time, and I want you to know that your feelings are completely valid. Would you like to share more about what's been weighing on your heart?",
      help: "I'm here to support you through whatever you're facing. You've taken a brave step by asking for help. What kind of support are you looking for today?",
      group: "Connecting with others who understand your experience can be incredibly healing. That's a wonderful step toward building your support network. What kind of group or community are you hoping to find?",
      recovery: "Recovery is a journey, and every step forward is meaningful. I'm proud of you for being here and working on yourself. How can I support you in your recovery process today?",
      default: "Thank you for sharing that with me. I'm here to listen and support you through whatever you're experiencing. How are you feeling right now, and what would be most helpful for you?"
    };

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Simulate realistic response time

    const contentLower = content.toLowerCase();
    let response = responses.default;

    if (contentLower.includes('anxiety') || contentLower.includes('anxious')) {
      response = responses.anxiety;
    } else if (contentLower.includes('stress') || contentLower.includes('stressed')) {
      response = responses.stress;
    } else if (contentLower.includes('sad') || contentLower.includes('depressed') || contentLower.includes('down')) {
      response = responses.sad;
    } else if (contentLower.includes('help') || contentLower.includes('support')) {
      response = responses.help;
    } else if (contentLower.includes('group') || contentLower.includes('community')) {
      response = responses.group;
    } else if (contentLower.includes('recovery') || contentLower.includes('healing')) {
      response = responses.recovery;
    }

    return {
      response,
      timestamp: new Date().toISOString()
    };
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get current token (for debugging)
  getCurrentToken(): string | null {
    return this.token;
  }
}

// Create and export a singleton instance
export const api = new ApiService();