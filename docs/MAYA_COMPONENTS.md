# Maya AI Components Documentation

## Overview

This document provides detailed technical documentation for all Maya AI components, their interfaces, props, and usage patterns.

## Table of Contents

1. [Core Components](#core-components)
2. [Interface Components](#interface-components)
3. [Form Components](#form-components)
4. [Service Components](#service-components)
5. [Utility Components](#utility-components)
6. [Type Definitions](#type-definitions)

## Core Components

### MayaQuickAccess

**File**: `src/components/ui/MayaQuickAccess.tsx`

**Purpose**: Floating action button and modal for quick Maya access across the application.

**Props**:
```typescript
interface MayaQuickAccessProps {
  user: {
    id: string;
    firstName: string;
    role: 'member' | 'therapist' | 'admin';
  };
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
  theme?: 'purple' | 'blue' | 'green';
}
```

**Features**:
- Role-based interface switching
- Floating action button with customizable positioning
- Modal with expandable view
- New chat functionality
- Notification system
- Theme customization

**Usage**:
```typescript
<MayaQuickAccess 
  user={currentUser}
  position="bottom-right"
  theme="purple"
  showLabel={false}
/>
```

**Key Methods**:
- `handleToggleModal()`: Opens/closes Maya modal
- `handleNewChat()`: Forces interface remount for fresh session
- `handleToggleExpanded()`: Toggles full-screen mode

### MayaHub

**File**: `src/components/ai/MayaHub.tsx`

**Purpose**: Central routing component that selects appropriate Maya interface based on user role and context.

**Props**:
```typescript
interface MayaHubProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'member' | 'facilitator' | 'therapist' | 'admin';
  };
  context?: {
    groupId?: string;
    sessionId?: string;
    clientId?: string;
  };
  defaultMode?: 'compact' | 'full' | 'modal';
  className?: string;
}
```

**Routing Logic**:
```typescript
const getInterfaceComponent = () => {
  if (user.role === 'admin') {
    return <MayaAdminInterface {...props} />;
  }
  
  if (user.role === 'therapist') {
    return <MayaTherapistInterface {...props} />;
  }
  
  return <MayaInterface {...props} />;
};
```

## Interface Components

### MayaInterface (User Interface)

**File**: `src/components/ai/MayaInterface.tsx`

**Purpose**: Basic Maya interface for regular platform members.

**Props**:
```typescript
interface MayaInterfaceProps {
  userId: string;
  className?: string;
  compact?: boolean;
}
```

**Key Features**:
- Basic therapeutic conversations
- Quick action suggestions
- Agent visibility indicators
- Session memory management
- Crisis support routing

**Message Interface**:
```typescript
interface MayaMessage {
  id: string;
  content: string;
  type: 'user' | 'maya' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  quickActions?: string[];
}
```

**Available Tools**:
- Mood check-in
- Coping strategies
- Group recommendations
- Crisis support
- Peer connections

### MayaTherapistInterface (Clinical Interface)

**File**: `src/components/ai/MayaTherapistInterface.tsx`

**Purpose**: Professional clinical interface with administrative capabilities.

**Props**:
```typescript
interface MayaTherapistInterfaceProps {
  therapistId: string;
  clientId?: string;
  sessionId?: string;
  className?: string;
  mode?: 'consultation' | 'client-focused' | 'general';
}
```

**Clinical Tools**:
```typescript
const THERAPIST_TOOLS = [
  {
    id: 'client-assessment',
    label: 'Assess Client State',
    icon: ClipboardList,
    category: 'assessment',
    requiresClientId: true
  },
  {
    id: 'treatment-planning',
    label: 'Treatment Planning',
    icon: Target,
    category: 'planning',
    requiresClientId: true
  },
  // ... more tools
];
```

**Clinical Insight Interface**:
```typescript
interface ClinicalInsight {
  type: 'assessment' | 'progress' | 'risk' | 'intervention' | 'trend';
  summary: string;
  confidence: number;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence?: string[];
}
```

**Administrative Forms**:
- User onboarding
- Group creation
- Session planning
- User management
- Crisis assessment

### MayaAdminInterface (System Management)

**File**: `src/components/ai/MayaAdminInterface.tsx`

**Purpose**: System administration and platform oversight interface.

**Props**:
```typescript
interface MayaAdminInterfaceProps {
  adminId: string;
  className?: string;
  mode?: 'monitoring' | 'management' | 'analytics';
}
```

**Admin Tools**:
- System analytics
- Agent performance monitoring
- User management oversight
- Platform configuration
- Security auditing

## Form Components

### OnboardingForm

**Purpose**: New user intake and platform onboarding.

**Props**:
```typescript
interface OnboardingFormProps {
  data: {
    availableGroups: Group[];
  };
  onSubmit: (data: OnboardingFormData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}
```

**Form Data**:
```typescript
interface OnboardingFormData {
  firstName: string;
  lastName: string;
  email: string;
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredGroups: string[];
}
```

**Features**:
- Real-time validation
- Goal selection with predefined options
- Group matching recommendations
- Experience level assessment
- Account creation integration

### GroupCreationForm

**Purpose**: Therapeutic group setup and configuration.

**Props**:
```typescript
interface GroupCreationFormProps {
  onSubmit: (data: GroupFormData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}
```

**Form Data**:
```typescript
interface GroupFormData {
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers: number;
  isPrivate: boolean;
  tags: string[];
}
```

**Features**:
- Group type selection
- Member limit configuration
- Privacy settings
- Dynamic tag management
- Validation with therapeutic guidelines

### SessionPlanningForm

**Purpose**: Therapeutic session preparation and documentation.

**Props**:
```typescript
interface SessionPlanningFormProps {
  data: {
    availableClients: User[];
    availableGroups: Group[];
  };
  onSubmit: (data: SessionPlanningFormData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}
```

**Form Data**:
```typescript
interface SessionPlanningFormData {
  sessionType: 'individual' | 'group' | 'crisis' | 'assessment';
  clientId?: string;
  groupId?: string;
  date: string;
  duration: number;
  objectives: string[];
  interventions: string[];
  materials: string[];
  notes: string;
}
```

**Features**:
- Session type selection
- Client/group assignment
- Objective builder with templates
- Intervention planning
- Resource tracking
- Evidence-based suggestions

## Service Components

### AgentService

**File**: `src/services/agentService.ts`

**Purpose**: AI agent communication and orchestration.

**Key Methods**:
```typescript
class AgentService {
  async callAgent(
    agentType: string, 
    content: string, 
    sessionId: string
  ): Promise<AgentCallResponse>
  
  async startOrchestrationSession(
    environment: string,
    userProfile: UserProfile
  ): Promise<SessionResponse>
  
  private authenticateRequest(): string
}
```

**Response Interface**:
```typescript
interface AgentCallResponse {
  recommendation: string;
  result: {
    success: boolean;
    response: string;
    agentUsed: string[];
    toolsUsed?: string[];
    confidence: number;
    metadata?: Record<string, any>;
  };
}
```

**Authentication**:
```typescript
private authenticateRequest(): string {
  const token = localStorage.getItem('peerbond_token');
  if (!token) {
    throw new Error('Authentication required. Please sign in to PeerBond first.');
  }
  return token;
}
```

### API Integration Service

**File**: `src/lib/api.ts`

**Maya-Specific Methods**:
```typescript
// User Management
register(userData: RegisterData): Promise<UserResponse>
getAllUsers(): Promise<User[]>

// Group Management
post(endpoint: string, data: any): Promise<APIResponse>
getAllGroups(): Promise<Group[]>

// Session Management
startOrchestrationSession(env: string, profile: UserProfile): Promise<SessionResponse>
```

## Utility Components

### Message Rendering

**ReactMarkdown Configuration**:
```typescript
const markdownComponents = {
  p: ({ children }) => <div className="mb-2">{children}</div>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-3 italic">{children}</blockquote>
};
```

### Agent Visibility Indicators

**Component**: `AIAgentIndicator`
```typescript
interface AgentIndicatorProps {
  agents: string[];
  confidence?: number;
  className?: string;
}

const AIAgentIndicator: React.FC<AgentIndicatorProps> = ({ 
  agents, 
  confidence, 
  className 
}) => (
  <div className={cn("flex items-center gap-2", className)}>
    {agents.map(agent => (
      <span key={agent} className="agent-badge">
        {agent}
      </span>
    ))}
    {confidence && (
      <span className="confidence-indicator">
        {Math.round(confidence * 100)}%
      </span>
    )}
  </div>
);
```

### Form Validation Utilities

**Pattern**: Consistent validation across all forms
```typescript
const validateForm = (formData: any, rules: ValidationRules) => {
  const errors: Record<string, string> = {};
  
  // Required field validation
  Object.keys(rules.required || {}).forEach(field => {
    if (!formData[field] || formData[field].trim() === '') {
      errors[field] = `${field} is required`;
    }
  });
  
  // Email validation
  if (formData.email && !isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Custom validations
  if (rules.custom) {
    Object.entries(rules.custom).forEach(([field, validator]) => {
      const error = validator(formData[field], formData);
      if (error) errors[field] = error;
    });
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

## Type Definitions

### Core Types

```typescript
// User Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'member' | 'facilitator' | 'therapist' | 'admin';
  recoveryGoals?: string[];
  wellnessGoals?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
}

// Group Types
interface Group {
  id: string;
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers: number;
  isPrivate: boolean;
  tags: string[];
  memberCount?: number;
  createdBy: string;
  createdAt: Date;
}

// Session Types
interface Session {
  id: string;
  type: 'individual' | 'group' | 'crisis' | 'assessment';
  clientId?: string;
  groupId?: string;
  therapistId: string;
  date: string;
  duration: number;
  objectives: string[];
  interventions: string[];
  materials: string[];
  notes: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
}

// Message Types
interface TherapistMessage {
  id: string;
  content: string;
  type: 'therapist' | 'maya' | 'system' | 'client-data';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  isLoading?: boolean;
  clinicalInsights?: ClinicalInsight[];
  clientId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

// API Response Types
interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Form State Types
type FormStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

interface FormState<T> {
  data: T;
  status: FormStatus;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}
```

### Clinical Types

```typescript
interface ClinicalInsight {
  type: 'assessment' | 'progress' | 'risk' | 'intervention' | 'trend';
  summary: string;
  confidence: number;
  recommendations: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  evidence?: string[];
}

interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendations: string[];
  requiresImmediate: boolean;
  escalationNeeded: boolean;
}

interface TreatmentPlan {
  clientId: string;
  goals: string[];
  interventions: string[];
  timeline: string;
  reviewDate: Date;
  assignedTherapist: string;
  status: 'active' | 'completed' | 'on-hold';
}
```

### Agent Types

```typescript
interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  specializations: string[];
  confidenceThreshold: number;
}

interface AgentResponse {
  agentId: string;
  response: string;
  confidence: number;
  toolsUsed: string[];
  metadata: Record<string, any>;
  timestamp: Date;
}

interface OrchestrationContext {
  sessionId: string;
  userId: string;
  userRole: string;
  conversationHistory: Message[];
  currentAgent?: string;
  escalationLevel: number;
}
```

## Component Usage Examples

### Basic Maya Integration

```typescript
import { MayaQuickAccess } from '@/components/ui/MayaQuickAccess';
import { useAuthStore } from '@/store/authStore';

function App() {
  const { user } = useAuthStore();
  
  return (
    <div className="app">
      {/* Main app content */}
      
      {/* Maya quick access - appears on all authenticated pages */}
      {user && (
        <MayaQuickAccess 
          user={user}
          position="bottom-right"
          theme={user.role === 'therapist' ? 'blue' : 'purple'}
        />
      )}
    </div>
  );
}
```

### Dedicated Maya Page

```typescript
import { MayaHub } from '@/components/ai/MayaHub';
import { useAuthStore } from '@/store/authStore';
import { useSearchParams } from 'react-router-dom';

function MayaPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  
  const context = {
    groupId: searchParams.get('groupId'),
    sessionId: searchParams.get('sessionId'),
    clientId: searchParams.get('clientId')
  };
  
  return (
    <div className="maya-page">
      <MayaHub
        user={user}
        context={context}
        defaultMode="full"
        className="h-full"
      />
    </div>
  );
}
```

### Custom Maya Integration

```typescript
import { MayaTherapistInterface } from '@/components/ai/MayaTherapistInterface';

function TherapistDashboard() {
  const [selectedClient, setSelectedClient] = useState(null);
  
  return (
    <div className="dashboard">
      <div className="sidebar">
        {/* Client list */}
      </div>
      
      <div className="main-content">
        {selectedClient && (
          <MayaTherapistInterface
            therapistId={currentUser.id}
            clientId={selectedClient.id}
            mode="client-focused"
            className="h-96"
          />
        )}
      </div>
    </div>
  );
}
```

## Best Practices

### Component Development

1. **Props Validation**: Always define TypeScript interfaces for props
2. **Error Boundaries**: Wrap Maya components in error boundaries
3. **Loading States**: Provide loading indicators for async operations
4. **Accessibility**: Include proper ARIA labels and keyboard navigation
5. **Responsive Design**: Ensure components work on all screen sizes

### State Management

1. **Local State**: Use useState for component-specific state
2. **Form State**: Use controlled components with validation
3. **Session State**: Persist conversation context appropriately
4. **Error State**: Handle and display errors gracefully

### Security Considerations

1. **Input Sanitization**: Sanitize all user inputs
2. **Authentication**: Verify user permissions before rendering
3. **Session Management**: Handle token expiration gracefully
4. **Crisis Protocols**: Implement appropriate escalation procedures

### Performance Optimization

1. **Code Splitting**: Lazy load Maya components
2. **Memoization**: Use React.memo for expensive components
3. **Virtualization**: Use virtual scrolling for long message lists
4. **Debouncing**: Debounce API calls and form submissions

This documentation provides comprehensive technical details for all Maya AI components and their integration patterns. For implementation examples and troubleshooting, refer to the main Maya AI System documentation.