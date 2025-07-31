# 🤖 PeerBond AI Agent System

## Overview

A sophisticated multi-agent system for therapeutic AI conversations, featuring specialized agents with tool-based execution and intelligent orchestration.

## 🏗️ Architecture

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   User Input    │───▶│ Enhanced          │───▶│ Specialized     │
│                 │    │ Orchestrator      │    │ Agents          │
└─────────────────┘    └───────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         ▼
                       ┌───────────────────┐    ┌─────────────────┐
                       │ Agent Selection   │    │ Tool Execution  │
                       │ & Routing         │    │ & Validation    │
                       └───────────────────┘    └─────────────────┘
```

## 🎭 Available Agents

### 1. **Maya (Facilitator Agent)**
- **Purpose**: Primary therapeutic conversation handler
- **Tools**: `provideSupportiveResponse`, `validateFeelings`, `suggestCopingStrategies`
- **Specialties**: Emotional validation, CBT/DBT techniques, therapeutic responses

### 2. **Matching Agent**
- **Purpose**: Group recommendations and peer connections
- **Tools**: `searchGroups`, `rankGroupsByRelevance`, `generateGroupRecommendations`
- **Specialties**: Compatibility scoring, group matching algorithms

### 3. **Sentiment Agent**
- **Purpose**: Emotional analysis and crisis detection
- **Tools**: `analyzeSentiment`, `detectCrisis`
- **Specialties**: Safety monitoring, emotional assessment, risk evaluation

### 4. **Insight Agent**
- **Purpose**: Progress tracking and pattern analysis
- **Tools**: `analyzeUserProgress`, `generateProgressInsights`, `identifyPatterns`
- **Specialties**: Journey tracking, growth insights, behavioral patterns

### 5. **Crisis Agent**
- **Purpose**: Emergency intervention and safety planning
- **Tools**: `provideCrisisSupport`, `escalateToHuman`
- **Specialties**: Crisis intervention, safety resources, emergency protocols

## 🔧 Tool System

Each agent operates through a formal tool system:

### Tool Execution Flow
1. **Input Validation** - JSON schema validation of parameters
2. **Tool Execution** - Structured business logic execution
3. **Result Validation** - Output schema validation
4. **Audit Logging** - Complete execution trail
5. **Error Handling** - Graceful degradation

### Example Tool Call
```typescript
const result = await agent.execute("I need anxiety support", {
  memberId: "member123",
  sessionId: "session456",
  timestamp: new Date()
});

// Returns:
{
  response: "I hear that you're dealing with anxiety...",
  confidence: 0.9,
  toolsUsed: ["provideSupportiveResponse", "suggestCopingStrategies"],
  metadata: { emotionalState: "distressed", therapeuticApproach: "validation" }
}
```

## 🎯 Intelligent Orchestration

### Agent Selection Logic
```typescript
const selectAgent = (message) => {
  if (containsCrisisKeywords(message)) return 'crisis';
  if (containsGroupKeywords(message)) return 'matching';
  if (containsProgressKeywords(message)) return 'insight';
  return 'facilitator'; // default
};
```

### Safety-First Processing
1. **Always** run sentiment analysis first
2. **Escalate** to crisis agent if needed
3. **Route** to appropriate specialist
4. **Fallback** to Maya for general support

## 🛡️ Safety Features

- **Crisis Detection**: Every message screened for risk indicators
- **Escalation Protocols**: Automatic human handoff for emergencies
- **Safety Resources**: Immediate access to crisis hotlines
- **Audit Trails**: Complete logging for compliance

## 📊 Configuration

### Environment Variables
```bash
# Enable the enhanced agent system
USE_TOOL_SYSTEM=true

# Logging level
LOG_LEVEL=info

# Crisis contact information
CRISIS_HOTLINE_NUMBER=988
CRISIS_TEXT_NUMBER=741741
```

### Feature Flags
- `USE_TOOL_SYSTEM`: Enable new agent architecture
- `ENABLE_CRISIS_DETECTION`: Safety monitoring (always recommended)
- `AUDIT_TOOL_EXECUTION`: Detailed logging for compliance

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   echo "USE_TOOL_SYSTEM=true" >> .env
   ```

3. **Build System**
   ```bash
   npm run build
   ```

4. **Test Agents**
   ```bash
   node test-agent-tools.js
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

## 📡 API Usage

### Direct Agent Calls
```bash
POST /api/production-orchestration/agent/call
{
  "agentId": "matching",
  "message": "I need help finding a support group",
  "sessionId": "session_123"
}
```

### Intelligent Orchestration
```bash
POST /api/production-orchestration/message
{
  "content": "I'm feeling anxious and need support",
  "sessionId": "session_123"
}
```

### List Available Agents
```bash
GET /api/production-orchestration/agents
```

## 🔍 Monitoring & Debugging

### Tool Execution Logs
```bash
# View tool audit trail
GET /api/tools/audit/{sessionId}
```

### Agent Performance
```bash
# System health check
GET /api/production-orchestration/health
```

### Available Tools
```bash
# List all tools by agent
GET /api/tools/schemas
```

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
node test-agent-tools.js
```

### Load Testing
```bash
npm run test:load
```

## 🔧 Development

### Adding New Agents
1. Extend `BaseAgent` class
2. Define tool schemas in `schemas.ts`
3. Implement tool handlers in `executor.ts`
4. Register in `AgentFactory.ts`

### Adding New Tools
1. Define schema in `schemas.ts`
2. Add implementation in `executor.ts`
3. Update agent tool lists
4. Add tests

## 📋 Production Checklist

- [ ] Environment variables configured
- [ ] Database connections tested
- [ ] Crisis escalation pathways verified
- [ ] Audit logging enabled
- [ ] Error monitoring active
- [ ] Load balancing configured
- [ ] Backup systems in place

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for therapeutic AI applications**