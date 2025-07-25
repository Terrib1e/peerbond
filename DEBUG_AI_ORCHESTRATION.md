# 🐛 AI Orchestration Debugging Guide

## ✅ Changes Made to Fix AI Issue

### 1. **Fixed Group Chat Component**
- ✅ Changed `GroupDetailPage.tsx` to use `AIOrchestrationChatInterface` instead of old `ChatInterface`
- ✅ Added detailed logging to track orchestration calls

### 2. **Added Debug Logging**
- ✅ Console logs now show `🤖 [AI-ORCHESTRATION]` prefix for easy identification
- ✅ Detailed error logging with response status and data

## 🔍 How to Debug

### Step 1: Check Browser Console
1. Open your group chat
2. Send a test message like "Hello"
3. Look for these console logs:

```
🤖 [AI-ORCHESTRATION] Processing message through orchestration: {content: "Hello", sessionId: "session_..."}
🤖 [AI-ORCHESTRATION] Orchestration response received: {success: true, agentUsed: ["facilitator"], confidence: 0.8, responsePreview: "Hello! I'm Maya..."}
```

### Step 2: Check for Errors
If you see errors, look for:
```
🤖 [AI-ORCHESTRATION] ERROR: [error details]
🤖 [AI-ORCHESTRATION] Error details: {message: "...", status: 500, data: {...}}
```

### Step 3: Verify API Connection
1. Open Network tab in DevTools
2. Send a message
3. Look for API call to `/api/production-orchestration/message`
4. Check response status and data

## 🧪 Test Messages to Try

### Test Agent Switching:
1. **"List all groups"** → Should trigger Matching Agent
2. **"How am I progressing?"** → Should trigger Insight Agent  
3. **"I'm feeling sad"** → Should trigger Facilitator Agent
4. **"What agents are there?"** → Should trigger meta-query response

### Expected Console Output:
```
🤖 [AI-ORCHESTRATION] Processing message through orchestration: {content: "List all groups", sessionId: "session_..."}
🤖 [AI-ORCHESTRATION] Orchestration response received: {
  success: true, 
  agentUsed: ["ai-router", "sentiment", "matching"], 
  confidence: 0.9, 
  responsePreview: "Great! I've found some wonderful peer support groups..."
}
```

## 🚨 Common Issues & Solutions

### Issue 1: No Console Logs Appearing
**Problem**: Using old ChatInterface component
**Solution**: ✅ Fixed - Now using AIOrchestrationChatInterface

### Issue 2: API 404 Error
**Problem**: Orchestration route not found
**Check**: Server logs should show route registration
```bash
Server: Route /api/production-orchestration registered
```

### Issue 3: Session Not Starting
**Problem**: WebSocket connection issues
**Check**: Look for orchestration session start in useGroupOrchestration hook

### Issue 4: No AI Response
**Problem**: orchestration.sessionId is null
**Solution**: The hook should auto-start session when connected

## 🔧 Server-Side Debugging

### Check Server Console For:
```
[ProductionOrchestrator] 🚀 Starting session for userId: user_123
[ProductionOrchestrator] AI Router decision: matching
[ProductionOrchestrator] Switching to MATCHING agent
[ProductionOrchestrator] ✅ Successfully switched to matching agent
```

### Check Database Connection:
- Ensure Gemini API key is set in environment variables
- Verify database connection for group matching queries

## 🎯 Success Indicators

✅ **AI Working When You See:**
- Console logs with `🤖 [AI-ORCHESTRATION]` prefix
- API calls to `/production-orchestration/message` in Network tab
- Agent switching logs: "Switching to [AGENT] agent"
- AI responses appearing in chat with agent indicators
- Different agents responding to different message types

❌ **Issues When You See:**
- No orchestration console logs
- 404 errors on orchestration API calls
- All responses coming from same agent
- No AI responses at all
- Errors about missing sessionId

## 🚀 Quick Test

1. Open group chat
2. Send: "What agents are there?"
3. Should see:
   - Console logs showing orchestration processing
   - AI response listing the 6 agents with descriptions
   - Response styled with blue background (meta-query)

If this works, your AI orchestration is fully functional! 🎉