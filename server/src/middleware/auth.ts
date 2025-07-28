import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/database';
import { logger } from '../utils/logger';

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin' | 'therapist';
  };
}

const dbService = new DatabaseService();

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        timestamp: new Date().toISOString()
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        timestamp: new Date().toISOString()
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Get user from database
    const user = await dbService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found',
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

    // Update last active timestamp
    await dbService.updateUser(user.id, { lastActive: new Date() });

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        timestamp: new Date().toISOString()
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    const user = await dbService.getUserById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // If optional auth fails, continue without user
    next();
  }

  // requireRole
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};