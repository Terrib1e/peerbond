# 🐛 Debug: "0 AI Agents" Issue - Solution Guide

## ✅ **What to Check in Console**

Please follow these steps **exactly** and share the console output:

### 1. **Open Browser Console**
- Press **F12** or **Ctrl+Shift+I**
- Go to **Console** tab
- Clear the console (Ctrl+L)

### 2. **Navigate to Group Chat**
- Go to any group 
- Click the **Chat** tab
- Look for logs in this exact order:

### 3. **Expected Log Sequence**

#### **A) Hook Initialization:**
```
🤖 [ORCHESTRATION-HOOK] useGroupOrchestration called with: {groupId: "...", userId: "..."}
🤖 [ORCHESTRATION-HOOK] Initial state: {sessionId: null, agentStatus: {facilitator: false, ...}}
```

#### **B) Auto Session Start:**
```
🤖 [ORCHESTRATION-HOOK] Auto-starting AI session...
🤖 [ORCHESTRATION-HOOK] Starting AI session: {groupId: "...", userId: "..."}
```

#### **C) Session Success:**
```
🤖 [ORCHESTRATION-HOOK] Session started: {sessionId: "session_...", welcomeMessage: "..."}
🤖 [ORCHESTRATION-HOOK] Agent status updated: {facilitator: true, sentiment: true, crisis: true, insight: true, matching: true}
```

#### **D) State Propagation:**
```
🤖 [ORCHESTRATION-HOOK] Returning state: {sessionId: "session_...", agentStatus: {facilitator: true, ...}, isConnected: true, isLoading: false, error: null}
🤖 [AI-CHAT] Orchestration state: {sessionId: "session_...", agentStatus: {facilitator: true, ...}, isConnected: true, isLoading: false, error: null}
🤖 [AI-INDICATOR] Received agentStatus: {facilitator: true, sentiment: true, crisis: true, insight: true, matching: true}
🤖 [AI-INDICATOR] Active agents: [["facilitator", true], ["sentiment", true], ...]
🤖 [AI-INDICATOR] Agent count: 5
```

## 🚨 **Common Issues & Solutions**

### **Issue 1: No Session Start**
**Symptoms:** Missing "Auto-starting AI session" logs
**Solution:** Check authentication - user might not be logged in

### **Issue 2: Session API Fails**
**Symptoms:** Error after "Starting AI session"
**Solution:** Check Network tab for 401/500 errors to `/api/production-orchestration/session/start`

### **Issue 3: State Not Updating**
**Symptoms:** "Agent status updated" log shows `true` but indicator shows 0
**Solution:** React state update issue - refresh page and try again

### **Issue 4: Wrong Agent Status Passed**
**Symptoms:** AI-INDICATOR logs show all `false` values
**Solution:** Props not propagating correctly from chat to indicator

## 🧪 **Quick Test**

Try typing **"How many agents are there?"** in the chat. This should trigger the meta-query system and show you a detailed agent list regardless of the indicator status.

## 📋 **What to Share**

Please copy/paste these exact logs from your console:

1. **All logs starting with `🤖 [ORCHESTRATION-HOOK]`**
2. **All logs starting with `🤖 [AI-CHAT]`**
3. **All logs starting with `🤖 [AI-INDICATOR]`**
4. **Any errors in red**
5. **Screenshot of the chat interface showing "0 AI agents available"**

This will help me identify exactly where the agent status is getting lost! 🕵️