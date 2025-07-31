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
  query('memberId').optional().isUUID().withMessage('Invalid member ID format'),
  query('action').optional().trim().isLength({ min: 1 }).withMessage('Action cannot be empty'),
  query('resource').optional().trim().isLength({ min: 1 }).withMessage('Resource cannot be empty'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const memberId = req.query.memberId as string;
  const action = req.query.action as string;
  const resource = req.query.resource as string;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const filters = {
    memberId,
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

// Get members with admin filtering
router.get('/members', validateRequest([
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

  const result = await dbService.getMembers(page, limit, filters);

  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

// Delete a member
router.delete('/members/:id', validateRequest([
  param('id').isLength({ min: 1 }).withMessage('Member ID is required'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const adminId = req.member!.id;

  try {
    // Prevent admin from deleting themselves
    if (memberId === adminId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        timestamp: new Date().toISOString()
      });
    }

    // Check if member exists
    const member = await dbService.getMemberById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Delete the member
    await dbService.deleteMember(memberId);

    // Log the deletion
    await dbService.createAuditLog({
      memberId: adminId,
      action: 'member_deleted',
      resource: 'member',
      resourceId: memberId,
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
      metadata: { deletedUser: { id: memberId, email: member.email, role: member.role } }
    });

    logger.info(`Member ${memberId} deleted by admin ${adminId}`);

    res.json({
      success: true,
      data: { message: 'Member deleted successfully' },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete member',
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

// Get member statistics
router.get('/stats/members', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await dbService.getMemberStats(period, startDate, endDate);

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
router.post('/bulk/members/activate', validateRequest([
  body('memberIds').isArray({ min: 1 }).withMessage('Member IDs array is required'),
  body('memberIds.*').isLength({ min: 1 }).withMessage('Each member ID must be a non-empty string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberIds } = req.body;
  const adminId = req.member!.id;

  const results = await Promise.allSettled(
    memberIds.map((memberId: string) => dbService.updateMember(memberId, { isActive: true }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'bulk_member_activate',
    resource: 'member',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      memberIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk member activation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: memberIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

router.post('/bulk/members/deactivate', validateRequest([
  body('memberIds').isArray({ min: 1 }).withMessage('Member IDs array is required'),
  body('memberIds.*').isLength({ min: 1 }).withMessage('Each member ID must be a non-empty string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberIds } = req.body;
  const adminId = req.member!.id;

  // Prevent admin from deactivating themselves
  if (memberIds.includes(adminId)) {
    return res.status(400).json({
      success: false,
      error: 'Cannot deactivate your own account',
      timestamp: new Date().toISOString()
    });
  }

  const results = await Promise.allSettled(
    memberIds.map((memberId: string) => dbService.updateMember(memberId, { isActive: false }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'bulk_member_deactivate',
    resource: 'member',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      memberIds,
      succeeded,
      failed
    }
  });

  logger.info(`Bulk member deactivation: ${succeeded} succeeded, ${failed} failed by ${adminId}`);

  res.json({
    success: true,
    data: {
      succeeded,
      failed,
      total: memberIds.length
    },
    timestamp: new Date().toISOString()
  });
}));

router.post('/bulk/groups/activate', validateRequest([
  body('groupIds').isArray({ min: 1 }).withMessage('Group IDs array is required'),
  body('groupIds.*').isUUID().withMessage('Invalid group ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { groupIds } = req.body;
  const adminId = req.member!.id;

  const results = await Promise.allSettled(
    groupIds.map((groupId: string) => dbService.updateGroup(groupId, { isActive: true }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'bulk_group_activate',
    resource: 'group',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  const adminId = req.member!.id;

  const results = await Promise.allSettled(
    groupIds.map((groupId: string) => dbService.updateGroup(groupId, { isActive: false }))
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'bulk_group_deactivate',
    resource: 'group',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  const adminId = req.member!.id;
  const { features, limits, security } = req.body;

  // Note: In a real implementation, this would update environment variables
  // or a configuration database. For now, we'll just log the changes.

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'config_update',
    resource: 'system',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  query('memberId').optional().isUUID().withMessage('Invalid member ID'),
  query('groupId').optional().isUUID().withMessage('Invalid group ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId, page = 1, limit = 50 } = req.query;

  const assignments = await dbService.getGroupAssignments({
    memberId: memberId as string,
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

// Assign group to member
router.post('/group-assignments', validateRequest([
  body('memberId').isUUID().withMessage('Valid member ID is required'),
  body('groupId').isUUID().withMessage('Valid group ID is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId, notes } = req.body;
  const assignedBy = req.member!.id;

  // Check if assignment already exists
  const existingAssignment = await dbService.getGroupAssignment(memberId, groupId);
  if (existingAssignment) {
    return res.status(400).json({
      success: false,
      error: 'Member is already assigned to this group',
      timestamp: new Date().toISOString()
    });
  }

  const assignment = await dbService.createGroupAssignment({
    memberId,
    groupId,
    assignedBy,
    notes
  });

  // Log audit event
  await dbService.createAuditLog({
    memberId: assignedBy,
    action: 'group_assignment_create',
    resource: 'group_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: { memberId, groupId, notes }
  });

  logger.info(`Group assignment created: Member ${memberId} assigned to group ${groupId} by ${assignedBy}`);

  res.status(201).json({
    success: true,
    data: { assignment },
    timestamp: new Date().toISOString()
  });
}));

// Remove group assignment
router.delete('/group-assignments/:memberId/:groupId', validateRequest([
  param('memberId').isUUID().withMessage('Invalid member ID'),
  param('groupId').isUUID().withMessage('Invalid group ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId, groupId } = req.params;
  const adminId = req.member!.id;

  const assignment = await dbService.getGroupAssignment(memberId, groupId);
  if (!assignment) {
    return res.status(404).json({
      success: false,
      error: 'Group assignment not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteGroupAssignment(memberId, groupId);

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'group_assignment_delete',
    resource: 'group_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: { memberId, groupId }
  });

  logger.info(`Group assignment deleted: Member ${memberId} unassigned from group ${groupId} by ${adminId}`);

  res.json({
    success: true,
    message: 'Group assignment removed successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get groups assigned to a specific member
router.get('/members/:memberId/assigned-groups', validateRequest([
  param('memberId').isUUID().withMessage('Invalid member ID'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberId } = req.params;

  const assignedGroups = await dbService.getMemberAssignedGroups(memberId);

  res.json({
    success: true,
    data: { assignedGroups },
    timestamp: new Date().toISOString()
  });
}));

// Bulk assign groups to multiple members
router.post('/group-assignments/bulk', validateRequest([
  body('memberIds').isArray({ min: 1 }).withMessage('Member IDs array is required'),
  body('memberIds.*').isLength({ min: 1 }).withMessage('Each member ID must be a non-empty string'),
  body('groupIds').isArray({ min: 1 }).withMessage('Group IDs array is required'),
  body('groupIds.*').isLength({ min: 1 }).withMessage('Each group ID must be a non-empty string'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { memberIds, groupIds, notes } = req.body;
  const assignedBy = req.member!.id;

  const assignments = [];
  const errors = [];

  for (const memberId of memberIds) {
    for (const groupId of groupIds) {
      try {
        // Check if assignment already exists
        const existingAssignment = await dbService.getGroupAssignment(memberId, groupId);
        if (!existingAssignment) {
          const assignment = await dbService.createGroupAssignment({
            memberId,
            groupId,
            assignedBy,
            notes
          });
          assignments.push(assignment);
        }
      } catch (error) {
        errors.push({ memberId, groupId, error: (error as Error).message });
      }
    }
  }

  // Log audit event
  await dbService.createAuditLog({
    memberId: assignedBy,
    action: 'bulk_group_assignment',
    resource: 'group_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      memberIds,
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
  const createdBy = req.member!.id;

  // Verify therapist has therapist role
  const therapist = await dbService.getMemberById(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    return res.status(400).json({
      success: false,
      error: 'Invalid therapist ID or member is not a therapist',
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
    memberId: createdBy,
    action: 'therapist_client_assignment_create',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  const adminId = req.member!.id;

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
    memberId: adminId,
    action: 'therapist_client_assignment_delete',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  const createdBy = req.member!.id;

  // Verify therapist
  const therapist = await dbService.getMemberById(therapistId);
  if (!therapist || therapist.role !== 'therapist') {
    return res.status(400).json({
      success: false,
      error: 'Invalid therapist ID or member is not a therapist',
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
    memberId: createdBy,
    action: 'bulk_therapist_client_assignment',
    resource: 'therapist_client_assignment',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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
  param('type').isIn(['members', 'groups', 'messages', 'audit-logs']).withMessage('Invalid export type'),
  query('format').optional().isIn(['json', 'csv']).withMessage('Invalid format'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const type = req.params.type;
  const format = req.query.format as string || 'json';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const adminId = req.member!.id;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'data_export',
    resource: 'system',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
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