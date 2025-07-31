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
const updateMemberValidation = [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('recoveryGoals').optional().isArray().withMessage('Recovery goals must be an array'),
  body('wellnessGoals').optional().isArray().withMessage('Wellness goals must be an array'),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level'),
  body('isPremium').optional().isBoolean().withMessage('isPremium must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const memberIdValidation = [
  param('id').isUUID().withMessage('Invalid member ID format'),
];

// Get all members (admin only)
router.get('/', requireAdmin, validateRequest([
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isLength({ min: 1 }).withMessage('Search query cannot be empty'),
  query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Invalid status filter'),
  query('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level filter'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string || '';
  const status = req.query.status as string || 'all';
  const experienceLevel = req.query.experienceLevel as string;

  const filters = {
    search,
    status: status === 'all' ? undefined : status === 'active',
    experienceLevel,
  };

  const result = await dbService.getMembers(page, limit, filters);

  res.json({
    success: true,
    data: {
      members: result.members.map(member => {
        const { password, ...memberWithoutPassword } = member;
        return memberWithoutPassword;
      }),
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

// Get member by ID
router.get('/:id', validateRequest(memberIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Members can only view their own profile unless they're admin
  if (!isAdmin && memberId !== requestingMemberId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const member = await dbService.getMemberById(memberId);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  // Remove password from response
  const { password, ...memberWithoutPassword } = member;

  res.json({
    success: true,
    data: {
      member: memberWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
}));

// Update member
router.patch('/:id', validateRequest([...memberIdValidation, ...updateMemberValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Members can only update their own profile unless they're admin
  if (!isAdmin && memberId !== requestingMemberId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const member = await dbService.getMemberById(memberId);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if email is being changed and if it's already taken
  if (req.body.email && req.body.email !== member.email) {
    const existingMember = await dbService.getMemberByEmail(req.body.email);
    if (existingMember) {
      return res.status(409).json({
        success: false,
        error: 'Email already in use',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Non-admin members cannot change certain fields
  if (!isAdmin) {
    delete req.body.isPremium;
    delete req.body.isActive;
    delete req.body.role;
  }

  const updatedMember = await dbService.updateMember(memberId, req.body);

  // Log audit event
  await dbService.createAuditLog({
    memberId: requestingMemberId,
    action: 'member_update',
    resource: 'member',
    resourceId: memberId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      updatedFields: Object.keys(req.body),
      isAdmin
    }
  });

  logger.info(`Member updated: ${memberId} by ${requestingMemberId}`);

  // Remove password from response
  const { password, ...memberWithoutPassword } = updatedMember;

  res.json({
    success: true,
    data: {
      member: memberWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
}));

// Delete member (admin only)
router.delete('/:id', requireAdmin, validateRequest(memberIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;

  // Prevent admin from deleting themselves
  if (memberId === requestingMemberId) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account',
      timestamp: new Date().toISOString()
    });
  }

  const member = await dbService.getMemberById(memberId);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteMember(memberId);

  // Log audit event
  await dbService.createAuditLog({
    memberId: requestingMemberId,
    action: 'member_delete',
    resource: 'member',
    resourceId: memberId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      deletedMemberEmail: member.email
    }
  });

  logger.info(`Member deleted: ${memberId} by ${requestingMemberId}`);

  res.json({
    success: true,
    message: 'Member deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get member's groups
router.get('/:id/groups', validateRequest(memberIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Members can only view their own groups unless they're admin
  if (!isAdmin && memberId !== requestingMemberId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const groups = await dbService.getMemberGroups(memberId);

  res.json({
    success: true,
    data: {
      groups
    },
    timestamp: new Date().toISOString()
  });
}));

// Get member's activity
router.get('/:id/activity', validateRequest(memberIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;
  const isAdmin = req.member!.role === 'admin';

  // Members can only view their own activity unless they're admin
  if (!isAdmin && memberId !== requestingMemberId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const activity = await dbService.getMemberActivity(memberId, page, limit);

  res.json({
    success: true,
    data: {
      activity: activity.logs,
      pagination: {
        page,
        limit,
        total: activity.total,
        pages: Math.ceil(activity.total / limit)
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// Update member preferences
router.patch('/:id/preferences', validateRequest([
  ...memberIdValidation,
  body('notifications').optional().isObject().withMessage('Notifications must be an object'),
  body('privacy').optional().isObject().withMessage('Privacy must be an object'),
  body('accessibility').optional().isObject().withMessage('Accessibility must be an object'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const memberId = req.params.id;
  const requestingMemberId = req.member!.id;

  // Members can only update their own preferences
  if (memberId !== requestingMemberId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const member = await dbService.getMemberById(memberId);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  const preferences = {
    ...member.preferences,
    ...req.body
  };

  const updatedMember = await dbService.updateMember(memberId, { preferences });

  // Log audit event
  await dbService.createAuditLog({
    memberId: requestingMemberId,
    action: 'preferences_update',
    resource: 'member',
    resourceId: memberId,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
  });

  res.json({
    success: true,
    data: {
      preferences: updatedMember.preferences
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;