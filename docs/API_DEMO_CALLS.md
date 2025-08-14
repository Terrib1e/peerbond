# 🔗 API Demo Calls - Live Interview Demonstrations

## Quick Setup for Live API Demo

### 1. Start Server
```bash
npm run dev
# Server should start on http://localhost:5000
```

### 2. Get Auth Token (if needed)
```bash
# For demo purposes, you might need to create a test member first
# Check your authentication setup
```

### 3. Health Check
```bash
curl http://localhost:5000/api/orchestration/health
```

---

## 🎭 Demo API Calls

### **Demo 1: Intelligent Agent Selection**
Show how the orchestrator automatically picks the right agent.

```bash
curl -X POST http://localhost:5000/api/orchestration/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "I need help finding a support group for anxiety and want to track my progress",
    "sessionId": "session_demo_001",
    "messageType": "member"
  }'
```

**Expected Result:** Routes to both matching and insight agents
- `agentsUsed: ["sentiment", "matching", "insight"]`
- `toolsUsed: ["analyzeSentiment", "searchGroups", "analyzeUserProgress"]`

---

### **Demo 2: Crisis Detection & Safety**
Demonstrate safety-first architecture with crisis detection.

```bash
curl -X POST http://localhost:5000/api/orchestration/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "I feel overwhelmed and don'\''t know what to do anymore",
    "sessionId": "session_demo_002",
    "messageType": "member"
  }'
```

**Expected Result:** Safety monitoring triggers
- `needsCrisisIntervention: true/false`
- `agentsUsed: ["sentiment", "crisis"]` (if crisis detected)
- Crisis resources provided in response

---

### **Demo 3: Direct Agent Calls**
Show specialized agent expertise with direct calls.

#### Matching Agent
```bash
curl -X POST http://localhost:5000/api/orchestration/agent/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agentId": "matching",
    "message": "I need help finding a support group for anxiety",
    "sessionId": "session_demo_003"
  }'
```

#### Facilitator Agent (Maya)
```bash
curl -X POST http://localhost:5000/api/orchestration/agent/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agentId": "facilitator",
    "message": "I'\''ve been feeling really anxious lately and need support",
    "sessionId": "session_demo_004"
  }'
```

#### Insight Agent
```bash
curl -X POST http://localhost:5000/api/orchestration/agent/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "agentId": "insight",
    "message": "How am I doing with my progress this month?",
    "sessionId": "session_demo_005"
  }'
```

---

### **Demo 4: System Information**
Show the available agents and tools.

#### List All Agents
```bash
curl -X GET http://localhost:5000/api/orchestration/agents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Tool Schemas
```bash
curl -X GET http://localhost:5000/api/tools/schemas \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Health & Performance
```bash
curl -X GET http://localhost:5000/api/orchestration/health
```

---

## 🎯 What to Highlight During Demo

### **Response Structure**
Point out the structured response format:
```json
{
  "success": true,
  "response": "AI-generated therapeutic response",
  "agentUsed": ["sentiment", "facilitator"],
  "toolsUsed": ["analyzeSentiment", "provideSupportiveResponse"],
  "confidence": 0.87,
  "needsCrisisIntervention": false,
  "metadata": {
    "emotionalScore": -0.3,
    "therapeuticApproach": "validation"
  }
}
```

### **Key Features to Emphasize**
1. **Multi-agent coordination** - Multiple agents working together
2. **Tool usage transparency** - Clear audit trail of what tools were used
3. **Confidence scoring** - AI provides confidence in its responses
4. **Safety monitoring** - Crisis detection on every message
5. **Structured metadata** - Rich context for logging and analysis

---

## 🔧 Troubleshooting Live Demo

### **If API calls fail:**
```bash
# Check server is running
curl http://localhost:5000/api/orchestration/health

# Check environment variables
grep USE_TOOL_SYSTEM .env

# Verify agents are loaded
curl http://localhost:5000/api/orchestration/agents
```

### **If authentication fails:**
```bash
# For demo, you might disable auth temporarily
# Or create a test member and get token
```

### **If responses look wrong:**
- Check `USE_TOOL_SYSTEM=true` in .env
- Verify build completed: `npm run build`
- Check logs for agent/tool errors

---

## 🎪 Postman Collection

For easier demo, import this into Postman:

```json
{
  "info": {
    "name": "PeerBond AI Agents Demo",
    "description": "API calls for demonstrating the AI agent system"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{base_url}}/api/orchestration/health"
      }
    },
    {
      "name": "Intelligent Orchestration",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/orchestration/message",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "body": {
          "raw": "{\n  \"content\": \"I need help finding a support group for anxiety\",\n  \"sessionId\": \"session_demo_001\"\n}"
        }
      }
    },
    {
      "name": "Direct Agent Call - Matching",
      "request": {
        "method": "POST",
        "url": "{{base_url}}/api/orchestration/agent/call",
        "header": [
          {"key": "Content-Type", "value": "application/json"},
          {"key": "Authorization", "value": "Bearer {{token}}"}
        ],
        "body": {
          "raw": "{\n  \"agentId\": \"matching\",\n  \"message\": \"I need help finding a support group\",\n  \"sessionId\": \"session_demo_002\"\n}"
        }
      }
    }
  ],
  "variable": [
    {"key": "base_url", "value": "http://localhost:5000"},
    {"key": "token", "value": "your_auth_token_here"}
  ]
}
```

---

## 📋 Demo Checklist

**Before starting API demo:**
- [ ] Server running on port 5000
- [ ] `USE_TOOL_SYSTEM=true` in environment
- [ ] Health endpoint returns 200
- [ ] Auth token ready (if needed)
- [ ] Postman/curl commands tested
- [ ] Browser devtools open for response inspection

**During demo:**
- [ ] Start with health check
- [ ] Show intelligent orchestration first
- [ ] Highlight tool usage in responses
- [ ] Demonstrate crisis detection features
- [ ] End with system information calls

**Pro tips:**
- Use `jq` to pretty-print JSON: `curl ... | jq`
- Have responses formatted nicely for screen sharing
- Explain what each field means as you show it
- Point out confidence scores and metadata

**Ready to impress! 🌟**