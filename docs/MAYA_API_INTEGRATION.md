# Maya AI API Integration Documentation

## Overview

This document details Maya AI's integration with PeerBond's backend API systems, including authentication, data flows, error handling, and real-time communication patterns.

## Table of Contents

1. [API Architecture](#api-architecture)
2. [Authentication System](#authentication-system)
3. [Agent Service Integration](#agent-service-integration)
4. [Administrative API Endpoints](#administrative-api-endpoints)
5. [Real-time Communication](#real-time-communication)
6. [Error Handling & Recovery](#error-handling--recovery)
7. [Data Validation & Security](#data-validation--security)
8. [Performance Optimization](#performance-optimization)
9. [Testing & Monitoring](#testing--monitoring)

## API Architecture

### Core API Structure

Maya integrates with PeerBond's RESTful API architecture through multiple service layers:

```
┌─────────────────────────────────────────────────────────┐
│                  Maya Frontend                          │
├─────────────────────────────────────────────────────────┤
│  Service Layer                                          │
│  ├── agentService.ts (AI Orchestration)                │
│  ├── api.ts (Core API Client)                          │
│  └── hipaaService.ts (Compliance Layer)                │
├─────────────────────────────────────────────────────────┤
│  Backend API                                            │
│  ├── /api/orchestration (AI Agent Routing)             │
│  ├── /api/therapist (Clinical Tools)                   │
│  ├── /api/admin (System Management)                    │
│  └── /api/auth (Authentication)                        │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  └── PostgreSQL + Prisma ORM                           │
└─────────────────────────────────────────────────────────┘
```

### Base API Configuration

**File**: `src/lib/api.ts`

```typescript
class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('peerbond_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...this.getAuthHeaders(),
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new APIError(
          `API request failed: ${response.status}`,
          response.status,
          await response.text()
        );
      }

      return await response.json();
    } catch (error) {
      this.handleAPIError(error, endpoint);
      throw error;
    }
  }

  // HTTP method implementations
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new APIClient();
```

## Authentication System

### Token-Based Authentication

Maya uses JWT tokens stored in localStorage for authentication:

```typescript
// Authentication flow
const authenticateRequest = (): string => {
  const token = localStorage.getItem('peerbond_token');
  if (!token) {
    throw new Error('Authentication required. Please sign in to PeerBond first.');
  }
  return token;
};

// Token validation
const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await api.get('/api/auth/validate');
    return response.valid;
  } catch (error) {
    return false;
  }
};

// Automatic token refresh
const refreshTokenIfNeeded = async (): Promise<string> => {
  const token = localStorage.getItem('peerbond_token');
  const refreshToken = localStorage.getItem('peerbond_refresh_token');
  
  if (!token || isTokenExpired(token)) {
    if (refreshToken) {
      const newToken = await api.post('/api/auth/refresh', { 
        refreshToken 
      });
      localStorage.setItem('peerbond_token', newToken.accessToken);
      return newToken.accessToken;
    }
    throw new Error('Session expired. Please sign in again.');
  }
  
  return token;
};
```

### Role-Based Access Control

```typescript
interface UserRole {
  role: 'member' | 'facilitator' | 'therapist' | 'admin';
  permissions: string[];
  restrictions: string[];
}

const checkPermission = (
  userRole: string, 
  requiredPermission: string
): boolean => {
  const rolePermissions = {
    member: ['read:own-profile', 'read:public-groups', 'create:messages'],
    facilitator: ['read:group-members', 'moderate:groups', 'create:sessions'],
    therapist: [
      'read:client-data', 
      'create:assessments', 
      'manage:groups',
      'create:users',
      'plan:sessions'
    ],
    admin: ['*'] // Full access
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes('*') || permissions.includes(requiredPermission);
};
```

## Agent Service Integration

### Agent Communication Service

**File**: `src/services/agentService.ts`

Maya communicates with AI agents through a dedicated service layer:

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

class AgentService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  async callAgent(
    agentType: string,
    content: string,
    sessionId: string
  ): Promise<AgentCallResponse> {
    const token = this.authenticateRequest();

    try {
      const response = await fetch(`${this.baseURL}/api/orchestration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          environment: 'production',
          userMessage: content,
          sessionId: sessionId,
          preferredAgent: agentType,
          context: {
            platform: 'maya-interface',
            userRole: this.getCurrentUserRole(),
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent call failed: ${response.status}`);
      }

      const data = await response.json();
      return this.processAgentResponse(data);

    } catch (error) {
      console.error('Agent service error:', error);
      throw new Error('Unable to communicate with AI agents. Please try again.');
    }
  }

  async startOrchestrationSession(
    environment: string,
    userProfile: any
  ): Promise<any> {
    const token = this.authenticateRequest();

    const response = await fetch(`${this.baseURL}/api/orchestration/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        environment,
        userProfile,
        platform: 'maya-interface'
      }),
    });

    if (!response.ok) {
      throw new Error(`Session initialization failed: ${response.status}`);
    }

    return response.json();
  }

  private processAgentResponse(data: any): AgentCallResponse {
    return {
      recommendation: data.recommendedAgent || 'facilitator',
      result: {
        success: true,
        response: data.response || data.message,
        agentUsed: Array.isArray(data.agentUsed) ? data.agentUsed : [data.agentUsed || 'facilitator'],
        toolsUsed: data.toolsUsed || [],
        confidence: data.confidence || 0.95,
        metadata: data.metadata || {}
      }
    };
  }
}

export const agentService = new AgentService();
```

### Session Management

```typescript
interface SessionContext {
  sessionId: string;
  userId: string;
  userRole: string;
  conversationHistory: Message[];
  metadata: Record<string, any>;
}

class SessionManager {
  private activeSessions: Map<string, SessionContext> = new Map();

  async createSession(userId: string, userProfile: any): Promise<string> {
    const sessionResponse = await agentService.startOrchestrationSession(
      'production',
      userProfile
    );

    const sessionId = sessionResponse.sessionId;
    const context: SessionContext = {
      sessionId,
      userId,
      userRole: userProfile.role,
      conversationHistory: [],
      metadata: {
        createdAt: new Date().toISOString(),
        platform: 'maya-interface'
      }
    };

    this.activeSessions.set(sessionId, context);
    return sessionId;
  }

  async addMessage(
    sessionId: string, 
    message: Message
  ): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (context) {
      context.conversationHistory.push(message);
      context.metadata.lastActivity = new Date().toISOString();
    }
  }

  getSessionContext(sessionId: string): SessionContext | undefined {
    return this.activeSessions.get(sessionId);
  }
}
```

## Administrative API Endpoints

### User Management Endpoints

```typescript
// User onboarding
interface OnboardingRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  recoveryGoals: string[];
  wellnessGoals: string[];
  experienceLevel: string;
}

const onboardUser = async (userData: OnboardingRequest) => {
  return await api.post('/api/auth/register', userData);
};

// User retrieval
const getAllUsers = async (): Promise<User[]> => {
  return await api.get('/api/admin/users');
};

const getUserById = async (userId: string): Promise<User> => {
  return await api.get(`/api/admin/users/${userId}`);
};

// User updates
const updateUser = async (userId: string, updates: Partial<User>) => {
  return await api.put(`/api/admin/users/${userId}`, updates);
};
```

### Group Management Endpoints

```typescript
// Group creation
interface GroupCreationRequest {
  name: string;
  description: string;
  type: 'recovery' | 'wellness' | 'general';
  maxMembers: number;
  isPrivate: boolean;
  tags: string[];
}

const createGroup = async (groupData: GroupCreationRequest) => {
  return await api.post('/api/therapist/groups', groupData);
};

// Group retrieval
const getAllGroups = async (): Promise<Group[]> => {
  return await api.get('/api/groups');
};

const getGroupById = async (groupId: string): Promise<Group> => {
  return await api.get(`/api/groups/${groupId}`);
};

// Group member management
const addGroupMember = async (groupId: string, userId: string, role: string) => {
  return await api.post(`/api/therapist/groups/${groupId}/members`, {
    userId,
    role
  });
};

const removeGroupMember = async (groupId: string, userId: string) => {
  return await api.delete(`/api/therapist/groups/${groupId}/members/${userId}`);
};
```

### Session Management Endpoints

```typescript
// Session planning
interface SessionPlanningRequest {
  sessionType: string;
  clientId?: string;
  groupId?: string;
  date: string;
  duration: number;
  objectives: string[];
  interventions: string[];
  materials: string[];
  notes: string;
}

const planSession = async (sessionData: SessionPlanningRequest) => {
  return await api.post('/api/therapist/sessions', sessionData);
};

// Session retrieval
const getTherapistSessions = async (therapistId: string) => {
  return await api.get(`/api/therapist/sessions?therapistId=${therapistId}`);
};

const getSessionById = async (sessionId: string) => {
  return await api.get(`/api/therapist/sessions/${sessionId}`);
};

// Session updates
const updateSession = async (sessionId: string, updates: any) => {
  return await api.put(`/api/therapist/sessions/${sessionId}`, updates);
};
```

## Real-time Communication

### WebSocket Integration

Maya supports real-time communication for live updates and notifications:

```typescript
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string): void {
    const token = localStorage.getItem('peerbond_token');
    const wsURL = `${import.meta.env.VITE_WS_URL}?token=${token}&userId=${userId}`;

    this.ws = new WebSocket(wsURL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(userId);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'AGENT_RESPONSE':
        this.notifyAgentResponse(data.payload);
        break;
      case 'CRISIS_ALERT':
        this.handleCrisisAlert(data.payload);
        break;
      case 'SESSION_UPDATE':
        this.handleSessionUpdate(data.payload);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private attemptReconnect(userId: string): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect(userId);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const webSocketService = new WebSocketService();
```

### Real-time Notifications

```typescript
interface NotificationPayload {
  type: 'info' | 'warning' | 'error' | 'crisis';
  message: string;
  data?: any;
  timestamp: string;
}

class NotificationService {
  private listeners: Map<string, Function[]> = new Map();

  subscribe(eventType: string, callback: Function): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  unsubscribe(eventType: string, callback: Function): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notify(eventType: string, payload: NotificationPayload): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(payload));
    }
  }

  // Crisis-specific notifications
  notifyCrisisAlert(payload: any): void {
    this.notify('CRISIS_ALERT', {
      type: 'crisis',
      message: 'Crisis intervention required',
      data: payload,
      timestamp: new Date().toISOString()
    });

    // Show persistent crisis notification
    toast.error('🚨 Crisis Alert: Immediate attention required', {
      duration: 30000,
      position: 'top-center'
    });
  }
}

export const notificationService = new NotificationService();
```

## Error Handling & Recovery

### Comprehensive Error Management

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class ErrorHandler {
  static handle(error: any, context: string): void {
    console.error(`Error in ${context}:`, error);

    if (error instanceof APIError) {
      switch (error.statusCode) {
        case 401:
          this.handleAuthenticationError();
          break;
        case 403:
          this.handleAuthorizationError();
          break;
        case 429:
          this.handleRateLimitError();
          break;
        case 500:
          this.handleServerError();
          break;
        default:
          this.handleGenericError(error);
      }
    } else if (error.name === 'NetworkError') {
      this.handleNetworkError();
    } else {
      this.handleUnknownError(error);
    }
  }

  private static handleAuthenticationError(): void {
    // Clear invalid tokens
    localStorage.removeItem('peerbond_token');
    localStorage.removeItem('peerbond_refresh_token');

    // Redirect to login
    toast.error('Session expired. Please sign in again.');
    window.location.href = '/login';
  }

  private static handleAuthorizationError(): void {
    toast.error('You do not have permission to perform this action.');
  }

  private static handleRateLimitError(): void {
    toast.warning('Too many requests. Please wait a moment and try again.');
  }

  private static handleServerError(): void {
    toast.error('Server error. Our team has been notified.');
  }

  private static handleNetworkError(): void {
    toast.error('Network connection issue. Please check your internet connection.');
  }

  private static handleGenericError(error: APIError): void {
    toast.error(`Request failed: ${error.message}`);
  }

  private static handleUnknownError(error: any): void {
    toast.error('An unexpected error occurred. Please try again.');
  }
}
```

### Retry Mechanisms

```typescript
class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        // Don't retry on authentication errors
        if (error instanceof APIError && error.statusCode === 401) {
          throw error;
        }

        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await this.sleep(backoffDelay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage example
const fetchUserData = async (userId: string) => {
  return await RetryHandler.withRetry(
    () => api.get(`/api/users/${userId}`),
    3,
    1000
  );
};
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'CLOSED') {
      try {
        const result = await operation();
        this.onSuccess();
        return result;
      } catch (error) {
        this.onFailure();
        throw error;
      }
    }

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        try {
          const result = await operation();
          this.onSuccess();
          return result;
        } catch (error) {
          this.onFailure();
          throw error;
        }
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    // HALF_OPEN state
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Usage for critical API endpoints
const agentCircuitBreaker = new CircuitBreaker(3, 30000);

const callAgentWithCircuitBreaker = async (agentType: string, content: string) => {
  return await agentCircuitBreaker.execute(() => 
    agentService.callAgent(agentType, content, sessionId)
  );
};
```

## Data Validation & Security

### Request Validation

```typescript
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'array';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

interface ValidationSchema {
  [key: string]: ValidationRule;
}

class RequestValidator {
  static validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string> = {};

    Object.entries(schema).forEach(([field, rules]) => {
      const value = data[field];

      // Required field validation
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors[field] = `${field} is required`;
        return;
      }

      // Skip further validation if field is not required and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        return;
      }

      // Type validation
      if (rules.type) {
        const typeError = this.validateType(value, rules.type, field);
        if (typeError) {
          errors[field] = typeError;
          return;
        }
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        errors[field] = `${field} must be at least ${rules.minLength} characters`;
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors[field] = `${field} must not exceed ${rules.maxLength} characters`;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = `${field} format is invalid`;
      }

      // Custom validation
      if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
          errors[field] = customError;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  private static validateType(value: any, type: string, field: string): string | null {
    switch (type) {
      case 'string':
        return typeof value !== 'string' ? `${field} must be a string` : null;
      case 'number':
        return typeof value !== 'number' ? `${field} must be a number` : null;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return !emailRegex.test(value) ? `${field} must be a valid email` : null;
      case 'array':
        return !Array.isArray(value) ? `${field} must be an array` : null;
      default:
        return null;
    }
  }
}

// Validation schemas for Maya forms
const ONBOARDING_SCHEMA: ValidationSchema = {
  firstName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  lastName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  email: { required: true, type: 'email' },
  recoveryGoals: { type: 'array' },
  wellnessGoals: { type: 'array' },
  experienceLevel: { 
    required: true, 
    custom: (value) => 
      ['beginner', 'intermediate', 'advanced'].includes(value) 
        ? null 
        : 'Invalid experience level'
  }
};

const GROUP_CREATION_SCHEMA: ValidationSchema = {
  name: { required: true, type: 'string', minLength: 3, maxLength: 100 },
  description: { required: true, type: 'string', minLength: 10, maxLength: 500 },
  type: { 
    required: true, 
    custom: (value) => 
      ['recovery', 'wellness', 'general'].includes(value) 
        ? null 
        : 'Invalid group type'
  },
  maxMembers: { 
    required: true, 
    type: 'number',
    custom: (value) => 
      value >= 4 && value <= 20 
        ? null 
        : 'Max members must be between 4 and 20'
  }
};
```

### Input Sanitization

```typescript
class InputSanitizer {
  static sanitizeHtml(input: string): string {
    // Remove potentially dangerous HTML tags and attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static sanitizeString(input: string): string {
    // Remove null bytes and control characters
    return input
      .replace(/\0/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static sanitizeArray(array: any[]): any[] {
    return array
      .filter(item => item !== null && item !== undefined)
      .map(item => typeof item === 'string' ? this.sanitizeString(item) : item);
  }
}

// Apply sanitization to form data
const sanitizeFormData = (formData: any): any => {
  const sanitized = { ...formData };

  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = InputSanitizer.sanitizeString(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = InputSanitizer.sanitizeArray(value);
    }
  });

  // Special handling for email fields
  if (sanitized.email) {
    sanitized.email = InputSanitizer.sanitizeEmail(sanitized.email);
  }

  return sanitized;
};
```

## Performance Optimization

### Request Caching

```typescript
class APICache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, entry);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new APICache();

// Cached API wrapper
const cachedApiCall = async <T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Make API call and cache result
  const result = await apiCall();
  apiCache.set(cacheKey, result, ttl);
  return result;
};

// Usage examples
const getCachedUsers = () => 
  cachedApiCall('users:all', () => api.get('/api/admin/users'), 2 * 60 * 1000);

const getCachedGroups = () => 
  cachedApiCall('groups:all', () => api.get('/api/groups'), 5 * 60 * 1000);
```

### Request Batching

```typescript
class RequestBatcher {
  private batches = new Map<string, BatchRequest[]>();
  private timers = new Map<string, NodeJS.Timeout>();
  private batchDelay = 100; // 100ms

  batch<T>(
    batchKey: string,
    request: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchRequest: BatchRequest = {
        request,
        resolve,
        reject
      };

      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      this.batches.get(batchKey)!.push(batchRequest);

      // Clear existing timer and set new one
      if (this.timers.has(batchKey)) {
        clearTimeout(this.timers.get(batchKey)!);
      }

      const timer = setTimeout(() => {
        this.processBatch(batchKey);
      }, this.batchDelay);

      this.timers.set(batchKey, timer);
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const requests = this.batches.get(batchKey);
    if (!requests || requests.length === 0) {
      return;
    }

    // Clear batch and timer
    this.batches.delete(batchKey);
    this.timers.delete(batchKey);

    // Process all requests concurrently
    const promises = requests.map(async (batchRequest) => {
      try {
        const result = await batchRequest.request();
        batchRequest.resolve(result);
      } catch (error) {
        batchRequest.reject(error);
      }
    });

    await Promise.allSettled(promises);
  }
}

const requestBatcher = new RequestBatcher();

// Usage for user data fetching
const batchedUserFetch = (userId: string) => 
  requestBatcher.batch(
    'user-fetch',
    () => api.get(`/api/users/${userId}`)
  );
```

### Response Compression

```typescript
// Enable gzip compression for API responses
const configureCompression = () => {
  // This would typically be configured on the server side,
  // but the client can indicate support
  api.defaultHeaders['Accept-Encoding'] = 'gzip, deflate, br';
};

// Request size optimization
const optimizeRequestPayload = (data: any): any => {
  // Remove undefined and null values
  const cleaned = JSON.parse(JSON.stringify(data));
  
  // Compress arrays if possible
  if (Array.isArray(cleaned)) {
    return cleaned.filter(item => item !== null && item !== undefined);
  }

  // Remove empty strings and arrays from objects
  Object.keys(cleaned).forEach(key => {
    const value = cleaned[key];
    if (value === '' || (Array.isArray(value) && value.length === 0)) {
      delete cleaned[key];
    }
  });

  return cleaned;
};
```

## Testing & Monitoring

### API Testing Utilities

```typescript
class APITestHelper {
  static mockAPI(endpoint: string, response: any, status: number = 200): void {
    // Mock implementation for testing
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response))
    });
  }

  static async testEndpoint(
    endpoint: string,
    method: string = 'GET',
    data?: any
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await api.request(endpoint, {
        method,
        body: data ? JSON.stringify(data) : undefined
      });

      return {
        success: true,
        response,
        duration: Date.now() - startTime,
        endpoint,
        method
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        endpoint,
        method
      };
    }
  }

  static async loadTest(
    endpoint: string,
    concurrentRequests: number = 10,
    iterations: number = 100
  ): Promise<LoadTestResult> {
    const results: TestResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const promises = Array(concurrentRequests).fill(null).map(() =>
        this.testEndpoint(endpoint)
      );
      
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults.map(r => 
        r.status === 'fulfilled' ? r.value : {
          success: false,
          error: r.reason.message,
          duration: 0,
          endpoint,
          method: 'GET'
        }
      ));
    }

    return this.analyzeResults(results);
  }

  private static analyzeResults(results: TestResult[]): LoadTestResult {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const durations = successful.map(r => r.duration);

    return {
      totalRequests: results.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      successRate: (successful.length / results.length) * 100,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      errors: failed.map(r => r.error)
    };
  }
}
```

### Performance Monitoring

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();

  startTiming(operation: string): string {
    const timingId = `${operation}_${Date.now()}_${Math.random()}`;
    performance.mark(`${timingId}_start`);
    return timingId;
  }

  endTiming(timingId: string, operation: string): void {
    performance.mark(`${timingId}_end`);
    performance.measure(timingId, `${timingId}_start`, `${timingId}_end`);
    
    const measure = performance.getEntriesByName(timingId)[0];
    const metric: PerformanceMetric = {
      operation,
      duration: measure.duration,
      timestamp: Date.now()
    };

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    this.metrics.get(operation)!.push(metric);

    // Keep only last 100 measurements per operation
    const metrics = this.metrics.get(operation)!;
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    // Clean up performance entries
    performance.clearMarks(`${timingId}_start`);
    performance.clearMarks(`${timingId}_end`);
    performance.clearMeasures(timingId);
  }

  getMetrics(operation: string): PerformanceStats {
    const metrics = this.metrics.get(operation) || [];
    
    if (metrics.length === 0) {
      return {
        operation,
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        recent: []
      };
    }

    const durations = metrics.map(m => m.duration);
    return {
      operation,
      count: metrics.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      recent: metrics.slice(-10) // Last 10 measurements
    };
  }

  // Automatic performance monitoring for API calls
  monitorAPICall<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const timingId = this.startTiming(operation);
    
    return apiCall().finally(() => {
      this.endTiming(timingId, operation);
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Usage example
const monitoredAPICall = async (endpoint: string) => {
  return await performanceMonitor.monitorAPICall(
    `api_${endpoint.replace(/\//g, '_')}`,
    () => api.get(endpoint)
  );
};
```

## Conclusion

Maya's API integration provides a robust, secure, and performant foundation for AI-powered therapeutic support. The system's comprehensive error handling, caching strategies, and monitoring capabilities ensure reliable operation while maintaining the highest standards of security and compliance required for healthcare applications.

The modular architecture allows for easy extension and maintenance while providing clear separation of concerns between authentication, data management, and AI orchestration. Performance optimizations ensure responsive user experiences even under high load conditions.

This documentation serves as both a technical reference and implementation guide for developers working with Maya's API integration layer.