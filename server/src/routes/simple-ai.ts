import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Simple in-memory session storage
const sessions = new Map<string, {
  sessionId: string;
  memberId: string;
  messages: Array<{
    id: string;
    content: string;
    type: 'member' | 'ai';
    timestamp: Date;
  }>;
  startTime: Date;
}>();

/**
 * POST /api/simple-ai/session/start
 * Start a simple AI chat session
 */
router.post('/session/start',
  authenticateToken,
  [
    body('groupId').optional().isString(),
    body('memberProfile').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    console.log('[SimpleAI] Starting new session...');

    try {
      const memberId = req.member.id;
      const sessionId = `session_${Date.now()}_${uuidv4()}`;

      const session = {
        sessionId,
        memberId,
        messages: [],
        startTime: new Date()
      };

      sessions.set(sessionId, session);

      console.log(`[SimpleAI] ✅ Session ${sessionId} created for member ${memberId}`);

      res.json({
        success: true,
        data: {
          sessionId,
          welcomeMessage: "Hi! I'm Maya, your AI peer support facilitator. I'm here to help you connect with others and provide support. What brings you here today?",
          success: true
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[SimpleAI] Error starting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start AI session',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * POST /api/simple-ai/message
 * Send a message to the simple AI
 */
router.post('/message',
  authenticateToken,
  [
    body('content').notEmpty().withMessage('Message content is required'),
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('messageType').optional().isIn(['member', 'system'])
  ],
  validateRequest,
  async (req, res) => {
    console.log('[SimpleAI] Processing message...');

    try {
      const { content, sessionId, messageType = 'member' } = req.body;
      const memberId = req.member.id;

      console.log(`[SimpleAI] Message: "${content}" from member ${memberId} in session ${sessionId}`);

      // Get session
      const session = sessions.get(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
          timestamp: new Date().toISOString()
        });
      }

      if (session.memberId !== memberId) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized access to session',
          timestamp: new Date().toISOString()
        });
      }

      // Add member message
      const memberMessage = {
        id: `msg_${Date.now()}_member`,
        content,
        type: 'member' as const,
        timestamp: new Date()
      };
      session.messages.push(memberMessage);

      // Generate AI response based on content
      const aiResponse = generateAIResponse(content);

      // Add AI message
      const aiMessage = {
        id: `msg_${Date.now()}_ai`,
        content: aiResponse,
        type: 'ai' as const,
        timestamp: new Date()
      };
      session.messages.push(aiMessage);

      console.log(`[SimpleAI] ✅ Generated response: "${aiResponse}"`);

      res.json({
        success: true,
        data: {
          response: aiResponse,
          sessionId,
          agentUsed: ['SimpleAI'],
          confidence: 0.8,
          needsCrisisIntervention: checkForCrisis(content),
          suggestGroupMatching: checkForGroupRequest(content),
          metadata: {
            messageCount: session.messages.length,
            responseTime: new Date().toISOString()
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[SimpleAI] Error processing message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/simple-ai/health
 * Health check for simple AI
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      activeSessions: sessions.size
    }
  });
});

// Helper functions
function generateAIResponse(content: string): string {
  const lowerContent = content.toLowerCase();

  // Crisis keywords
  if (lowerContent.includes('suicide') || lowerContent.includes('kill myself') || lowerContent.includes('end it all')) {
    return `I'm very concerned about what you've shared. Your safety is the most important thing right now.

🚨 **Immediate Help Available:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Or call 911 for immediate emergency assistance

You don't have to go through this alone. There are people who want to help you right now. Would you like me to help you connect with professional support immediately?`;
  }

  // Moderate crisis
  if (lowerContent.includes('hopeless') || lowerContent.includes('can\'t go on') || lowerContent.includes('give up')) {
    return `I can hear how much pain you're in right now, and I want you to know that these feelings can change. You're reaching out, which shows tremendous strength.

**Support Resources:**
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• SAMHSA National Helpline: 1-800-662-4357

Would you like to talk about what's making you feel this hopeless? Sometimes sharing can help lighten the burden.`;
  }

  // Anxiety/depression responses
  if (lowerContent.includes('anxious') || lowerContent.includes('anxiety')) {
    return "I understand that anxiety can feel overwhelming. You're in a safe space here. What's been contributing to these feelings? I'm here to listen and support you through this.";
  }

  if (lowerContent.includes('depressed') || lowerContent.includes('depression') || lowerContent.includes('sad')) {
    return "I hear that you're going through a difficult time, and I want you to know that your feelings are completely valid. Depression can feel isolating, but you're not alone. What's been the hardest part for you recently?";
  }

  if (lowerContent.includes('stressed') || lowerContent.includes('overwhelmed')) {
    return "It sounds like you're carrying a lot right now. Stress can be really challenging to manage alone. What's been weighing on you the most? I'm here to help you work through it.";
  }

  if (lowerContent.includes('lonely') || lowerContent.includes('isolated') || lowerContent.includes('alone')) {
    return "Feeling isolated can be really painful. Connection is so important for our wellbeing. Tell me more about what's making you feel this way? You're not alone in this conversation.";
  }

  // Group/support requests
  if (lowerContent.includes('group') || lowerContent.includes('support') || lowerContent.includes('connect') || lowerContent.includes('others')) {
    return "Connecting with others who understand your experience can be incredibly healing. That's a wonderful step toward building your support network. What kind of group or community are you hoping to find? I can help guide you toward the right resources.";
  }

  // Positive responses
  if (lowerContent.includes('thank') || lowerContent.includes('better') || lowerContent.includes('good') || lowerContent.includes('helping')) {
    return "I'm so glad to hear that! It's wonderful that you're feeling better. What's been helping you the most? Your progress is meaningful and I'm proud of you for the work you're doing.";
  }

  // Greetings
  if (lowerContent.includes('hello') || lowerContent.includes('hi') || lowerContent.includes('hey')) {
    return "Hello! I'm Maya, and I'm so glad you're here. This is a safe space where you can share whatever is on your mind. How are you feeling today, and what would be most helpful for you right now?";
  }

  // Default supportive response
  return "Thank you for sharing that with me. I'm here to listen and support you through whatever you're experiencing. Could you tell me a bit more about what's on your mind today? What kind of support would be most helpful for you right now?";
}

function checkForCrisis(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const crisisKeywords = ['suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead', 'hopeless', 'can\'t go on', 'give up'];
  return crisisKeywords.some(keyword => lowerContent.includes(keyword));
}

function checkForGroupRequest(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const groupKeywords = ['group', 'connect', 'others', 'support group', 'community', 'peers', 'find people'];
  return groupKeywords.some(keyword => lowerContent.includes(keyword));
}

export default router;