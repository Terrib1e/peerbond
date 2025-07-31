# PeerBond API Reference

## Base URL

```
Production: https://api.peerbond.com
Development: http://localhost:3001
```

## Authentication

All API endpoints require authentication via JWT tokens in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Authentication Endpoints

#### POST /api/auth/login

Authenticate member and receive JWT token.

**Request:**
```json
{
  "email": "member@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member_123",
      "email": "member@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### POST /api/auth/register

Register new member account.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "member@example.com",
  "password": "secure_password",
  "recoveryGoals": ["anxiety", "depression"],
  "experienceLevel": "beginner"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "member_123",
      "email": "member@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2024-12-31T23:59:59Z"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Production Orchestration API

### Health & Monitoring

#### GET /api/production-orchestration/health

Comprehensive system health check with metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "3.0.0",
    "system": {
      "uptime": 86400,
      "memory": {
        "rss": 52428800,
        "heapTotal": 41943040,
        "heapUsed": 28311552,
        "external": 1089536
      },
      "cpu": {
        "member": 1000000,
        "system": 500000
      },
      "platform": "linux",
      "nodeVersion": "v18.19.0"
    },
    "orchestration": {
      "activeSessions": 142,
      "maxSessions": 10000,
      "utilizationPercent": 1.42
    },
    "performance": {
      "healthCheckDuration_ms": 15
    }
  }
}
```

#### GET /api/production-orchestration/metrics

Prometheus-compatible metrics endpoint.

**Response:** (text/plain)
```
# HELP peerbond_orchestration_active_sessions Number of active sessions
# TYPE peerbond_orchestration_active_sessions gauge
peerbond_orchestration_active_sessions 142

# HELP peerbond_orchestration_uptime_seconds System uptime in seconds
# TYPE peerbond_orchestration_uptime_seconds counter
peerbond_orchestration_uptime_seconds 86400

# HELP peerbond_memory_usage_bytes Memory usage in bytes
# TYPE peerbond_memory_usage_bytes gauge
peerbond_memory_usage_bytes{type="rss"} 52428800
peerbond_memory_usage_bytes{type="heapTotal"} 41943040
```

### Session Management

#### POST /api/production-orchestration/session/start

Create a new conversation session.

**Request:**
```json
{
  "groupId": "group_456", // Optional
  "memberProfile": {
    "goals": ["anxiety management", "peer support"],
    "preferences": {
      "language": "English",
      "timezone": "UTC"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1705316400000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "welcomeMessage": "Hi! I'm Maya, your AI peer support facilitator. I'm here to help you connect with others and provide support. What brings you here today?",
    "success": true
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "performance": {
    "duration_ms": 45
  }
}
```

#### POST /api/production-orchestration/message

Process a message through the AI orchestration system.

**Request:**
```json
{
  "sessionId": "session_1705316400000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "content": "I've been feeling really anxious lately about work and I'm not sure how to cope with the stress.",
  "messageType": "member" // Optional: "member" | "system"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Thank you for sharing that with me. I understand that anxiety can be overwhelming. You're in a safe space here. What's been contributing to these feelings?",
    "sessionId": "session_1705316400000_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "agentUsed": ["facilitator", "sentiment"],
    "confidence": 0.85,
    "needsCrisisIntervention": false,
    "suggestGroupMatching": false,
    "metadata": {
      "sentimentScore": -0.3,
      "crisisLevel": "none"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "performance": {
    "duration_ms": 250,
    "confidence": 0.85,
    "agents_used": 2
  }
}
```

#### GET /api/production-orchestration/session/{sessionId}/analytics

Get session analytics and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "messageCount": 8,
    "duration": 1800, // seconds
    "sentimentTrend": [-0.2, 0.1, -0.3, 0.4],
    "agentsUsed": ["facilitator", "sentiment", "crisis"],
    "crisisAlerts": 1,
    "engagementScore": 0.78
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "performance": {
    "duration_ms": 12
  }
}
```

#### POST /api/production-orchestration/session/{sessionId}/end

End a conversation session and generate summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Session completed with 8 messages over 30 minutes. Engagement score: 78.0%.",
    "insights": {
      "totalMessages": 8,
      "duration": 1800,
      "agentsUsed": ["facilitator", "sentiment", "crisis"],
      "engagementScore": 0.78,
      "crisisAlerts": 1,
      "endTime": "2024-01-15T11:00:00Z"
    },
    "success": true
  },
  "timestamp": "2024-01-15T11:00:00Z",
  "performance": {
    "duration_ms": 35
  }
}
```

## Crisis Response Example

When crisis language is detected, the system provides immediate intervention:

**Input:**
```json
{
  "sessionId": "session_123",
  "content": "I can't take this anymore. I'm thinking about ending it all."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I hear that you're going through something really difficult right now, and I want you to know that you're not alone. Your feelings are valid, and there are people who care about you and want to help.\n\n🆘 **Immediate Help Available:**\n• National Suicide Prevention Lifeline: **988**\n• Crisis Text Line: Text **HOME** to **741741**\n• Emergency Services: **911**\n\nPlease reach out to one of these resources right away. You matter, and there is help available. I'm also here to continue supporting you through this difficult time.",
    "sessionId": "session_123",
    "agentUsed": ["facilitator", "sentiment", "crisis"],
    "confidence": 0.95,
    "needsCrisisIntervention": true,
    "metadata": {
      "sentimentScore": -0.9,
      "crisisLevel": "severe"
    }
  }
}
```

## Group Management API

### Groups

#### GET /api/groups

List available support groups.

**Query Parameters:**
- `type`: Filter by group type (recovery, anxiety, depression, general)
- `limit`: Number of results (default: 20, max: 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "group_123",
        "name": "Anxiety Support Circle",
        "description": "A supportive space for those managing anxiety",
        "type": "anxiety",
        "memberCount": 6,
        "maxMembers": 8,
        "isPrivate": false,
        "facilitatorName": "Maya",
        "createdAt": "2024-01-01T00:00:00Z",
        "lastActivity": "2024-01-15T10:15:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### POST /api/groups

Create a new support group.

**Request:**
```json
{
  "name": "Anxiety Support Circle",
  "description": "A supportive space for those managing anxiety",
  "type": "anxiety",
  "maxMembers": 8,
  "isPrivate": false
}
```

#### POST /api/groups/{groupId}/join

Join a support group.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully joined group",
    "group": {
      "id": "group_123",
      "name": "Anxiety Support Circle",
      "role": "member"
    }
  }
}
```

### Messages

#### GET /api/messages/{groupId}

Get messages for a group.

**Query Parameters:**
- `limit`: Number of messages (default: 50, max: 200)
- `before`: Get messages before this timestamp
- `after`: Get messages after this timestamp

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "groupId": "group_123",
        "authorId": "member_456",
        "authorName": "John D.",
        "content": "Thanks everyone for the support today.",
        "type": "member",
        "timestamp": "2024-01-15T10:25:00Z",
        "reactions": {
          "❤️": ["member_789"],
          "👍": ["member_321", "member_654"]
        }
      },
      {
        "id": "msg_124",
        "groupId": "group_123",
        "authorId": "ai_facilitator",
        "authorName": "Maya",
        "content": "It's wonderful to see such support within our group. How is everyone feeling about the strategies we discussed?",
        "type": "ai_facilitator",
        "timestamp": "2024-01-15T10:26:00Z",
        "reactions": {}
      }
    ]
  }
}
```

#### POST /api/messages

Send a message to a group.

**Request:**
```json
{
  "groupId": "group_123",
  "content": "I wanted to share a breakthrough I had today with managing my anxiety.",
  "type": "member"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error category",
  "message": "Human-readable error description",
  "timestamp": "2024-01-15T10:30:00Z",
  "code": "SPECIFIC_ERROR_CODE" // Optional
}
```

### Common Error Codes

| Status | Error | Description |
|--------|--------|-------------|
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions for operation |
| 404 | Not Found | Requested resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error occurred |

### Rate Limiting

API endpoints are rate limited:

- **General endpoints**: 100 requests per minute per IP
- **Message endpoints**: 60 requests per minute per member
- **Session creation**: 30 requests per minute per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1705316460
```

## Request Headers

### Required Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Optional Headers

```http
X-Correlation-ID: <unique_request_id>  // For tracing
User-Agent: <client_info>              // For analytics
Accept-Language: en-US                 // For localization
```

## Response Headers

All responses include:

```http
Content-Type: application/json
X-Correlation-ID: <request_id>
X-Response-Time: <duration_ms>
Cache-Control: no-cache, no-store, must-revalidate
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PeerBondClient } from '@peerbond/sdk';

const client = new PeerBondClient({
  baseURL: 'https://api.peerbond.com',
  apiKey: 'your-jwt-token'
});

// Start session
const session = await client.orchestration.startSession({
  memberProfile: {
    goals: ['anxiety-management'],
    preferences: { language: 'English' }
  }
});

// Send message
const response = await client.orchestration.sendMessage({
  sessionId: session.sessionId,
  content: "I'm feeling anxious about work today."
});

// Get analytics
const analytics = await client.orchestration.getAnalytics(session.sessionId);
```

### Python

```python
from peerbond import PeerBondClient

client = PeerBondClient(
    base_url="https://api.peerbond.com",
    api_key="your-jwt-token"
)

# Start session
session = client.orchestration.start_session(
    member_profile={
        "goals": ["anxiety-management"],
        "preferences": {"language": "English"}
    }
)

# Send message
response = client.orchestration.send_message(
    session_id=session["sessionId"],
    content="I'm feeling anxious about work today."
)
```

### cURL Examples

```bash
# Start session
curl -X POST https://api.peerbond.com/api/production-orchestration/session/start \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"memberProfile": {"goals": ["anxiety-management"]}}'

# Send message
curl -X POST https://api.peerbond.com/api/production-orchestration/message \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_123",
    "content": "I need help managing my anxiety."
  }'
```

## WebSocket API (Real-time)

For real-time group chat functionality:

```javascript
const socket = io('wss://api.peerbond.com', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join group
socket.emit('join_group', { groupId: 'group_123' });

// Listen for messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
});

// Send message
socket.emit('send_message', {
  groupId: 'group_123',
  content: 'Hello everyone!'
});
```

This API reference provides comprehensive documentation for integrating with the PeerBond AI Orchestration System, including authentication, orchestration endpoints, group management, and real-time features.