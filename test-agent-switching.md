# Agent Switching Test Plan

## ✅ What Was Fixed

### 1. **Chat Interface Integration**
- Fixed `AIOrchestrationChatInterface.tsx` to call orchestration service instead of bypassing it
- Messages now go through: User Input → Orchestration API → Agent Routing → AI Response

### 2. **Proper Agent Switching**
- Fixed `executeRoutingDecision()` to actually switch between agents based on AI routing decisions
- Added detailed logging to track which agent is being used
- Each agent now executes its specialized tools properly

### 3. **Enhanced LLM Routing**
- Improved JSON parsing with better error handling
- Added validation for agent names, tools, reasoning, and confidence
- Enhanced fallback routing with more intelligent keyword detection

### 4. **WebSocket Integration**
- WebSocket already had `processGroupMessageWithAI()` method connected to orchestration
- Real-time updates now include proper agent context and switching

## 🧪 Test Cases

### Test 1: Matching Agent
**Send these messages to trigger the matching agent:**
```
"List all groups"
"Show me available groups" 
"Find me a support group"
"I want to connect with others"
```

**Expected behavior:**
- AI Router should detect group-related intent
- Should switch to MATCHING agent
- Response should include actual group listings from database
- Should show agent switch in console logs

### Test 2: Insight Agent  
**Send these messages to trigger the insight agent:**
```
"How am I doing with my progress?"
"What insights do you have about my journey?"
"Track my progress"
"Show me patterns in my growth"
```

**Expected behavior:**
- AI Router should detect insight/progress intent
- Should switch to INSIGHT agent
- Response should analyze conversation patterns and user progress
- Should show agent switch in console logs

### Test 3: Facilitator Agent (Default)
**Send these messages to trigger the facilitator agent:**
```
"I'm feeling anxious today"
"I need some support"
"How are you, Maya?"
"I'm struggling with depression"
```

**Expected behavior:**
- AI Router should detect emotional/therapeutic content
- Should switch to FACILITATOR agent (Maya)
- Response should be empathetic and supportive
- Should show agent switch in console logs

### Test 4: Crisis Detection
**Send these messages to test crisis routing:**
```
"I'm feeling hopeless"
"I can't cope anymore"
"I want to give up"
```

**Expected behavior:**
- Sentiment agent should detect crisis-level content
- Should automatically route to CRISIS agent regardless of AI router decision
- Should provide crisis resources and safety information
- Should alert facilitators (if configured)

## 🔍 How to Monitor Agent Switching

### 1. Browser Console
Open Developer Tools → Console and look for these logs:
```
[ProductionOrchestrator] AI Router decision: matching
[ProductionOrchestrator] Switching to MATCHING agent
[ProductionOrchestrator] ✅ Successfully switched to matching agent
```

### 2. Network Tab
- Check API calls to `/production-orchestration/message`
- Response should include `agentUsed` array showing which agents were triggered
- Should see `confidence` scores and `metadata` with routing decisions

### 3. Chat Interface
- AI messages should show agent indicators
- Confidence scores should appear next to AI responses
- Meta-query responses should have different styling (blue background)

## 🎯 Expected Agent Behaviors

### Matching Agent
- **Triggers**: "list groups", "find group", "connect", "community"
- **Tools**: searchGroups, listAllGroups, generateGroupRecommendations
- **Response**: Actual database group listings with descriptions

### Facilitator Agent (Maya)
- **Triggers**: emotions, support requests, therapeutic content
- **Tools**: provideSupportiveResponse, validateFeelings, suggestCopingStrategies
- **Response**: Empathetic, therapeutic guidance

### Insight Agent
- **Triggers**: "progress", "journey", "insights", "growth", "patterns"
- **Tools**: analyzeUserProgress, generateProgressInsights, trackJourney
- **Response**: Analysis of conversation patterns and user development

### Crisis Agent
- **Triggers**: crisis keywords, high negative sentiment
- **Tools**: provideCrisisSupport, escalateToHuman, createSafetyPlan
- **Response**: Immediate safety resources and intervention

## 🚀 Quick Test Commands

Try these in your chat interface:

1. **"What agents are there?"** → Should trigger meta-query response
2. **"List all available groups"** → Should trigger matching agent
3. **"How am I progressing?"** → Should trigger insight agent  
4. **"I'm feeling sad today"** → Should trigger facilitator agent
5. **"I feel hopeless"** → Should trigger crisis agent

## 📊 Success Metrics

✅ **Agent Switching Working When:**
- Console shows "Switching to [AGENT] agent" messages
- Different agents provide different types of responses
- API responses include correct `agentUsed` arrays
- Chat interface shows agent indicators and confidence scores
- Meta-queries about the AI system are handled correctly

❌ **Issues to Watch For:**
- All responses coming from same agent (facilitator)
- No agent switching logs in console
- API responses missing `agentUsed` data
- Chat interface not showing AI context information
- Orchestration service not being called (check Network tab)

The system should now properly route messages through the AI orchestration pipeline and switch between specialized agents based on user intent!