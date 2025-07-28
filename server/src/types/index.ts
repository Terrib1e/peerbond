import { Request } from 'express';

// Extend Express Request to include user from auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        scopes?: string[];
        preferredLanguage?: string;
        age?: number;
        emergencyContact?: string;
      };
    }
  }
}

export interface UserStats {
  totalMessages: number;
  groupsJoined: number;
  streakDays: number;
  lastActiveDate: Date;
  engagementScore: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'user' | 'admin' | 'therapist';
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  isPremium: boolean;
  isActive: boolean;
  createdAt: Date;
  lastActive?: Date;
  profilePicture?: string;
  bio?: string;
  preferences?: UserPreferences;
  stats?: UserStats;
  // Additional properties expected by the code
  scopes?: string[];
  preferredLanguage?: string;
  age?: number;
  emergencyContact?: string;
  currentChallenges?: string[];
}

export interface MeetingSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: string;
  dayOfMonth?: number;
  time: string;
  timezone?: string;
}

export interface GroupSettings {
  allowGuestMessages: boolean;
  requireApproval: boolean;
  enableAI: boolean;
  allowReactions: boolean;
  maxMessageLength: number;
  cooldownPeriod: number;
}

export interface GroupStats {
  totalMessages: number;
  activeMembers: number;
  averageEngagement: number;
  retentionRate: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'recovery' | 'wellness' | 'general';
  createdBy: string;
  facilitators: string[];
  members: string[];
  maxMembers: number;
  isPrivate: boolean;
  isActive: boolean;
  tags?: string[];
  createdAt: Date;
  lastActivity: Date;
  meetingSchedule?: MeetingSchedule;
  settings?: GroupSettings;
  stats?: GroupStats;
  // Additional properties expected by the code
  focus?: string[];
  language?: string;
  _count?: {
    members: number;
  };
}

export interface Message {
  id: string;
  groupId: string;
  userId: string;
  authorId: string; // Add authorId for compatibility
  content: string;
  type: 'user' | 'text' | 'system' | 'ai' | 'ai_facilitator';
  createdAt: Date;
  timestamp: Date;
  editedAt?: Date;
  isEdited: boolean;
  reactions: Record<string, string[]>;
  metadata?: Record<string, any>;
  parentId?: string;
  threadId?: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface ActionItem {
  id: string;
  groupId: string;
  userId?: string;
  title: string; // Keep this property as code expects it
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  completedAt?: Date;
  createdBy: string;
  assignedTo: string; // Add assignedTo to match Prisma schema
  createdAt: Date;
  updatedAt: Date;
  category?: string; // Add category property expected by code
}

export interface Insight {
  id: string;
  groupId: string;
  title: string;
  description: string;
  category: 'progress' | 'concern' | 'milestone' | 'recommendation';
  relevantUserIds: string[];
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export interface AIFacilitatorConfig {
  id: string;
  groupId: string;
  personality: 'supportive' | 'challenging' | 'neutral';
  interventionFrequency: 'low' | 'medium' | 'high';
  customInstructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    groupMessages: boolean;
    directMessages: boolean;
    actionItems: boolean;
    insights: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'groups' | 'private';
    showOnlineStatus: boolean;
    allowDirectMessages: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Analytics {
  id: string;
  groupId?: string;
  userId?: string;
  eventType: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

// Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'member' | 'therapist' | 'admin';
  recoveryGoals?: string[];
  wellnessGoals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  type: 'recovery' | 'anxiety' | 'depression' | 'general';
  maxMembers?: number;
  isPrivate?: boolean;
}

export interface SendMessageRequest {
  groupId: string;
  content: string;
  type?: 'user' | 'system';
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  recoveryGoals?: string[];
  wellnessGoals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface CreateActionItemRequest {
  groupId: string;
  userId?: string;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

export interface UpdateActionItemRequest {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

// Response types
export interface AuthResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// WebSocket types
export interface WebSocketMessage {
  type: 'message' | 'user_joined' | 'user_left' | 'typing' | 'reaction' | 'action_item' | 'insight';
  data: any;
  timestamp: Date;
  userId?: string;
  groupId?: string;
}

// AI types
export interface AIToolCall {
  tool: string;
  parameters: Record<string, any>;
}

export interface AIResponse {
  content: string;
  toolCalls?: AIToolCall[];
  confidence: number;
  reasoning?: string;
}

export interface ConversationContext {
  groupId: string;
  messages: Message[];
  participants: User[];
  groupType: string;
  sessionDuration: number;
  lastFacilitatorMessage?: Date;
}