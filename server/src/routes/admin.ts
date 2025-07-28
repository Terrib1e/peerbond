import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Get dashboard overview
router.get('/dashboard', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const analytics = await dbService.getAnalytics();
  
  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get system health
router.get('/health', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const health = {
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
    },
    database: 'healthy',
    timestamp: new Date().toISOString()
  };

  try {
    await dbService.healthCheck();
    health.database = 'healthy';
  } catch (error) {
    health.database = 'unhealthy';
  }

  res.json({
    success: true,
    data: health,
    timestamp: new Date().toISOString()
  });
}));

// Get audit logs
router.get('/audit-logs', validateRequest([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('userId').optional().isUUID().withMessage('Invalid user ID format'),
  query('action').optional().trim().isLength({ min: 1 }).withMessage('Action cannot be empty'),
  query('resource').optional().trim().isLength({ min: 1 }).withMessage('Resource cannot be empty'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const userId = req.query.userId as string;
  const action = req.query.action as string;
  const resource = req.query.resource as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const filters = {
    userId,
    action,
    resource,
    startDate,
    endDate,
  };

  const result = await dbService.getAuditLogs(page, limit, filters);

  res.json({
    success: true,
    data: {
      logs: result.logs,
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

// Get users with admin filtering
router.get('/users', validateRequest([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search cannot be empty'),
  query('role').optional().isIn(['admin', 'therapist', 'facilitator', 'member']).withMessage('Invalid role'),
  query('status').optional().isBoolean().withMessage('Status must be boolean'),
  query('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const role = req.query.role as string;
  const status = req.query.status ? req.query.status === 'true' : undefined;
  const experienceLevel = req.query.experienceLevel as string;

  const filters: any = {};
  if (search) {
    filters.search = search;
  }
  if (role) {
    filters.role = role;
  }
  if (status !== undefined) {
    filters.status = status;
  }
  if (experienceLevel) {
    filters.experienceLevel = experienceLevel;
  }

  const result = await dbService.getUsers(page, limit, filters);

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

// Delete a user
router.delete('/users/:id', validateRequest([
  param('id').isLength({ min: 1 }).withMessage('User ID is required'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const adminId = req.user!.id;

  try {
    // Prevent admin from deleting themselves
    if (userId === adminId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        timestamp: new Date().toISOString()
      });
    }

    // Check if user exists
    const user = await dbService.getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
    }

    // Delete the user
    await dbService.deleteUser(userId);

    // Log the deletion
    await dbService.createAuditLog({
      userId: adminId,
      action: 'user_deleted',
      resource: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
      metadata: { deletedUser: { id: userId, email: user.email, role: user.role } }
    });

    logger.info(`User ${userId} deleted by admin ${adminId}`);

    res.json({
      success: true,
      data: { message: 'User deleted successfully' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      timestamp: new Date().toISOString()
    });
  }
}));

// Get groups with admin filtering
router.get('/groups', validateRequest([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search cannot be empty'),
  query('type').optional().isIn(['recovery', 'wellness', 'general']).withMessage('Invalid group type'),
  query('status').optional().isBoolean().withMessage('Status must be boolean'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;
  const type = req.query.type as string;
  const status = req.query.status ? req.query.status === 'true' : undefined;

  const filters: any = {};
  if (search) {
    filters.search = search;
  }
  if (type) {
    filters.type = type;
  }
  if (status !== undefined) {
    filters.status = status;
  }

  const result = await dbService.getGroups(page, limit, filters);

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

// Get user statistics
router.get('/stats/users', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await dbService.getUserStats(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

// Get group statistics
router.get('/stats/groups', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await dbService.getGroupStats(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

// Get message statistics
router.get('/stats/messages', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await dbService.getMessageStats(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      stats
    },
    timestamp: new Date().toISOString()
  });
}));

// Bulk operations
router.post('/bulk/users/activate', validateRequest([
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isLength({ min: 1 }).withMessage('Each user ID must be a non-empty string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userIds } = req.body;
  const adminId = req.user!.id;

  const results = await Promise.allSettled(
    userIds.map((userId: string) => dbService.updateUser(userId, { isActive: true }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'bulk_user_activate',
    resource: 'user',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      userIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk user activation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: userIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

router.post('/bulk/users/deactivate', validateRequest([
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isLength({ min: 1 }).withMessage('Each user ID must be a non-empty string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userIds } = req.body;
  const adminId = req.user!.id;

  // Prevent admin from deactivating themselves
  if (userIds.includes(adminId)) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate your own account',
      timestamp: new Date().toISOString()
    });
  }

  const results = await Promise.allSettled(
    userIds.map((userId: string) => dbService.updateUser(userId, { isActive: false }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'bulk_user_deactivate',
    resource: 'user',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      userIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk user deactivation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: userIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

router.post('/bulk/groups/activate', validateRequest([
  body('groupIds').isArray({ min: 1 }).withMessage('Group IDs array is required'),
  body('groupIds.*').isUUID().withMessage('Invalid group ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { groupIds } = req.body;
  const adminId = req.user!.id;

  const results = await Promise.allSettled(
    groupIds.map((groupId: string) => dbService.updateGroup(groupId, { isActive: true }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'bulk_group_activate',
    resource: 'group',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk group activation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: groupIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

router.post('/bulk/groups/deactivate', validateRequest([
  body('groupIds').isArray({ min: 1 }).withMessage('Group IDs array is required'),
  body('groupIds.*').isUUID().withMessage('Invalid group ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { groupIds } = req.body;
  const adminId = req.user!.id;

  const results = await Promise.allSettled(
    groupIds.map((groupId: string) => dbService.updateGroup(groupId, { isActive: false }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'bulk_group_deactivate',
    resource: 'group',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      groupIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk group deactivation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: groupIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

// System configuration
router.get('/config', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = {
    app: {
      name: 'PeerBond',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
    features: {
      aiEnabled: process.env.AI_ENABLED === 'true',
      premiumEnabled: process.env.PREMIUM_ENABLED === 'true',
      analyticsEnabled: process.env.ANALYTICS_ENABLED === 'true',
    },
    limits: {
      maxGroupSize: parseInt(process.env.MAX_GROUP_SIZE || '12'),
      maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '2000'),
      rateLimit: parseInt(process.env.RATE_LIMIT || '100'),
    },
    security: {
      jwtExpiration: process.env.JWT_EXPIRES_IN || '7d',
      bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    }
  };

  res.json({
    success: true,
    data: {
      config
    },
    timestamp: new Date().toISOString()
  });
}));

// Update system configuration
router.patch('/config', validateRequest([
  body('features').optional().isObject().withMessage('Features must be an object'),
  body('limits').optional().isObject().withMessage('Limits must be an object'),
  body('security').optional().isObject().withMessage('Security must be an object'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const adminId = req.user!.id;
  const { features, limits, security } = req.body;

  // Note: In a real implementation, this would update environment variables
  // or a configuration database. For now, we'll just log the changes.
  
  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'config_update',
    resource: 'system',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      features,
      limits,
      security
    }
  });

  logger.info(`System configuration updated by ${adminId}`, { features, limits, security });

  res.json({
    success: true,
    message: 'Configuration updated successfully',
    timestamp: new Date().toISOString()
  });
}));

// Group Assignment Routes

// Get all group assignments
router.get('/group-assignments', validateRequest([
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('groupId').optional().isUUID().withMessage('Invalid group ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId, page = 1, limit = 50 } = req.query;
  
  const assignments = await dbService.getGroupAssignments({
    userId: userId as string,
    groupId: groupId as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });

  res.json({
    success: true,
    data: { assignments },
    timestamp: new Date().toISOString()
  });
}));

// Assign group to user
router.post('/group-assignments', validateRequest([
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId, notes } = req.body;
  const assignedBy = req.user!.id;

  // Check if assignment already exists
  const existingAssignment = await dbService.getGroupAssignment(userId, groupId);
  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      error: 'User is already assigned to this group',
      timestamp: new Date().toISOString()
    });
  }

  const assignment = await dbService.createGroupAssignment({
    userId,
    groupId,
    assignedBy,
    notes
  });

  // Log audit event
  await dbService.createAuditLog({
    userId: assignedBy,
    action: 'group_assignment_create',
    resource: 'group_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { userId, groupId, notes }
  });

  logger.info(`Group assignment created: User ${userId} assigned to group ${groupId} by ${assignedBy}`);

  res.status(201).json({
    success: true,
    data: { assignment },
    timestamp: new Date().toISOString()
  });
}));

// Remove group assignment
router.delete('/group-assignments/:userId/:groupId', validateRequest([
  param('userId').isUUID().withMessage('Invalid user ID'),
  param('groupId').isUUID().withMessage('Invalid group ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId, groupId } = req.params;
  const adminId = req.user!.id;

  const assignment = await dbService.getGroupAssignment(userId, groupId);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Group assignment not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteGroupAssignment(userId, groupId);

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'group_assignment_delete',
    resource: 'group_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { userId, groupId }
  });

  logger.info(`Group assignment deleted: User ${userId} unassigned from group ${groupId} by ${adminId}`);

  res.json({
    success: true,
    message: 'Group assignment removed successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get groups assigned to a specific user
router.get('/users/:userId/assigned-groups', validateRequest([
  param('userId').isUUID().withMessage('Invalid user ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  const assignedGroups = await dbService.getUserAssignedGroups(userId);

  res.json({
    success: true,
    data: { assignedGroups },
    timestamp: new Date().toISOString()
  });
}));

// Bulk assign groups to multiple users
router.post('/group-assignments/bulk', validateRequest([
  body('userIds').isArray({ min: 1 }).withMessage('User IDs array is required'),
  body('userIds.*').isLength({ min: 1 }).withMessage('Each user ID must be a non-empty string'),
  body('groupIds').isArray({ min: 1 }).withMessage('Group IDs array is required'),
  body('groupIds.*').isLength({ min: 1 }).withMessage('Each group ID must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userIds, groupIds, notes } = req.body;
  const assignedBy = req.user!.id;

  const assignments = [];
  const errors = [];

  for (const userId of userIds) {
    for (const groupId of groupIds) {
      try {
        // Check if assignment already exists
        const existingAssignment = await dbService.getGroupAssignment(userId, groupId);
        if (!existingAssignment) {
          const assignment = await dbService.createGroupAssignment({
            userId,
            groupId,
            assignedBy,
            notes
          });
          assignments.push(assignment);
        }
      } catch (error) {
        errors.push({ userId, groupId, error: (error as Error).message });
      }
    }
  }

  // Log audit event
  await dbService.createAuditLog({
    userId: assignedBy,
    action: 'bulk_group_assignment',
    resource: 'group_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { 
      userIds, 
      groupIds, 
      notes,
      successCount: assignments.length,
      errorCount: errors.length
    }
  });

  logger.info(`Bulk group assignment: ${assignments.length} assignments created, ${errors.length} errors by ${assignedBy}`);

  res.json({
    success: true,
    data: {
      assignments,
      errors,
      successCount: assignments.length,
      errorCount: errors.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Therapist-Client Assignment Routes

// Get all therapist-client assignments
router.get('/therapist-assignments', validateRequest([
  query('therapistId').optional().isLength({ min: 1 }).withMessage('Invalid therapist ID'),
  query('clientId').optional().isLength({ min: 1 }).withMessage('Invalid client ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { therapistId, clientId, page = 1, limit = 50 } = req.query;
  
  const assignments = await dbService.getTherapistClientAssignments({
    therapistId: therapistId as string,
    clientId: clientId as string,
    page: parseInt(page as string),
    limit: parseInt(limit as string)
  });

  res.json({
    success: true,
    data: { assignments },
    timestamp: new Date().toISOString()
  });
}));

// Assign client to therapist
router.post('/therapist-assignments', validateRequest([
  body('therapistId').isLength({ min: 1 }).withMessage('Valid therapist ID is required'),
  body('clientId').isLength({ min: 1 }).withMessage('Valid client ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { therapistId, clientId, notes } = req.body;
  const createdBy = req.user!.id;

  // Verify therapist has therapist role
  const therapist = await dbService.getUserById(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    return res.status(400).json({
      success: false,
      error: 'Invalid therapist ID or user is not a therapist',
      timestamp: new Date().toISOString()
    });
  }

  // Check if assignment already exists
  const existingAssignment = await dbService.getTherapistClientAssignment(therapistId, clientId);
  if (existingAssignment && existingAssignment.isActive) {
    return res.status(400).json({
      success: false,
      error: 'Client is already assigned to this therapist',
      timestamp: new Date().toISOString()
    });
  }

  const assignment = await dbService.createTherapistClientAssignment({
    therapistId,
    clientId,
    notes,
    createdBy
  });

  // Log audit event
  await dbService.createAuditLog({
    userId: createdBy,
    action: 'therapist_client_assignment_create',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { therapistId, clientId, notes }
  });

  logger.info(`Therapist-client assignment created: Client ${clientId} assigned to therapist ${therapistId} by ${createdBy}`);

  res.status(201).json({
    success: true,
    data: { assignment },
    timestamp: new Date().toISOString()
  });
}));

// Remove therapist-client assignment
router.delete('/therapist-assignments/:therapistId/:clientId', validateRequest([
  param('therapistId').isLength({ min: 1 }).withMessage('Invalid therapist ID'),
  param('clientId').isLength({ min: 1 }).withMessage('Invalid client ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { therapistId, clientId } = req.params;
  const adminId = req.user!.id;

  const assignment = await dbService.getTherapistClientAssignment(therapistId, clientId);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Therapist-client assignment not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteTherapistClientAssignment(therapistId, clientId);

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'therapist_client_assignment_delete',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { therapistId, clientId }
  });

  logger.info(`Therapist-client assignment deleted: Client ${clientId} unassigned from therapist ${therapistId} by ${adminId}`);

  res.json({
    success: true,
    message: 'Therapist-client assignment removed successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get all therapists with their client count
router.get('/therapists', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const therapists = await dbService.getTherapistsWithClientCount();

  res.json({
    success: true,
    data: { therapists },
    timestamp: new Date().toISOString()
  });
}));

// Bulk assign clients to therapist
router.post('/therapist-assignments/bulk', validateRequest([
  body('therapistId').isLength({ min: 1 }).withMessage('Valid therapist ID is required'),
  body('clientIds').isArray({ min: 1 }).withMessage('Client IDs array is required'),
  body('clientIds.*').isLength({ min: 1 }).withMessage('Each client ID must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { therapistId, clientIds, notes } = req.body;
  const createdBy = req.user!.id;

  // Verify therapist
  const therapist = await dbService.getUserById(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    return res.status(400).json({
      success: false,
      error: 'Invalid therapist ID or user is not a therapist',
      timestamp: new Date().toISOString()
    });
  }

  const assignments = [];
  const errors = [];

  for (const clientId of clientIds) {
    try {
      // Check if assignment already exists
      const existingAssignment = await dbService.getTherapistClientAssignment(therapistId, clientId);
      if (!existingAssignment || !existingAssignment.isActive) {
        const assignment = await dbService.createTherapistClientAssignment({
          therapistId,
          clientId,
          notes,
          createdBy
        });
        assignments.push(assignment);
      }
    } catch (error) {
      errors.push({ clientId, error: (error as Error).message });
    }
  }

  // Log audit event
  await dbService.createAuditLog({
    userId: createdBy,
    action: 'bulk_therapist_client_assignment',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: { 
      therapistId, 
      clientIds, 
      notes,
      successCount: assignments.length,
      errorCount: errors.length
    }
  });

  logger.info(`Bulk therapist-client assignment: ${assignments.length} assignments created, ${errors.length} errors by ${createdBy}`);

  res.json({
    success: true,
    data: {
      assignments,
      errors,
      successCount: assignments.length,
      errorCount: errors.length
    },
    timestamp: new Date().toISOString()
  });
}));

// Export data
router.get('/export/:type', validateRequest([
  param('type').isIn(['users', 'groups', 'messages', 'audit-logs']).withMessage('Invalid export type'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Invalid format'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const type = req.params.type;
  const format = req.query.format as string || 'json';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const adminId = req.user!.id;

  // Log audit event
  await dbService.createAuditLog({
    userId: adminId,
    action: 'data_export',
    resource: 'system',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      type,
      format,
      startDate,
      endDate
    }
  });

  // Note: In a real implementation, this would generate and return actual export data
  // For now, we'll return a placeholder response
  
  res.json({
    success: true,
    message: `Export request for ${type} data has been queued`,
    data: {
      exportId: `export_${Date.now()}`,
      type,
      format,
      status: 'queued'
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;