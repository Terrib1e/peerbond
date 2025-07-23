import express from 'express';

const router = express.Router();

/**
 * POST /api/basic-chat/message
 * Most basic AI chat that works immediately - no auth, no sessions, just chat
 */
router.post('/message', async (req, res) => {
  console.log('[BasicChat] 🚀 Message received');
  
  try {
    const { content } = req.body;
    console.log('[BasicChat] Message content:', content);
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }
    
    // Generate response immediately
    const response = generateResponse(content);
    console.log('[BasicChat] ✅ Generated response:', response);
    
    res.json({
      success: true,
      data: {
        response,
        agentUsed: ['BasicChat'],
        confidence: 0.8,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[BasicChat] ❌ Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
});

/**
 * GET /api/basic-chat/health
 */
router.get('/health', (req, res) => {
  console.log('[BasicChat] Health check');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

function generateResponse(content: string): string {
  const lowerContent = content.toLowerCase();
  
  // Crisis responses
  if (lowerContent.includes('suicide') || lowerContent.includes('kill myself')) {
    return `I'm very concerned about what you've shared. Your safety is the most important thing right now.

🚨 **Immediate Help:**
• Call 988 (Suicide Prevention Lifeline)
• Text HOME to 741741 (Crisis Text Line)
• Call 911 for emergency help

You don't have to go through this alone. Please reach out for help right now.`;
  }
  
  if (lowerContent.includes('hopeless') || lowerContent.includes('give up')) {
    return `I hear how much pain you're in. These feelings are overwhelming, but they can change. You're showing strength by reaching out.

**Support Resources:**
• 988 - Suicide Prevention Lifeline
• 741741 - Crisis Text Line
• 1-800-662-4357 - SAMHSA Helpline

What's been the hardest part for you lately?`;
  }
  
  // Mental health responses
  if (lowerContent.includes('anxious') || lowerContent.includes('anxiety')) {
    return "I understand that anxiety can feel overwhelming. You're in a safe space here. What's been contributing to these feelings? I'm here to listen.";
  }
  
  if (lowerContent.includes('depressed') || lowerContent.includes('sad')) {
    return "I hear that you're going through a difficult time. Your feelings are completely valid. Depression can feel isolating, but you're not alone. What's been the hardest part recently?";
  }
  
  if (lowerContent.includes('stressed') || lowerContent.includes('overwhelmed')) {
    return "It sounds like you're carrying a lot right now. Stress can be challenging to manage alone. What's been weighing on you the most?";
  }
  
  if (lowerContent.includes('lonely') || lowerContent.includes('alone')) {
    return "Feeling isolated can be really painful. Connection is so important for our wellbeing. You're not alone in this conversation. What's making you feel this way?";
  }
  
  // Support/group requests
  if (lowerContent.includes('group') || lowerContent.includes('support') || lowerContent.includes('help')) {
    return "Connecting with others who understand your experience can be incredibly healing. What kind of support are you looking for? I'm here to help guide you.";
  }
  
  // Positive responses
  if (lowerContent.includes('thank') || lowerContent.includes('better') || lowerContent.includes('good')) {
    return "I'm so glad to hear that! It's wonderful that you're feeling better. What's been helping you the most? Your progress is meaningful.";
  }
  
  // Greetings
  if (lowerContent.includes('hello') || lowerContent.includes('hi') || lowerContent.includes('hey')) {
    return "Hello! I'm Maya, your AI peer support facilitator. I'm glad you're here. This is a safe space where you can share whatever is on your mind. How are you feeling today?";
  }
  
  // Default supportive response
  return "Thank you for sharing that with me. I'm here to listen and support you through whatever you're experiencing. Could you tell me more about what's on your mind? What would be most helpful for you right now?";
}

export default router;