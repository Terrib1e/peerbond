# 🎯 PeerBond AI Agent System - Interview Demo Guide

## 🚀 Quick Demo Setup (5 minutes)

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Set the key variable to enable new system
echo "USE_TOOL_SYSTEM=true" >> .env
```

### 2. Build & Start
```bash
# Build the enhanced system
npm run build

# Start the server
npm run dev
```

### 3. Test the System
```bash
# Quick verification that agents are working
node test-agent-tools.js
```

---

## 🎭 Demo Script - "Intelligent AI Agent Orchestration"

### **Opening Hook (30 seconds)**
*"I've built an advanced AI agent system that intelligently routes member conversations to specialized therapeutic agents, each with their own tools and expertise. Let me show you how it works."*

### **Demo Flow (5 minutes)**

#### **1. Show the Architecture (1 minute)**
```
📱 User Message → 🎭 Enhanced Orchestrator → 🤖 Specialized Agents → 🔧 Tools → 📊 Response
```

*"The system has 5 core agents, each with specialized tools:"*
- **Maya (Facilitator)** - Therapeutic support & validation
- **Matching Agent** - Group recommendations
- **Sentiment Agent** - Emotional analysis & crisis detection
- **Insight Agent** - Progress tracking & patterns
- **Crisis Agent** - Emergency intervention

#### **2. Live API Demonstration (3 minutes)**

**Test 1: Group Finding**
```bash
curl -X POST http://localhost:5000/api/orchestration/agent/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agentId": "matching",
    "message": "I need help finding a support group for anxiety",
    "sessionId": "session_demo_123"
  }'
```

*Expected: Shows searchGroups, rankGroupsByRelevance tools in action*

**Test 2: Crisis Detection**
```bash
curl -X POST http://localhost:5000/api/orchestration/agent/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agentId": "sentiment",
    "message": "I feel overwhelmed and don'\''t know what to do",
    "sessionId": "session_demo_456"
  }'
```

*Expected: Shows sentiment analysis + crisis detection tools*

**Test 3: Intelligent Orchestration**
```bash
curl -X POST http://localhost:5000/api/orchestration/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "I want to track my progress and find a support group",
    "sessionId": "session_demo_789"
  }'
```

*Expected: Automatically routes to multiple agents (insight + matching)*

#### **3. Show Tool System (1 minute)**

*"Each agent uses formal tools with validation and audit trails:"*

```javascript
// Example: Matching Agent Tool Usage
const result = await agent.execute("find anxiety groups", context);
// Uses: searchGroups → rankGroupsByRelevance → generateGroupRecommendations
// Returns: Structured recommendations with confidence scores
```

### **Technical Highlights**
- ✅ **Tool-based Architecture** - Formal JSON schemas for all operations
- ✅ **Intelligent Routing** - Content analysis determines best agent
- ✅ **Safety First** - Always runs crisis detection
- ✅ **Audit Trails** - Full logging of all tool executions
- ✅ **Backward Compatible** - Feature flag for gradual rollout

---

## 📋 Demo Checklist

### Before Demo:
- [ ] Server running on port 5000
- [ ] `USE_TOOL_SYSTEM=true` in environment
- [ ] Test script passes: `node test-agent-tools.js`
- [ ] Postman/curl ready with auth token
- [ ] Browser tab open to API documentation

### During Demo:
- [ ] Show architecture diagram
- [ ] Run live API calls
- [ ] Highlight tool usage in responses
- [ ] Mention crisis safety features
- [ ] Show audit logging

### Key Points to Emphasize:
1. **Intelligent Agent Selection** - System picks the right expert
2. **Tool Integration** - Formal, validated operations
3. **Safety Features** - Crisis detection on every message
4. **Scalability** - Easy to add new agents/tools
5. **Production Ready** - Full error handling & logging

---

## 🛠️ Quick Fixes if Something Breaks

### If agents don't respond:
```bash
# Check environment
grep USE_TOOL_SYSTEM .env

# Rebuild
npm run build
```

### If tools fail:
```bash
# Test individual components
node -e "console.log(require('./server/dist/agents/AgentFactory').AgentFactory.getInstance().getAvailableAgentTypes())"
```

### Fallback Demo:
- Show code structure in VS Code
- Walk through agent implementations
- Explain tool system architecture

---

## 🎯 Key Selling Points

1. **"This isn't just chatbot routing - it's specialized AI agents with their own expertise"**
2. **"Safety-first design - every message gets crisis screening"**
3. **"Audit-ready architecture for healthcare compliance"**
4. **"Modular design - easy to add new therapeutic approaches"**
5. **"Production-ready with full error handling and fallbacks"**

---

## 📊 Expected Demo Results

Each agent call should return:
```json
{
  "success": true,
  "response": "Detailed, contextual response...",
  "agentUsed": "matching",
  "toolsUsed": ["searchGroups", "generateGroupRecommendations"],
  "confidence": 0.9,
  "metadata": {
    "groupCount": 3,
    "matchingCriteria": ["anxiety", "peer_support"]
  }
}
```

**Good luck with your interview! 🚀**