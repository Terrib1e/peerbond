export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'admin' | 'therapist';
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  isPremium: boolean;
  isActive: boolean;
  createdAt: Date;
  joinedAt?: Date; // Added missing joinedAt property
  lastActive?: Date;
  profilePicture?: string;
  bio?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers?: number;
  isPrivate?: boolean;
  tags?: string[];
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: 'recovery' | 'wellness' | 'general' | 'anxiety' | 'depression'; // Keep the added types
  createdBy: string;
  facilitators: string[]; // User IDs
  members: string[]; // User IDs
  maxMembers: number;
  isPrivate: boolean;
  isActive: boolean;
  tags?: string[];
  createdAt: Date;
  lastActivity: Date;
}

// Populated version with full user objects (used by frontend components)
export interface PopulatedGroup extends Omit<Group, 'members' | 'facilitators'> {
  members: User[];
  facilitators: User[];
}

export interface Message {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'user' | 'ai_facilitator' | 'system' | 'crisis_intervention';
  reactions?: { emoji: string; users: string[]; count?: number }[];
  user?: User; // Populated user object
  metadata?: {
    agentUsed?: string[];
    confidence?: number;
    interventionType?: 'crisis' | 'support' | 'insight' | 'matching';
    sentiment?: number;
    crisisLevel?: 'mild' | 'moderate' | 'severe';
    originalMessageId?: string;
    automaticDetection?: boolean;
    [key: string]: any;
  };
}

export interface AIFacilitator {
  id: string;
  name: string;
  personality: string;
  specialization: string[];
  responseStyle: 'supportive' | 'challenging' | 'neutral';
}

export interface ActionItem {
  id: string;
  groupId: string;
  assignedTo: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: Date;
}

export interface Insight {
  id: string;
  groupId: string;
  title: string;
  description: string;
  category: 'progress' | 'concern' | 'milestone' | 'recommendation';
  generatedAt: Date;
  relevantMembers: string[];
}

export interface TherapistDashboard {
  id: string;
  therapistId: string;
  connectedGroups: string[];
  patients: User[];
  aggregateMetrics: {
    totalSessions: number;
    averageEngagement: number;
    progressTrend: 'improving' | 'stable' | 'declining';
  };
}

export interface Subscription {
  id: string;
  userId: string;
  type: 'free' | 'premium' | 'professional';
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  priceId: string;
}