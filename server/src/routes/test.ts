
import { Router } from 'express';
import { DatabaseService } from '../services/database';
import { GeminiService } from '../services/geminiService';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();
const geminiService = new GeminiService();

// Test endpoint to manually trig
// ger AI response
router.post('/ai-response/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { content = "I'd like some facilitator guidance and support." } = req.body;

    logger.info(`🧪 Manual AI response test for group ${groupId} with message: "${content}"`);

    // Get group info
    const group = await dbService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    logger.info(`📋 Group found: ${group.name}, type: ${group.type}`);

    // Get recent messages and users
    const recentMessages = await dbService.getRecentMessages(groupId, 10);
    const activeUsers = await dbService.getGroupMembers(groupId);

    logger.info(`📨 Found ${recentMessages.length} recent messages, ${activeUsers.length} active users`);

    // Create a test message
    const testMessage = {
      id: 'test-' + Date.now(),
      groupId,
      userId: 'test-user',
      authorId: 'test-user', // Add required authorId property
      content,
      type: 'user' as const,
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      reactions: {},
      isEdited: false
    };

    // Generate AI response using Gemini
    logger.info(`🤖 Generating AI response...`);
    const aiResponse = await geminiService.generateFacilitatorResponse(
      testMessage,
      recentMessages,
      group,
      activeUsers
    );

    if (!aiResponse) {
      logger.error(`❌ Failed to generate AI response`);
      return res.status(500).json({ error: 'Failed to generate AI response' });
    }

    logger.info(`✅ AI response generated: "${aiResponse.message}"`);

    // Create AI message in database
    const aiMessage = await dbService.createMessage({
      groupId,
      userId: 'ai-facilitator',
      content: aiResponse.message,
      type: 'ai_facilitator'
    });

    logger.info(`💾 AI message saved to database with ID: ${aiMessage.id}`);

    res.json({
      success: true,
      testMessage,
      aiResponse,
      aiMessage,
      debug: {
        groupType: group.type,
        recentMessagesCount: recentMessages.length,
        activeUsersCount: activeUsers.length
      }
    });

  } catch (error) {
    logger.error('❌ Test AI response error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: (error as Error).message
    });
  }
});

export default router;