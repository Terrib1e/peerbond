import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// Validation rules
const createGroupValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('type').isIn(['recovery', 'wellness', 'general']).withMessage('Invalid group type'),
  body('maxMembers').optional().isInt({ min: 2, max: 12 }).withMessage('Max members must be between 2 and 12'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

const updateGroupValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Group name must be between 1 and 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('maxMembers').optional().isInt({ min: 2, max: 12 }).withMessage('Max members must be between 2 and 12'),
  body('isPrivate').optional().isBoolean().withMessage('isPrivate must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

const groupIdValidation = [
  param('id').isUUID().withMessage('Invalid group ID format'),
];

// Get all groups
router.get('/', authenticateToken, validateRequest([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('type').optional().isIn(['recovery', 'wellness', 'general']).withMessage('Invalid group type'),
  query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Invalid status filter'),
  query('privacy').optional().isIn(['public', 'private', 'all']).withMessage('Invalid privacy filter'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string || '';
  const type = req.query.type as string;
  const status = req.query.status as string || 'active';
  const privacy = req.query.privacy as string || 'all';
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const filters = {
    search,
    type,
    status: status === 'all' ? undefined : status === 'active',
    privacy: privacy === 'all' ? undefined : privacy === 'public',
    userId: isAdmin ? undefined : userId, // Non-admin users only see their groups or public groups
  };

  const result = await dbService.getGroups(page, limit, filters);

  res.json({
    success: true,
    data: {
      groups: result.groups,
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

// Get groups available to current user (assigned + public)
router.get('/available', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const availableGroups = await dbService.getUserAvailableGroups(userId);

  res.json({
    success: true,
    data: {
      groups: availableGroups
    },
    timestamp: new Date().toISOString()
  });
}));

// Get groups assigned to current user
router.get('/assigned', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const assignedGroups = await dbService.getUserAssignedGroups(userId);

  res.json({
    success: true,
    data: {
      assignedGroups
    },
    timestamp: new Date().toISOString()
  });
}));

// Get group by ID
router.get('/:id', authenticateToken, validateRequest(groupIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if user has access to this group
  if (!isAdmin && group.isPrivate && !group.members.includes(userId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      group
    },
    timestamp: new Date().toISOString()
  });
}));

// Create group
router.post('/', authenticateToken, validateRequest(createGroupValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const groupData = {
    ...req.body,
    createdBy: userId,
    members: [userId], // Creator is automatically a member
    facilitators: isAdmin ? [userId] : [], // Admins are automatically facilitators
  };

  const group = await dbService.createGroup(groupData);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'group_create',
    resource: 'group',
    resourceId: group.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name,
      groupType: group.type
    }
  });

  logger.info(`Group created: ${group.id} by ${userId}`);

  res.status(201).json({
    success: true,
    data: {
      group
    },
    timestamp: new Date().toISOString()
  });
}));

// Update group
router.patch('/:id', authenticateToken, validateRequest([...groupIdValidation, ...updateGroupValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if user has permission to update this group
  if (!isAdmin && group.createdBy !== userId && !group.facilitators.includes(userId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  // Non-admin users cannot change certain fields
  if (!isAdmin) {
    delete req.body.isActive;
  }

  const updatedGroup = await dbService.updateGroup(groupId, req.body);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'group_update',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      updatedFields: Object.keys(req.body),
      isAdmin
    }
  });

  logger.info(`Group updated: ${groupId} by ${userId}`);

  res.json({
    success: true,
    data: {
      group: updatedGroup
    },
    timestamp: new Date().toISOString()
  });
}));

// Delete group (admin only)
router.delete('/:id', requireAdmin, validateRequest(groupIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.id;

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteGroup(groupId);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'group_delete',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name,
      memberCount: group.members.length
    }
  });

  logger.info(`Group deleted: ${groupId} by ${userId}`);

  res.json({
    success: true,
    message: 'Group deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// Join group
router.post('/:id/join', authenticateToken, validateRequest(groupIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.id;

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

  if (group.members.includes(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Already a member of this group',
      timestamp: new Date().toISOString()
    });
  }

  if (group.members.length >= group.maxMembers) {
    return res.status(400).json({
      success: false,
      error: 'Group is full',
      timestamp: new Date().toISOString()
    });
  }

  const updatedGroup = await dbService.addGroupMember(groupId, userId);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'group_join',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name
    }
  });

  logger.info(`User joined group: ${userId} joined ${groupId}`);

  res.json({
    success: true,
    data: {
      group: updatedGroup
    },
    timestamp: new Date().toISOString()
  });
}));

// Leave group
router.post('/:id/leave', authenticateToken, validateRequest(groupIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const userId = req.user!.id;

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  if (!group.members.includes(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Not a member of this group',
      timestamp: new Date().toISOString()
    });
  }

  // Prevent creator from leaving if they're the only facilitator
  if (group.createdBy === userId && group.facilitators.length === 1 && group.facilitators[0] === userId) {
    return res.status(400).json({
      success: false,
      error: 'Cannot leave group as the only facilitator. Transfer ownership first.',
      timestamp: new Date().toISOString()
    });
  }

  const updatedGroup = await dbService.removeGroupMember(groupId, userId);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'group_leave',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name
    }
  });

  logger.info(`User left group: ${userId} left ${groupId}`);

  res.json({
    success: true,
    data: {
      group: updatedGroup
    },
    timestamp: new Date().toISOString()
  });
}));

// Add facilitator (admin or group creator only)
router.post('/:id/facilitators', authenticateToken, validateRequest([
  ...groupIdValidation,
  body('userId').isUUID().withMessage('Invalid user ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const { userId: targetUserId } = req.body;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if user has permission to add facilitators
  if (!isAdmin && group.createdBy !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  if (!group.members.includes(targetUserId)) {
    return res.status(400).json({
      success: false,
      error: 'User must be a member of the group first',
      timestamp: new Date().toISOString()
    });
  }

  if (group.facilitators.includes(targetUserId)) {
    return res.status(400).json({
      success: false,
      error: 'User is already a facilitator',
      timestamp: new Date().toISOString()
    });
  }

  const updatedGroup = await dbService.addGroupFacilitator(groupId, targetUserId);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'facilitator_add',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name,
      targetUserId
    }
  });

  logger.info(`Facilitator added: ${targetUserId} to ${groupId} by ${userId}`);

  res.json({
    success: true,
    data: {
      group: updatedGroup
    },
    timestamp: new Date().toISOString()
  });
}));

// Remove facilitator (admin or group creator only)
router.delete('/:id/facilitators/:userId', authenticateToken, validateRequest([
  ...groupIdValidation,
  param('userId').isUUID().withMessage('Invalid user ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.id;
  const targetUserId = req.params.userId;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const group = await dbService.getGroupById(groupId);
  if (!group) {
    return res.status(404).json({
      success: false,
      error: 'Group not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if user has permission to remove facilitators
  if (!isAdmin && group.createdBy !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  if (!group.facilitators.includes(targetUserId)) {
    return res.status(400).json({
      success: false,
      error: 'User is not a facilitator',
      timestamp: new Date().toISOString()
    });
  }

  // Prevent removing the last facilitator
  if (group.facilitators.length === 1) {
    return res.status(400).json({
      success: false,
      error: 'Cannot remove the last facilitator',
      timestamp: new Date().toISOString()
    });
  }

  const updatedGroup = await dbService.removeGroupFacilitator(groupId, targetUserId);

  // Log audit event
  await dbService.createAuditLog({
    userId,
    action: 'facilitator_remove',
    resource: 'group',
    resourceId: groupId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupName: group.name,
      targetUserId
    }
  });

  logger.info(`Facilitator removed: ${targetUserId} from ${groupId} by ${userId}`);

  res.json({
    success: true,
    data: {
      group: updatedGroup
    },
    timestamp: new Date().toISOString()
  });
}));


export default router;