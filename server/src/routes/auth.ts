import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { LoginRequest, RegisterRequest, Member } from '../types';
import { emailService } from '../services/emailService';

const router = Router();
const dbService = new DatabaseService();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const registerValidation = [
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['member', 'therapist', 'admin']).withMessage('Valid role is required'),
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
];

// Helper function to generate JWT token
const generateToken = (member: Member): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  return jwt.sign(
    {
      memberId: member.id,
      email: member.email
    },
    jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions
  );
};

// Register endpoint
router.post('/register', validateRequest(registerValidation), asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, role, recoveryGoals, wellnessGoals, experienceLevel }: RegisterRequest = req.body;

  // Check if member already exists
  const existingUser = await dbService.getMemberByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: 'User already exists with this email',
      timestamp: new Date().toISOString()
    });
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create member
  const newUser = await dbService.createMember({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: role || 'member',
    recoveryGoals: recoveryGoals || [],
    wellnessGoals: wellnessGoals || [],
    experienceLevel: experienceLevel || 'beginner'
  });

  // Generate token
  const token = generateToken(newUser);

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await dbService.createSession({
    memberId: newUser.id,
    token,
    expiresAt,
  });

  // Log audit event
  await dbService.createAuditLog({
    memberId: newUser.id,
    action: 'member_register',
    resource: 'member',
    resourceId: newUser.id,
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User registered: ${email}`);

  // Send welcome email
  await emailService.sendWelcomeEmail(email, firstName);

  // Remove password from response
  const { password: _, ...memberWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: {
      member: memberWithoutPassword,
      token,
      expiresAt
    },
    timestamp: new Date().toISOString()
  });
}));

// Login endpoint
router.post('/login', validateRequest(loginValidation), asyncHandler(async (req, res) => {
  const { email, password }: LoginRequest = req.body;

  // Find member
  const member = await dbService.getMemberByEmail(email);
  if (!member) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      timestamp: new Date().toISOString()
    });
  }

  // Check if member is active
  if (!member.isActive) {
    return res.status(401).json({
      success: false,
      error: 'Account is deactivated',
      timestamp: new Date().toISOString()
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, member.password!);
  if (!isPasswordValid) {
    // Log failed login attempt
    await dbService.createAuditLog({
      memberId: member.id,
      action: 'login_failed',
      resource: 'auth',
      ipAddress: req.ip,
      memberAgent: req.get('User-Agent') || 'unknown',
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      timestamp: new Date().toISOString()
    });
  }

  // Generate token
  const token = generateToken(member);

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await dbService.createSession({
    memberId: member.id,
    token,
    expiresAt,
  });

  // Update last active
  await dbService.updateMember(member.id, { lastActive: new Date() });

  // Log successful login
  await dbService.createAuditLog({
    memberId: member.id,
    action: 'login_success',
    resource: 'auth',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User logged in: ${email}`);

  // Remove password from response
  const { password: _, ...memberWithoutPassword } = member;

  res.json({
    success: true,
    data: {
      member: memberWithoutPassword,
      token,
      expiresAt
    },
    timestamp: new Date().toISOString()
  });
}));

// Get current member
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const member = await dbService.getMemberById(req.member!.id);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  // Remove password from response
  const { password: _, ...memberWithoutPassword } = member;

  res.json({
    success: true,
    data: {
      member: memberWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
}));

// Test email endpoint
router.post('/test-email', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const result = await emailService.sendTestEmail(email);

    res.json({
      success: result,
      message: result ? 'Test email sent successfully' : 'Email service not configured or failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}));

// Logout endpoint
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    // Delete session
    await dbService.deleteSessionByToken(token);
  }

  // Log logout
  await dbService.createAuditLog({
    memberId: req.member!.id,
    action: 'logout',
    resource: 'auth',
    ipAddress: req.ip,
    memberAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User logged out: ${req.member!.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
}));

// Refresh token endpoint
router.post('/refresh', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const member = await dbService.getMemberById(req.member!.id);
  if (!member) {
    return res.status(404).json({
      success: false,
      error: 'Member not found',
      timestamp: new Date().toISOString()
    });
  }

  // Generate new token
  const token = generateToken(member);

  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await dbService.createSession({
    memberId: member.id,
    token,
    expiresAt,
  });

  res.json({
    success: true,
    data: {
      token,
      expiresAt
    },
    timestamp: new Date().toISOString()
  });
}));

// Password reset validation
const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// Forgot password endpoint
router.post('/forgot-password', validateRequest(forgotPasswordValidation), asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    // Find member by email
    const member = await dbService.getMemberByEmail(email);
    if (!member) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.',
        timestamp: new Date().toISOString()
      });
    }

    // Generate reset token (6-character code for simplicity)
    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Save reset token to member
    await dbService.updateMember(member.id, {
      resetToken,
      resetTokenExpiry
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, resetToken);

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
      timestamp: new Date().toISOString()
    });
  }
}));

// Reset password endpoint
router.post('/reset-password', validateRequest(resetPasswordValidation), asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  try {
    // Find member with valid reset token
    const member = await dbService.client.member.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        timestamp: new Date().toISOString()
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await dbService.updateMember(member.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    logger.info(`Password reset successful for member ${member.id}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      timestamp: new Date().toISOString()
    });
  }
}));

// Verify reset token endpoint (optional - for checking token validity)
router.post('/verify-reset-token', validateRequest([
  body('token').notEmpty().withMessage('Reset token is required'),
]), asyncHandler(async (req, res) => {
  const { token } = req.body;

  try {
    const member = await dbService.client.member.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date()
        }
      }
    });

    if (!member) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid',
      data: {
        email: member.email // Return masked email for confirmation
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify reset token',
      timestamp: new Date().toISOString()
    });
  }
}));

// Test email endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-email', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Reinitialize email service to pick up new env vars
      emailService.reinitialize();

      const sent = await emailService.sendTestEmail(email);

      res.json({
        success: true,
        message: sent ? 'Test email sent successfully' : 'Email service not configured - check logs',
        emailSent: sent,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Test email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        timestamp: new Date().toISOString()
      });
    }
  }));
}

export default router;