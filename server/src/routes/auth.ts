import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { LoginRequest, RegisterRequest, User } from '../types';

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
  body('experienceLevel').optional().isIn(['beginner', 'intermediate', 'advanced']),
];

// Helper function to generate JWT token
const generateToken = (user: User): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable not set');
  }

  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    jwtSecret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
    } as jwt.SignOptions
  );
};

// Register endpoint
router.post('/register', validateRequest(registerValidation), asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, recoveryGoals, wellnessGoals, experienceLevel }: RegisterRequest = req.body;

  // Check if user already exists
  const existingUser = await dbService.getUserByEmail(email);
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

  // Create user
  const newUser = await dbService.createUser({
    firstName,
    lastName,
    email,
    password: hashedPassword,
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
    userId: newUser.id,
    token,
    expiresAt,
  });

  // Log audit event
  await dbService.createAuditLog({
    userId: newUser.id,
    action: 'user_register',
    resource: 'user',
    resourceId: newUser.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User registered: ${email}`);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    success: true,
    data: {
      user: userWithoutPassword,
      token,
      expiresAt
    },
    timestamp: new Date().toISOString()
  });
}));

// Login endpoint
router.post('/login', validateRequest(loginValidation), asyncHandler(async (req, res) => {
  const { email, password }: LoginRequest = req.body;

  // Find user
  const user = await dbService.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      timestamp: new Date().toISOString()
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      error: 'Account is deactivated',
      timestamp: new Date().toISOString()
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password!);
  if (!isPasswordValid) {
    // Log failed login attempt
    await dbService.createAuditLog({
      userId: user.id,
      action: 'login_failed',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid credentials',
      timestamp: new Date().toISOString()
    });
  }

  // Generate token
  const token = generateToken(user);

  // Create session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await dbService.createSession({
    userId: user.id,
    token,
    expiresAt,
  });

  // Update last active
  await dbService.updateUser(user.id, { lastActive: new Date() });

  // Log successful login
  await dbService.createAuditLog({
    userId: user.id,
    action: 'login_success',
    resource: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User logged in: ${email}`);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword,
      token,
      expiresAt
    },
    timestamp: new Date().toISOString()
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await dbService.getUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    },
    timestamp: new Date().toISOString()
  });
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
    userId: req.user!.id,
    action: 'logout',
    resource: 'auth',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent') || 'unknown',
  });

  logger.info(`User logged out: ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
}));

// Refresh token endpoint
router.post('/refresh', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await dbService.getUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found',
      timestamp: new Date().toISOString()
    });
  }

  // Generate new token
  const token = generateToken(user);

  // Create new session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await dbService.createSession({
    userId: user.id,
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

export default router;