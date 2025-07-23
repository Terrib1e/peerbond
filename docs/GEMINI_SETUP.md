# Gemini AI Integration Setup

The PeerBond AI facilitator now uses **Google's Gemini 2.0 Flash** model for intelligent, context-aware responses in recovery support groups.

## 🔑 Getting Your Gemini API Key

1. **Go to Google AI Studio**: https://aistudio.google.com/
2. **Sign in** with your Google account
3. **Create an API key**:
   - Click "Get API key" in the top navigation
   - Click "Create API key in new project" (or select existing project)
   - Copy the generated API key

## ⚙️ Configuration

1. **Add API key to environment variables**:
   ```bash
   # In server/.env
   GEMINI_API_KEY=your-actual-api-key-here
   ```

2. **Restart the server** after adding the API key:
   ```bash
   cd server
   npm run build
   npm start
   ```

## 🧠 How Gemini Powers the AI Facilitator

### **Maya - Your AI Facilitator**
- **Model**: Gemini 2.0 Flash (latest and fastest)
- **Personality**: Warm, empathetic, and supportive
- **Specialization**: Mental health and recovery support
- **Response time**: ~1-3 seconds

### **Key Features**
- **Crisis Detection**: Immediately identifies concerning language
- **Context Awareness**: Understands conversation flow and group dynamics  
- **Appropriate Responses**: Tailored to recovery, anxiety, depression contexts
- **Action Items**: Suggests helpful next steps based on discussion
- **Professional Tone**: Maintains therapeutic boundaries

### **Response Triggers**
- ✅ **Crisis language** → Immediate supportive response with resources
- ✅ **Struggling/difficulties** → 70% chance of empathetic support
- ✅ **Progress/milestones** → 50% chance of celebration and encouragement
- ✅ **Long silences** → 40% chance of gentle re-engagement
- ✅ **General conversation** → 15% chance of facilitation

## 🔒 Security & Privacy

- **No data storage**: Messages are not stored by Google
- **HIPAA considerations**: Conversations are processed but not retained
- **Local control**: All conversation history stays in your database
- **API limits**: Standard Gemini API rate limits apply

## 📊 Model Configuration

```typescript
// Current Gemini settings
model: "gemini-2.0-flash-exp"
temperature: 0.7        // Balanced creativity
topP: 0.8              // Response diversity  
topK: 40               // Token selection
maxTokens: 512         // Response length limit
```

## 🚀 Testing the Integration

1. **Start both servers**:
   ```bash
   # Frontend
   npm run dev:frontend
   
   # Backend  
   cd server && npm start
   ```

2. **Create or join a recovery support group**

3. **Send messages** with keywords like:
   - "I'm struggling today" 
   - "Feeling hopeless"
   - "Made progress this week"
   - "Grateful for this group"

4. **Watch Maya respond** with contextual, supportive messages!

## 💡 Customization

You can modify Maya's personality and behavior in:
- `server/src/services/geminiService.ts` - Core AI logic
- `server/src/services/websocket.ts` - Response triggers
- Temperature/creativity settings in the Gemini config

## 🔧 Troubleshooting

**Error: "GEMINI_API_KEY environment variable is required"**
→ Make sure you added the API key to `server/.env`

**Error: "API key not valid"** 
→ Check that you copied the full API key correctly

**No AI responses in chat**
→ Check that the group type includes "recovery" or "support"

**API rate limits**
→ Gemini has generous free tier limits, upgrade if needed

---

🎉 **Your AI facilitator is now powered by cutting-edge Gemini 2.0 Flash technology!**