# Maya AI Quick Reference

## 🚀 Quick Start

### Basic Integration
```typescript
import { MayaQuickAccess } from '@/components/ui/MayaQuickAccess';

<MayaQuickAccess user={currentUser} position="bottom-right" />
```

### Authentication Check
```typescript
const token = localStorage.getItem('peerbond_token');
if (!token) throw new Error('Authentication required');
```

### Agent Call
```typescript
const response = await agentService.callAgent('facilitator', message, sessionId);
```

## 🎯 Key Components

| Component | Purpose | Props |
|-----------|---------|-------|
| `MayaQuickAccess` | Floating access button | `user`, `position`, `theme` |
| `MayaInterface` | User interface | `userId`, `className`, `compact` |
| `MayaTherapistInterface` | Clinical interface | `therapistId`, `clientId`, `mode` |
| `MayaHub` | Route to appropriate interface | `user`, `context`, `defaultMode` |

## 🔧 Administrative Tools

| Tool | Trigger Phrase | Form Component |
|------|----------------|----------------|
| User Onboarding | "onboard user" | `OnboardingForm` |
| Group Creation | "create group" | `GroupCreationForm` |
| Session Planning | "plan session" | `SessionPlanningForm` |

## 🤖 AI Agents

| Agent | Purpose | Use Case |
|-------|---------|----------|
| `facilitator` | Primary therapeutic support | General conversations |
| `sentiment` | Emotional analysis | Mood tracking, risk assessment |
| `insight` | Progress analysis | Long-term pattern recognition |
| `matching` | Group recommendations | User-group matching |

## 🔌 API Endpoints

### User Management
```typescript
// Create user
POST /api/auth/register

// Get users  
GET /api/admin/users

// Update user
PUT /api/admin/users/:id
```

### Group Management
```typescript
// Create group
POST /api/therapist/groups

// Get groups
GET /api/groups

// Add member
POST /api/therapist/groups/:id/members
```

### Session Management
```typescript
// Plan session
POST /api/therapist/sessions

// Get sessions
GET /api/therapist/sessions

// Update session
PUT /api/therapist/sessions/:id
```

## 🛡️ Security Patterns

### Role-Based Access
```typescript
const hasPermission = (userRole: string, action: string) => {
  const permissions = {
    member: ['read:own', 'create:messages'],
    therapist: ['read:clients', 'create:assessments', 'manage:groups'],
    admin: ['*']
  };
  return permissions[userRole]?.includes(action) || permissions[userRole]?.includes('*');
};
```

### Error Handling
```typescript
try {
  const result = await api.operation();
  handleSuccess(result);
} catch (error) {
  if (error.statusCode === 401) {
    redirectToLogin();
  } else {
    showUserFriendlyError(error);
  }
}
```

## 📝 Form Patterns

### Form Structure
```typescript
interface FormProps {
  data?: any;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const MyForm: React.FC<FormProps> = ({ data, onSubmit, onCancel, isProcessing }) => {
  const [formData, setFormData] = useState(initialState);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm(formData)) {
      onSubmit(formData);
    }
  };
  
  return <form onSubmit={handleSubmit}>/* form fields */</form>;
};
```

### Form Validation
```typescript
const validateForm = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.requiredField) {
    errors.requiredField = 'This field is required';
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

## 🎨 Styling Guide

### Theme Colors
```typescript
const THEMES = {
  purple: 'bg-gradient-to-r from-purple-500 to-pink-500',
  blue: 'bg-gradient-to-r from-blue-500 to-purple-500',
  green: 'bg-gradient-to-r from-green-500 to-blue-500'
};
```

### Risk Level Colors
```typescript
const RISK_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};
```

## 🔍 Debugging

### Common Issues
- **Auth Error**: Check `peerbond_token` in localStorage
- **Form Error**: Check browser console for validation messages
- **Agent Error**: Verify orchestration service connectivity
- **API Error**: Check network tab for failed requests

### Debug Tools
```typescript
// Log user context
console.log('User context:', { user, role, permissions });

// Log API calls
console.log('API call:', { endpoint, method, data, response });

// Log form state
console.log('Form state:', { formData, errors, isValid });
```

## 📊 Performance Tips

### Optimization Patterns
```typescript
// Lazy load components
const MayaInterface = lazy(() => import('./MayaInterface'));

// Memoize expensive calculations
const expensiveValue = useMemo(() => calculateValue(data), [data]);

// Debounce API calls
const debouncedAPICall = useCallback(
  debounce((query) => api.search(query), 300),
  []
);
```

### Caching
```typescript
// Cache API responses
const cachedCall = await cachedApiCall(
  'cache-key',
  () => api.getData(),
  5 * 60 * 1000 // 5 minutes
);
```

## 🚨 Crisis Handling

### Detection Patterns
```typescript
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'hopeless', 
  'can\'t go on', 'no point', 'harm myself'
];

const detectCrisis = (message: string) => {
  const lowerMessage = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
};
```

### Escalation
```typescript
if (riskLevel === 'critical') {
  await api.post('/crisis/escalate', { userId, context });
  toast.error('🚨 Crisis Alert: Immediate attention required', {
    duration: 30000,
    position: 'top-center'
  });
}
```

## 📱 Mobile Considerations

### Responsive Design
```typescript
const isMobile = useMediaQuery('(max-width: 768px)');

return (
  <div className={cn(
    'maya-interface',
    isMobile ? 'h-screen' : 'h-96'
  )}>
    {/* interface content */}
  </div>
);
```

### Touch Optimization
```css
.touch-target {
  min-height: 44px; /* iOS minimum touch target */
  min-width: 44px;
}
```

## 🧪 Testing

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MayaInterface } from './MayaInterface';

test('renders Maya interface', () => {
  render(<MayaInterface userId="123" />);
  expect(screen.getByText('Maya AI')).toBeInTheDocument();
});

test('handles form submission', async () => {
  const mockSubmit = jest.fn();
  render(<OnboardingForm onSubmit={mockSubmit} />);
  
  fireEvent.click(screen.getByText('Submit'));
  await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
});
```

### API Testing
```typescript
// Mock API responses
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true, data: mockData })
});

// Test API calls
const result = await api.getData();
expect(result).toEqual(expectedData);
```

## 📋 Checklists

### Component Development
- [ ] Define TypeScript interfaces
- [ ] Add error boundaries
- [ ] Include loading states
- [ ] Add accessibility labels
- [ ] Test responsive design
- [ ] Validate user permissions

### Form Development
- [ ] Client-side validation
- [ ] Server-side validation
- [ ] Loading/disabled states
- [ ] Error message display
- [ ] Success feedback
- [ ] API integration

### Security Review
- [ ] Input sanitization
- [ ] Permission checks
- [ ] Audit logging
- [ ] HIPAA compliance
- [ ] Error handling
- [ ] Session management

This quick reference provides essential patterns and examples for working with the Maya AI system efficiently.