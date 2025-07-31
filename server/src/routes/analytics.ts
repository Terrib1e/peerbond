import { Router } from 'express';
import { query } from 'express-validator';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const dbService = new DatabaseService();

// Get member analytics (admin only)
router.get('/members', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getMemberAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get group analytics (admin only)
router.get('/groups', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getGroupAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get message analytics (admin only)
router.get('/messages', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getMessageAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get engagement analytics (admin only)
router.get('/engagement', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getEngagementAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get member activity analytics (members can see their own, admins can see all)
router.get('/activity', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('memberId').optional().isUUID().withMessage('Invalid member ID format'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const targetMemberId = req.query.memberId as string;
  const requestingMemberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Members can only see their own activity unless they're admin
  let memberId = requestingMemberId;
  if (targetMemberId) {
    if (!isAdmin && targetMemberId !== requestingMemberId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date().toISOString()
      });
    }
    memberId = targetMemberId;
  }

  const analytics = await dbService.getMemberActivityAnalytics(memberId, period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get group-specific analytics (group members and admins can access)
router.get('/groups/:groupId', validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const groupId = req.params.groupId;
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
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

  const analytics = await dbService.getGroupSpecificAnalytics(groupId, period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get real-time analytics (admin only)
router.get('/realtime', requireAdmin, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const analytics = await dbService.getRealTimeAnalytics();

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get retention analytics (admin only)
router.get('/retention', requireAdmin, validateRequest([
  query('cohortPeriod').optional().isIn(['day', 'week', 'month']).withMessage('Invalid cohort period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const cohortPeriod = req.query.cohortPeriod as string || 'week';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getRetentionAnalytics(cohortPeriod, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get funnel analytics (admin only)
router.get('/funnel', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getFunnelAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get AI analytics (admin only)
router.get('/ai', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getAIAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Get premium analytics (admin only)
router.get('/premium', requireAdmin, validateRequest([
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const analytics = await dbService.getPremiumAnalytics(period, startDate, endDate);

  res.json({
    success: true,
    data: {
      analytics
    },
    timestamp: new Date().toISOString()
  });
}));

// Export analytics data (admin only)
router.get('/export', requireAdmin, validateRequest([
  query('type').isIn(['members', 'groups', 'messages', 'engagement', 'retention', 'funnel', 'ai', 'premium']).withMessage('Invalid export type'),
  query('format').optional().isIn(['json', 'csv', 'xlsx']).withMessage('Invalid format'),
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const type = req.query.type as string;
  const format = req.query.format as string || 'json';
  const period = req.query.period as string || 'month';
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  const adminId = req.member!.id;

  // Log audit event
  await dbService.createAuditLog({
    memberId: adminId,
    action: 'analytics_export',
    resource: 'analytics',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      type,
      format,
      period,
      startDate,
      endDate
    }
  });

  logger.info(`Analytics export requested: ${type} in ${format} format by ${adminId}`);

  // Note: In a real implementation, this would generate and return actual export data
  // For now, we'll return a placeholder response

  res.json({
    success: true,
    message: `Analytics export for ${type} data has been queued`,
    data: {
      exportId: `analytics_export_${Date.now()}`,
      type,
      format,
      period,
      status: 'queued',
      estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;