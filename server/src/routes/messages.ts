import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { GeminiService } from '../services/geminiService';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Import WebSocket service to broadcast Maya's responses
import { WebSocketService } from '../services/websocket';

// Import the new ProductionOrchestrator for enhanced Maya responses
import { ProductionOrchestratorService as ProductionOrchestrator } from '../orchestration/orchestrator';

const router = Router();
const dbService = new DatabaseService();
const geminiService = new GeminiService();

// Initialize ProductionOrchestrator for enhanced Maya responses
const productionOrchestrator = new ProductionOrchestrator();

// Validation rules
const sendMessageValidation = [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
  body('type').optional().isIn(['text', 'member', 'system', 'ai', 'ai_facilitator']).withMessage('Invalid message type'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
];

const groupIdValidation = [
  param('groupId').isUUID().withMessage('Invalid group ID format'),
];

const messageIdValidation = [
  param('messageId').isUUID().withMessage('Invalid message ID format'),
];

// Get messages for a group
router.get('/:groupId', validateRequest([
  ...groupIdValidation,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('before').optional().isISO8601().withMessage('Before must be a valid ISO 8601 date'),
  query('after').optional().isISO8601().withMessage('After must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const before = req.query.before as string;
  const after = req.query.after as string;

  const filters = {
    before: before ? new Date(before) : undefined,
    after: after ? new Date(after) : undefined,
  };

  const result = await dbService.getMessages(groupId, page, limit, filters);

  res.json({
    success: true,
    data: {
      messages: result.messages,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// Send message to a group
router.post('/:groupId', validateRequest([...groupIdValidation, ...sendMessageValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!group.isActive) {
    return res.status(400).json({
      success: false,
      error: 'Group is not active',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const messageData = {
    groupId,
    memberId,
    content: req.body.content,
    type: req.body.type || 'text'
  };

  const message = await dbService.createMessage(messageData);

  // Log audit event
  await dbService.createAuditLog({
    memberId,
    action: 'message_send',
    resource: 'message',
    resourceId: message.id,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupId,
      messageType: message.type,
      contentLength: message.content.length
    }
  });

  logger.info(`Message sent: ${message.id} in group ${groupId} by ${memberId}`);

  // Trigger AI facilitator response (async, don't wait for completion)
  triggerAIFacilitatorResponse(message, group).catch(error => {
    logger.error('Error triggering AI facilitator response:', error);
  });

  res.status(201).json({
    success: true,
    data: {
      message
    },
    timestamp: new Date().toISOString()
  });
}));

// Get specific message
router.get('/:groupId/:messageId', validateRequest([...groupIdValidation, ...messageIdValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const message = await dbService.getMessageById(messageId);
  if (!message || message.groupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Message not found',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      message
    },
    timestamp: new Date().toISOString()
  });
}));

// Edit message
router.patch('/:groupId/:messageId', validateRequest([
  ...groupIdValidation,
  ...messageIdValidation,
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const message = await dbService.getMessageById(messageId);
  if (!message || message.groupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Message not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if member can edit this message
  if (!isAdmin && message.memberId !== memberId) {
    return res.status(403).json({
      success: false,
      error: 'Can only edit your own messages',
      timestamp: new Date().toISOString()
    });
  }

  // Check if message is too old to edit (15 minutes)
  const messageAge = Date.now() - message.createdAt.getTime();
  const maxEditAge = 15 * 60 * 1000; // 15 minutes in milliseconds

  if (!isAdmin && messageAge > maxEditAge) {
    return res.status(400).json({
      success: false,
      error: 'Message is too old to edit',
      timestamp: new Date().toISOString()
    });
  }

  const updatedMessage = await dbService.updateMessage(messageId, {
    content: req.body.content,
    isEdited: true,
    editedAt: new Date(),
  });

  // Log audit event
  await dbService.createAuditLog({
    memberId,
    action: 'message_edit',
    resource: 'message',
    resourceId: messageId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupId,
      originalContent: message.content,
      newContent: req.body.content
    }
  });

  logger.info(`Message edited: ${messageId} in group ${groupId} by ${memberId}`);

  res.json({
    success: true,
    data: {
      message: updatedMessage
    },
    timestamp: new Date().toISOString()
  });
}));

// Delete message
router.delete('/:groupId/:messageId', validateRequest([...groupIdValidation, ...messageIdValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const message = await dbService.getMessageById(messageId);
  if (!message || message.groupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Message not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if member can delete this message
  if (!isAdmin && message.memberId !== memberId && !group.facilitators.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Can only delete your own messages or as a facilitator',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteMessage(messageId);

  // Log audit event
  await dbService.createAuditLog({
    memberId,
    action: 'message_delete',
    resource: 'message',
    resourceId: messageId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupId,
      deletedContent: message.content,
      originalMemberId: message.memberId
    }
  });

  logger.info(`Message deleted: ${messageId} in group ${groupId} by ${memberId}`);

  res.json({
    success: true,
    message: 'Message deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// Add reaction to message
router.post('/:groupId/:messageId/reactions', validateRequest([
  ...groupIdValidation,
  ...messageIdValidation,
  body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji must be between 1 and 10 characters'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  const memberId = req.member!.id;
  const { emoji } = req.body;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const message = await dbService.getMessageById(messageId);
  if (!message || message.groupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Message not found',
      timestamp: new Date().toISOString()
    });
  }

  const updatedMessage = await dbService.addMessageReaction(messageId, memberId, emoji);

  // Log audit event
  await dbService.createAuditLog({
    memberId,
    action: 'reaction_add',
    resource: 'message',
    resourceId: messageId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupId,
      emoji
    }
  });

  res.json({
    success: true,
    data: {
      message: updatedMessage
    },
    timestamp: new Date().toISOString()
  });
}));

// Remove reaction from message
router.delete('/:groupId/:messageId/reactions', validateRequest([
  ...groupIdValidation,
  ...messageIdValidation,
  body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji must be between 1 and 10 characters'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const messageId = req.params.messageId;
  const memberId = req.member!.id;
  const { emoji } = req.body;
  const isAdmin = req.member!.role === 'admin';

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!isAdmin && !group.members.includes(memberId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const message = await dbService.getMessageById(messageId);
  if (!message || message.groupId !== groupId) {
    return res.status(404).json({
      success: false,
      error: 'Message not found',
      timestamp: new Date().toISOString()
    });
  }

  const updatedMessage = await dbService.removeMessageReaction(messageId, memberId, emoji);

  // Log audit event
  await dbService.createAuditLog({
    memberId,
    action: 'reaction_remove',
    resource: 'message',
    resourceId: messageId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupId,
      emoji
    }
  });

  res.json({
    success: true,
    data: {
      message: updatedMessage
    },
    timestamp: new Date().toISOString()
  });
}));

// Manual AI facilitator trigger for therapists/admins
router.post('/:groupId/trigger-maya', validateRequest([...groupIdValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const memberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';
  const isTherapist = req.member!.role === 'therapist';

  // Only admins and therapists can manually trigger Maya
  if (!isAdmin && !isTherapist) {
    return res.status(403).json({
      success: false,
      error: 'Only therapists and admins can manually trigger Maya',
      timestamp: new Date().toISOString()
    });
  }

  // Check if member has access to this group
  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!group.isActive) {
    return res.status(400).json({
      success: false,
      error: 'Group is not active',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Get recent messages for context
    const recentMessages = await dbService.getRecentMessages(group.id, 10);
    const activeMembers = await dbService.getGroupMembers(group.id);

    // Create a synthetic "therapist request" message for Maya to respond to
    const contextMessage = {
      id: `manual-trigger-${Date.now()}`,
      groupId,
      memberId: 'therapist-trigger',
      authorId: 'therapist-trigger',
      content: 'Therapist has requested Maya to provide therapeutic facilitation for the current conversation.',
      type: 'system' as const,
      createdAt: new Date(),
      timestamp: new Date(),
      isEdited: false,
      reactions: {} as Record<string, string[]>
    };

    // Generate enhanced AI response using ProductionOrchestrator
    // Start session for this therapist-triggered interaction
    const sessionResult = await productionOrchestrator.startSession(
      contextMessage.memberId,
      group.id,
      {
        context: 'therapist_trigger',
        recentMessages,
        activeMembers,
        groupType: group.type,
        triggeredBy: req.member!.role
      }
    );

    if (!sessionResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create orchestration session',
        timestamp: new Date().toISOString()
      });
    }

    const orchestrationResult = await productionOrchestrator.processMessage({
      memberId: contextMessage.memberId,
      sessionId: sessionResult.sessionId,
      content: contextMessage.content,
      messageType: 'system'
    });

    if (!orchestrationResult || !orchestrationResult.response) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate Maya response via ProductionOrchestrator',
        timestamp: new Date().toISOString()
      });
    }

    // Create AI message in database
    const aiMessage = await dbService.createMessage({
      groupId: group.id,
      memberId: 'ai-facilitator',
      content: orchestrationResult.response,
      type: 'ai_facilitator'
    });

    // Log audit event with orchestration details
    await dbService.createAuditLog({
      memberId,
      action: 'manual_maya_trigger',
      resource: 'message',
      resourceId: aiMessage.id,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: {
        groupId,
        triggeredBy: req.member!.role,
        agentsUsed: orchestrationResult.agentUsed,
        toolResults: orchestrationResult.toolResults,
        confidence: orchestrationResult.confidence,
        needsCrisisIntervention: orchestrationResult.needsCrisisIntervention
      }
    });

    logger.info(`Maya manually triggered by ${req.member!.role} ${memberId} in group ${groupId}`);

    // Broadcast WebSocket event
    setTimeout(() => {
      const wsService = WebSocketService.getInstance();
      if (wsService) {
        wsService.broadcastToGroup(group.id, 'new_message', {
          ...aiMessage,
          member: {
            id: 'ai-facilitator',
            firstName: 'Maya',
            lastName: '(AI Facilitator)',
            profilePicture: null,
            email: 'maya@peerbond.ai',
            role: 'ai_facilitator'
          }
        });
      }
    }, 500);

    res.status(201).json({
      success: true,
      data: {
        message: aiMessage,
        trigger: 'manual'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error manually triggering Maya:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger Maya',
      timestamp: new Date().toISOString()
    });
  }
}));

// AI Facilitator trigger function
async function triggerAIFacilitatorResponse(memberMessage: any, group: any) {
  try {
    logger.info(`🤖 Checking AI trigger for group ${group.id}, type: ${group.type}, message: "${memberMessage.content}"`);

    // Trigger AI for recovery, support, wellness, and general groups
    const aiEnabledTypes = ['recovery', 'support', 'wellness', 'general'];
    const shouldTriggerForType = aiEnabledTypes.some(type => group.type.includes(type));

    if (!shouldTriggerForType) {
      logger.info(`❌ AI not enabled for group type: ${group.type}`);
      return;
    }

    logger.info(`✅ AI enabled for group type: ${group.type}`);

    // Get recent messages and members for context
    const recentMessages = await dbService.getRecentMessages(group.id, 10);
    const activeMembers = await dbService.getGroupMembers(group.id);

    // Check if AI should respond based on message content
    const shouldRespond = await shouldAIRespond(recentMessages, memberMessage, group);

    logger.info(`🎯 Should AI respond? ${shouldRespond} for message: "${memberMessage.content}"`);

    if (!shouldRespond) {
      logger.info(`❌ AI decided not to respond based on conversation flow`);
      return;
    }

    logger.info(`✅ AI will respond to message: "${memberMessage.content}"`);

    // Generate enhanced AI response using ProductionOrchestrator
    // Start session for this group interaction
    const sessionResult = await productionOrchestrator.startSession(
      memberMessage.memberId,
      group.id,
      {
        context: 'group_chat',
        recentMessages,
        activeMembers,
        groupType: group.type
      }
    );

    if (!sessionResult.success) {
      logger.error(`❌ Failed to create orchestration session`);
      return;
    }

    const orchestrationResult = await productionOrchestrator.processMessage({
      memberId: memberMessage.memberId,
      sessionId: sessionResult.sessionId,
      content: memberMessage.content,
      messageType: 'member'
    });

    if (!orchestrationResult || !orchestrationResult.response) {
      logger.error(`❌ Failed to generate AI response via ProductionOrchestrator`);
      return;
    }

    logger.info(`✅ Enhanced AI response generated: "${orchestrationResult.response}"`);

    // Create AI message in database
    const aiMessage = await dbService.createMessage({
      groupId: group.id,
      memberId: 'ai-facilitator',
      content: orchestrationResult.response,
      type: 'ai_facilitator'
    });

    logger.info(`💾 AI message saved to database with ID: ${aiMessage.id}`);

    // Log audit event with orchestration details
    await dbService.createAuditLog({
      memberId: 'ai-facilitator',
      action: 'ai_facilitator_response',
      resource: 'message',
      resourceId: aiMessage.id,
      ipAddress: 'system',
      memberAgent: 'maya-orchestrator',
      metadata: {
        groupId: group.id,
        triggerMessage: memberMessage.content,
        agentsUsed: orchestrationResult.agentUsed,
        toolResults: orchestrationResult.toolResults,
        confidence: orchestrationResult.confidence,
        needsCrisisIntervention: orchestrationResult.needsCrisisIntervention
      }
    });

    // Broadcast WebSocket event to notify all group members (match WebSocket version format)
    setTimeout(() => {
      const wsService = WebSocketService.getInstance();
      if (wsService) {
        wsService.broadcastToGroup(group.id, 'new_message', {
          ...aiMessage,
          member: {
            id: 'ai-facilitator',
            firstName: 'Maya',
            lastName: '(AI Facilitator)',
            profilePicture: null,
            email: 'maya@peerbond.ai',
            role: 'ai_facilitator'
          }
        });

        logger.info(`📡 AI message broadcasted via WebSocket to group: ${group.id}`);
      }
    }, 1000 + Math.random() * 2000); // 1-3 second delay for natural feel

  } catch (error) {
    logger.error('Error triggering AI facilitator response:', error);
  }
}

// AI response decision logic - Maya as a selective therapeutic tool
async function shouldAIRespond(recentMessages: any[], memberMessage: any, group: any): Promise<boolean> {
  logger.info(`🔍 Checking if Maya should respond to: "${memberMessage.content}"`);

  // Get AI messages in recent conversation
  const aiMessages = recentMessages.filter(m => m.type === 'ai_facilitator');
  const memberMessages = recentMessages.filter(m => m.type === 'member' || m.type === 'text');

  logger.info(`📊 Recent messages: ${memberMessages.length} member messages, ${aiMessages.length} AI messages`);

  // Strong frequency control - Maya should be much less chatty
  if (aiMessages.length >= 1 && memberMessages.length < 5) {
    logger.info(`⏸️ Recent AI activity detected (${aiMessages.length} AI vs ${memberMessages.length} member) - Maya staying quiet`);
    return false;
  }

  // Don't respond if Maya spoke in the last 3 messages
  const lastThreeMessages = recentMessages.slice(-3);
  if (lastThreeMessages.some(m => m.type === 'ai_facilitator')) {
    logger.info(`⏸️ Maya spoke recently in last 3 messages - staying quiet`);
    return false;
  }

  const messageContent = memberMessage.content.toLowerCase();

  // Check for crisis language using Gemini (if available)
  try {
    const isCrisis = await geminiService.checkCrisisLanguage(memberMessage.content);
    if (isCrisis) {
      logger.info(`🚨 Crisis language detected - Maya responding immediately`);
      return true; // Always respond to crisis indicators
    }
  } catch (error) {
    logger.warn('Crisis detection unavailable, continuing with other checks');
  }

  // Direct mentions of Maya or explicit facilitator requests
  const directMentions = ['maya', '@maya', 'facilitator'];
  const explicitRequests = ['need facilitator', 'facilitator help', 'maya help', 'ai help'];

  const hasDirectMention = directMentions.some(mention => messageContent.includes(mention));
  const hasExplicitRequest = explicitRequests.some(request => messageContent.includes(request));

  if (hasDirectMention || hasExplicitRequest) {
    logger.info(`🎯 Direct Maya mention/request detected - responding`);
    return true;
  }

  // Severe crisis/distress indicators - high priority
  const severeCrisisTriggers = [
    'want to die', 'kill myself', 'end it all', 'no point living', 'suicide',
    'can\'t go on', 'giving up completely', 'no hope left', 'completely lost'
  ];

  const hasSevereCrisis = severeCrisisTriggers.some(trigger => messageContent.includes(trigger));
  if (hasSevereCrisis) {
    logger.info(`🚨 Severe crisis language detected - Maya intervening`);
    return true;
  }

  // High-impact therapeutic moments - but only occasionally
  const therapeuticMoments = [
    'relapsed today', 'had a relapse', 'used again', 'broke my sobriety',
    'hitting rock bottom', 'lost everything', 'family left me', 'fired from job',
    'overdosed', 'hospitalized', 'in crisis'
  ];

  const hasTherapeuticMoment = therapeuticMoments.some(moment => messageContent.includes(moment));
  if (hasTherapeuticMoment) {
    // Only 60% chance even for therapeutic moments
    const shouldRespond = Math.random() > 0.4;
    logger.info(`🏥 Therapeutic moment detected - Maya responding with 60% chance: ${shouldRespond}`);
    return shouldRespond;
  }

  // Major milestones worth celebrating - but selectively
  const majorMilestones = [
    'sober for', 'clean for', 'months sober', 'years sober', 'one year', 'six months',
    'graduated', 'got the job', 'moved out', 'new apartment', 'engaged', 'married'
  ];

  const hasMajorMilestone = majorMilestones.some(milestone => messageContent.includes(milestone));
  if (hasMajorMilestone) {
    // Only 40% chance to celebrate milestones
    const shouldRespond = Math.random() > 0.6;
    logger.info(`🎉 Major milestone detected - Maya celebrating with 40% chance: ${shouldRespond}`);
    return shouldRespond;
  }

  // Questions seeking guidance - but not every question
  const guidanceQuestions = [
    'what should i do', 'how do i', 'any advice', 'need guidance', 'not sure how to',
    'struggling with', 'don\'t know what', 'help me figure out'
  ];

  const hasGuidanceQuestion = guidanceQuestions.some(question => messageContent.includes(question));
  if (hasGuidanceQuestion) {
    // Only 25% chance to answer guidance questions
    const shouldRespond = Math.random() > 0.75;
    logger.info(`❓ Guidance question detected - Maya responding with 25% chance: ${shouldRespond}`);
    return shouldRespond;
  }

  // Very long silence (30+ minutes) - check-in opportunity
  const lastMessage = recentMessages[recentMessages.length - 2];
  if (lastMessage && (Date.now() - new Date(lastMessage.createdAt).getTime()) > 30 * 60 * 1000) {
    // Only 20% chance to break long silence
    const shouldRespond = Math.random() > 0.8;
    logger.info(`🕐 Long silence (30+ min) detected - Maya checking in with 20% chance: ${shouldRespond}`);
    return shouldRespond;
  }

  // New member introduction - welcome them
  if (messageContent.includes('new here') || messageContent.includes('first time') || messageContent.includes('just joined')) {
    // 50% chance to welcome new members
    const shouldRespond = Math.random() > 0.5;
    logger.info(`👋 New member detected - Maya welcoming with 50% chance: ${shouldRespond}`);
    return shouldRespond;
  }

  // Default: Maya stays quiet for general conversation
  logger.info(`💬 General conversation - Maya staying quiet (tool-like behavior)`);
  return false;
}

export default router;