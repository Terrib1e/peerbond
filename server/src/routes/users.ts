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
const updateUserValidation = [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('recoveryGoals').optional().isArray().withMessage('Recovery goals must be an array'),
  body('wellnessGoals').optional().isArray().withMessage('Wellness goals must be an array'),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid experience level'),
  body('isPremium').optional().isBoolean().withMessage('isPremium must be a boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

const userIdValidation = [
  param('id').isUUID().withMessage('Invalid user ID format'),
];

// Get all users (admin only)
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

  const result = await dbService.getUsers(page, limit, filters);

  res.json({
    success: true,
    data: {
      users: result.users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
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

// Get user by ID
router.get('/:id', validateRequest(userIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  // Users can only view their own profile unless they're admin
  if (!isAdmin && userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const user = await dbService.getUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  // Remove password from response
  const { password, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
}));

// Update user
router.patch('/:id', validateRequest([...userIdValidation, ...updateUserValidation]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  // Users can only update their own profile unless they're admin
  if (!isAdmin && userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const user = await dbService.getUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  // Check if email is being changed and if it's already taken
  if (req.body.email && req.body.email !== user.email) {
    const existingUser = await dbService.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already in use',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Non-admin users cannot change certain fields
  if (!isAdmin) {
    delete req.body.isPremium;
    delete req.body.isActive;
    delete req.body.role;
  }

  const updatedUser = await dbService.updateUser(userId, req.body);

  // Log audit event
  await dbService.createAuditLog({
    userId: requestingUserId,
    action: 'user_update',
    resource: 'user',
    resourceId: userId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      updatedFields: Object.keys(req.body),
      isAdmin
    }
  });

  logger.info(`User updated: ${userId} by ${requestingUserId}`);

  // Remove password from response
  const { password, ...userWithoutPassword } = updatedUser;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
}));

// Delete user (admin only)
router.delete('/:id', requireAdmin, validateRequest(userIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;

  // Prevent admin from deleting themselves
  if (userId === requestingUserId) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete your own account',
      timestamp: new Date().toISOString()
    });
  }

  const user = await dbService.getUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  await dbService.deleteUser(userId);

  // Log audit event
  await dbService.createAuditLog({
    userId: requestingUserId,
    action: 'user_delete',
    resource: 'user',
    resourceId: userId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
    metadata: {
      deletedUserEmail: user.email
    }
  });

  logger.info(`User deleted: ${userId} by ${requestingUserId}`);

  res.json({
    success: true,
    message: 'User deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// Get user's groups
router.get('/:id/groups', validateRequest(userIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  // Users can only view their own groups unless they're admin
  if (!isAdmin && userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const groups = await dbService.getUserGroups(userId);

  res.json({
    success: true,
    data: {
      groups
    },
    timestamp: new Date().toISOString()
  });
}));

// Get user's activity
router.get('/:id/activity', validateRequest(userIdValidation), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  // Users can only view their own activity unless they're admin
  if (!isAdmin && userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const activity = await dbService.getUserActivity(userId, page, limit);

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

// Update user preferences
router.patch('/:id/preferences', validateRequest([
  ...userIdValidation,
  body('notifications').optional().isObject().withMessage('Notifications must be an object'),
  body('privacy').optional().isObject().withMessage('Privacy must be an object'),
  body('accessibility').optional().isObject().withMessage('Accessibility must be an object'),
]), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.params.id;
  const requestingUserId = req.user!.id;

  // Users can only update their own preferences
  if (userId !== requestingUserId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      timestamp: new Date().toISOString()
    });
  }

  const user = await dbService.getUserById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  const preferences = {
    ...user.preferences,
    ...req.body
  };

  const updatedUser = await dbService.updateUser(userId, { preferences });

  // Log audit event
  await dbService.createAuditLog({
    userId: requestingUserId,
    action: 'preferences_update',
    resource: 'user',
    resourceId: userId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
  });

  res.json({
    success: true,
    data: {
      preferences: updatedUser.preferences
    },
    timestamp: new Date().toISOString()
  });
}));

export default router;