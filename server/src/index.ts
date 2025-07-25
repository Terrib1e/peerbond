import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes and middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { authenticateToken } from './middleware/auth';

// Import route handlers
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import groupRoutes from './routes/groups';
import messageRoutes from './routes/messages';
import adminRoutes from './routes/admin';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import testRoutes from './routes/test';
import orchestrationRoutes from './routes/production-orchestration';
import simpleAiRoutes from './routes/simple-ai';
import basicChatRoutes from './routes/basic-chat';
import toolRoutes from './routes/tools';

// Import services
import { DatabaseService } from './services/database';
import { WebSocketService } from './services/websocket';
import { logger } from './utils/logger';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Initialize services
const dbService = new DatabaseService();
const wsService = new WebSocketService(server, dbService);

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Rate limiting - more permissive for development
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute (reduced from 15 minutes)
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'), // 10,000 requests per minute for development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and in development
    return req.path === '/health' || process.env.NODE_ENV === 'development';
  }
});

// Only apply rate limiting in production
// Skip rate limiting entirely in development or when NODE_ENV is not set
if (process.env.NODE_ENV === 'production') {
  app.use('/api', limiter);
} else {
  // In development, log that rate limiting is disabled
  console.log('Rate limiting disabled for development');
}

// CORS configuration - more permissive for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check against allowed origins
    const allowedOrigins = [
      process.env.CORS_ORIGIN || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:5173", // Vite default
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173"
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Response-Time'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Debug all requests BEFORE routes
app.use((req, res, next) => {
  console.log(`[Server] Incoming request: ${req.method} ${req.originalUrl}`);

  // Special debug for orchestration routes
  if (req.originalUrl.includes('/api/orchestration')) {
    console.log(`[Server] 🔍 Orchestration route detected: ${req.originalUrl}`);
    console.log(`[Server] 🔍 Request headers:`, req.headers);
  }

  next();
});

// Handle preflight requests globally
app.options('*', (req, res) => {
  res.status(200).end();
});

// Health check endpoint (before auth)
app.use('/health', healthRoutes);

// Register main orchestration route
console.log('[Server] Registering orchestration routes...');
try {
  app.use('/api/production-orchestration', orchestrationRoutes);
  console.log('[Server] ✅ Orchestration routes registered at /api/production-orchestration');
} catch (error) {
  console.error('[Server] ❌ Error registering orchestration routes:', error);
}

// Register simple AI route (working fallback)
console.log('[Server] Registering simple AI routes...');
try {
  app.use('/api/simple-ai', simpleAiRoutes);
  console.log('[Server] ✅ Simple AI routes registered at /api/simple-ai');
} catch (error) {
  console.error('[Server] ❌ Error registering simple AI routes:', error);
}

// Register basic chat route (no auth, works immediately)
console.log('[Server] Registering basic chat routes...');
try {
  app.use('/api/basic-chat', basicChatRoutes);
  console.log('[Server] ✅ Basic chat routes registered at /api/basic-chat');
} catch (error) {
  console.error('[Server] ❌ Error registering basic chat routes:', error);
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/groups', authenticateToken, groupRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/test', authenticateToken, testRoutes);
console.log('[Server] Registering tools routes...');
app.use('/api/tools', authenticateToken, toolRoutes);
console.log('[Server] ✅ Tools routes registered at /api/tools');

// Orchestration route already registered early - this was the duplicate registration


// 404 handler
app.use('*', (req, res) => {
  console.log(`[Server] 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await dbService.initialize();
    logger.info('Database initialized successfully');

    // WebSocket service is already initialized
    logger.info('WebSocket service initialized successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`CORS Origin: ${process.env.CORS_ORIGIN}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');

      server.close(() => {
        logger.info('HTTP server closed');
      });

      await dbService.disconnect();
      logger.info('Database connection closed');

      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');

      server.close(() => {
        logger.info('HTTP server closed');
      });

      await dbService.disconnect();
      logger.info('Database connection closed');

      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app, server, io };