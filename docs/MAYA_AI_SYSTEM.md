# Maya AI System Documentation

## Overview

Maya is PeerBond's AI-powered therapeutic companion that provides personalized mental health support across different user roles. The system uses specialized AI agents and role-based interfaces to deliver appropriate levels of care and administrative functionality.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [User Interfaces](#user-interfaces)
3. [AI Agents](#ai-agents)
4. [Administrative Tools](#administrative-tools)
5. [Authentication & Security](#authentication--security)
6. [API Integration](#api-integration)
7. [Form System](#form-system)
8. [Error Handling](#error-handling)
9. [Development Guide](#development-guide)

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Maya AI System                           │
├─────────────────────────────────────────────────────────────┤
│  User Interfaces                                           │
│  ├── MayaInterface (Regular Users)                         │
│  ├── MayaTherapistInterface (Clinical Staff)               │
│  └── MayaAdminInterface (System Administrators)            │
├─────────────────────────────────────────────────────────────┤
│  AI Agent Layer                                            │
│  ├── Facilitator Agent (Primary therapeutic support)       │
│  ├── Sentiment Agent (Emotional analysis)                  │
│  ├── Insight Agent (Progress tracking)                     │
│  └── Orchestration Service (Agent coordination)            │
├─────────────────────────────────────────────────────────────┤
│  Administrative Tools                                      │
│  ├── User Onboarding System                               │
│  ├── Group Creation & Management                          │
│  ├── Session Planning Tools                               │
│  └── Crisis Assessment & Escalation                       │
├─────────────────────────────────────────────────────────────┤
│  Backend Services                                          │
│  └── REST API • WebSocket • Database • Authentication     │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Role-Based Access Control**: Different interfaces for members, therapists, and administrators
- **Multi-Agent AI System**: Specialized agents for different therapeutic functions
- **Interactive Forms**: Dynamic administrative tools with real-time validation
- **Session Management**: Persistent conversation contexts with memory
- **Crisis Detection**: Automated risk assessment and escalation protocols
- **HIPAA Compliance**: Secure handling of protected health information

## User Interfaces

### 1. MayaInterface (Regular Users)

**File**: `src/components/ai/MayaInterface.tsx`

**Purpose**: Basic therapeutic support for platform members

**Features**:
- Peer support conversations
- Emotional check-ins
- Coping strategy suggestions
- Group recommendations
- Crisis support routing

**Key Components**:
```typescript
interface MayaMessage {
  id: string;
  content: string;
  type: 'user' | 'maya' | 'system';
  timestamp: Date;
  agentUsed?: string[];
  confidence?: number;
  quickActions?: string[];
}
```

### 2. MayaTherapistInterface (Clinical Staff)

**File**: `src/components/ai/MayaTherapistInterface.tsx`

**Purpose**: Professional clinical support and administrative tools

**Features**:
- Client assessment tools
- Treatment planning assistance
- Crisis intervention guidance
- Administrative forms (onboarding, group creation, session planning)
- Clinical insights and risk evaluation

**Clinical Tools**:
- Client Assessment
- Treatment Planning
- Crisis Assessment
- Progress Analysis
- Group Dynamics Analysis
- Intervention Suggestions
- Documentation Support

### 3. MayaAdminInterface (System Administrators)

**File**: `src/components/ai/MayaAdminInterface.tsx`

**Purpose**: System management and platform oversight

**Features**:
- System analytics
- Agent performance monitoring
- Platform configuration
- User management oversight
- Security audit tools

## AI Agents

### Agent Service Architecture

**File**: `src/services/agentService.ts`

The agent service coordinates between multiple specialized AI agents:

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

### Available Agents

1. **Facilitator Agent**
   - Primary therapeutic conversations
   - General mental health support
   - Crisis initial assessment

2. **Sentiment Agent**
   - Emotional state analysis
   - Mood tracking
   - Risk level assessment

3. **Insight Agent**
   - Progress pattern analysis
   - Treatment recommendation insights
   - Long-term trend identification

4. **Matching Agent**
   - Group recommendation logic
   - Peer compatibility assessment
   - Therapeutic goal alignment

### Agent Selection Logic

```typescript
const determineAgent = (content: string, context: any) => {
  // Crisis indicators trigger immediate escalation
  if (containsCrisisKeywords(content)) {
    return 'facilitator'; // Handles crisis with escalation
  }
  
  // Administrative tasks use specialized routing
  if (isAdministrativeTask(content)) {
    return routeAdministrativeTask(content);
  }
  
  // Default to facilitator for general support
  return 'facilitator';
};
```

## Administrative Tools

### Form System Overview

Maya's administrative capabilities are powered by interactive forms that provide guided workflows for complex tasks.

### 1. User Onboarding Form

**Component**: `OnboardingForm`
**Purpose**: Streamlined new user intake process

**Features**:
- Basic information collection
- Recovery and wellness goal setting
- Experience level assessment
- Automatic group matching
- Account creation with temporary passwords

**Data Structure**:
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

### 2. Group Creation Form

**Component**: `GroupCreationForm`
**Purpose**: Therapeutic group setup and configuration

**Features**:
- Group type selection (recovery, wellness, general)
- Member limit configuration
- Privacy settings
- Tag-based searchability
- Therapeutic focus definition

**Data Structure**:
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

### 3. Session Planning Form

**Component**: `SessionPlanningForm`
**Purpose**: Therapeutic session preparation and documentation

**Features**:
- Session type selection (individual, group, crisis, assessment)
- Client/group assignment
- Objective setting with templates
- Intervention planning
- Resource and material tracking

**Data Structure**:
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

### Form Workflow Pattern

1. **Detection**: Maya recognizes administrative intent in conversation
2. **Preparation**: System gathers necessary data (users, groups, etc.)
3. **Form Trigger**: Interactive form modal appears
4. **Validation**: Client-side validation with user feedback
5. **Submission**: API call with comprehensive error handling
6. **Success Response**: Detailed feedback with next steps

## Authentication & Security

### Authentication Flow

**File**: `src/services/agentService.ts`

```typescript
const authenticateRequest = () => {
  const token = localStorage.getItem('peerbond_token');
  if (!token) {
    throw new Error('Authentication required. Please sign in to PeerBond first.');
  }
  return token;
};
```

### Role-Based Access Control

Maya interfaces automatically adapt based on user roles:

```typescript
// MayaQuickAccess.tsx - Role-based interface switching
{user.role === 'therapist' || user.role === 'admin' ? (
  <MayaTherapistInterface
    therapistId={user.id}
    className="h-full"
    mode="general"
  />
) : (
  <MayaInterface
    userId={user.id}
    className="h-full"
    compact={false}
  />
)}
```

### Security Features

- **Session Management**: Secure session handling with token validation
- **HIPAA Compliance**: Protected health information safeguards
- **Audit Logging**: Comprehensive activity tracking
- **Crisis Protocols**: Automated escalation for safety concerns

## API Integration

### Core API Service

**File**: `src/lib/api.ts`

Maya integrates with PeerBond's REST API for all data operations:

```typescript
// User Management
await api.register(userData);
await api.getAllUsers();

// Group Management  
await api.post('/therapist/groups', groupData);
await api.getAllGroups();

// Session Management
await api.post('/therapist/sessions', sessionData);
```

### Orchestration Service Integration

**File**: Maya interfaces connect to the orchestration service for AI conversations:

```typescript
const response = await api.startOrchestrationSession('production', {
  userProfile: {
    interests: ['mental-health', 'peer-support'],
    experience: 'beginner',
    goals: ['emotional-support', 'coping-strategies']
  }
});
```

### Error Handling Pattern

```typescript
try {
  const response = await api.operation();
  showSuccessMessage(response);
} catch (error) {
  console.error('Operation error:', error);
  showErrorMessage(error.message);
  // Graceful fallback behavior
}
```

## Form System

### Interactive Form Architecture

Maya's forms use a consistent pattern for complex administrative tasks:

1. **Form State Management**: React hooks for form data
2. **Validation**: Real-time client-side validation
3. **API Integration**: Seamless backend connectivity
4. **Error Handling**: User-friendly error messages
5. **Success Feedback**: Detailed completion messages

### Form Component Pattern

```typescript
function AdminForm({ 
  data, 
  onSubmit, 
  onCancel, 
  isProcessing 
}: {
  data: any;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [formData, setFormData] = useState(initialState);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm(formData)) {
      onSubmit(formData);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields with validation */}
      {/* Action buttons with loading states */}
    </form>
  );
}
```

### Form Integration with Maya Conversations

Forms are triggered based on Maya's conversational analysis:

```typescript
const handleAdministrativeTask = async (content: string) => {
  if (content.includes('onboard user')) {
    // Trigger onboarding form
    setActiveForm({
      type: 'onboarding',
      data: { availableGroups },
      onSubmit: handleOnboardingSubmit,
      onCancel: () => setActiveForm(null)
    });
  }
};
```

## Error Handling

### Comprehensive Error Management

Maya implements multi-layered error handling:

1. **Authentication Errors**: Token validation and refresh
2. **API Errors**: Network issues and server responses  
3. **Form Validation**: Field-level and form-level validation
4. **Agent Errors**: AI service failures with fallbacks

### Error Display Pattern

```typescript
const handleError = (error: Error, context: string) => {
  console.error(`${context} error:`, error);
  
  // User-friendly error message
  const userMessage = getUserFriendlyMessage(error);
  addSystemMessage(`❌ ${userMessage}`);
  
  // Toast notification
  toast.error('Operation failed. Please try again.');
  
  // Graceful degradation
  setSystemAvailable(false);
};
```

### Crisis Situation Handling

Special error handling for crisis situations:

```typescript
if (response.metadata?.needsCrisisIntervention) {
  toast.error('Crisis indicators detected. Immediate assessment required.', {
    duration: 15000,
    icon: '🚨'
  });
  // Trigger crisis protocols
}
```

## Development Guide

### Setting Up Maya Development

1. **Prerequisites**:
   - Node.js 18+ 
   - TypeScript knowledge
   - React experience
   - Understanding of mental health considerations

2. **Key Files to Understand**:
   - `src/components/ai/Maya*.tsx` - Interface components
   - `src/services/agentService.ts` - AI integration
   - `src/components/ui/MayaQuickAccess.tsx` - Access component

3. **Development Workflow**:
   ```bash
   # Start development server
   npm run dev
   
   # Access Maya via floating heart icon
   # Test different user roles (member, therapist, admin)
   # Verify form functionality and API integration
   ```

### Adding New Administrative Tools

1. **Create Form Component**:
   ```typescript
   function NewToolForm({ data, onSubmit, onCancel, isProcessing }) {
     // Form implementation following established patterns
   }
   ```

2. **Add Tool Definition**:
   ```typescript
   const NEW_TOOL = {
     id: 'new-tool',
     label: 'New Tool',
     icon: ToolIcon,
     prompt: "Help me with new administrative task...",
     category: 'administration',
     requiresClientId: false
   };
   ```

3. **Implement Handler**:
   ```typescript
   const handleNewTool = async (content: string, sessionId: string) => {
     // Tool logic and form triggering
   };
   ```

4. **Add to Interface**:
   - Update `THERAPIST_TOOLS` array
   - Add form rendering logic
   - Add submission handler

### Testing Maya Features

1. **Interface Testing**:
   - Test all user roles (member, therapist, admin)
   - Verify responsive design
   - Check accessibility features

2. **Form Testing**:
   - Test form validation
   - Verify API integration
   - Check error handling

3. **Agent Testing**:
   - Test conversation flows
   - Verify agent selection logic
   - Check crisis detection

### Best Practices

1. **Security First**:
   - Always validate user permissions
   - Sanitize all user input
   - Log security-relevant actions

2. **User Experience**:
   - Provide clear feedback for all actions
   - Use loading states for async operations
   - Make error messages actionable

3. **Clinical Considerations**:
   - Follow mental health best practices
   - Implement crisis protocols
   - Respect privacy and confidentiality

4. **Code Quality**:
   - Follow TypeScript best practices
   - Use consistent naming conventions
   - Document complex logic

## Troubleshooting

### Common Issues

1. **Authentication Failures**:
   - Verify `peerbond_token` in localStorage
   - Check token expiration
   - Ensure proper API endpoint configuration

2. **Form Submission Errors**:
   - Check API endpoint availability
   - Verify request payload format
   - Review server logs for detailed errors

3. **Agent Response Issues**:
   - Verify orchestration service connectivity
   - Check agent configuration
   - Review session initialization

### Debug Tools

1. **Browser Console**: Check for JavaScript errors
2. **Network Tab**: Monitor API requests and responses
3. **React DevTools**: Inspect component state
4. **Server Logs**: Review backend error messages

## Conclusion

Maya AI represents a comprehensive therapeutic support system that adapts to different user roles and provides sophisticated administrative capabilities. The system prioritizes user safety, clinical effectiveness, and ease of use while maintaining strict security and privacy standards.

For additional support or questions, consult the development team or refer to the broader PeerBond documentation.