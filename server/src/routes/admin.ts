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
  body('userIds.*').isUUID().withMessage('Invalid user ID format'),
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
  body('userIds.*').isUUID().withMessage('Invalid user ID format'),
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