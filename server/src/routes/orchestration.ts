import express from 'express';
import { ProductionOrchestratorService } from '../orchestration/orchestrator';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const orchestratorService = new ProductionOrchestratorService();

// Diagnostic endpoints removed - issue resolved!

// Rate limiting for orchestration endpoints
const orchestrationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many orchestration requests, please try again later.',
  },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Allow more frequent message sending
  message: {
    error: 'Too many messages sent, please slow down.',
  },
});

// All diagnostic endpoints removed - orchestration is now working perfectly!

/**
 * POST /api/orchestration/session/start
 * Start a new conversation session
 */
router.post('/session/start',
  authenticateToken,
  orchestrationLimiter,
  validateRequest([
    body('groupId').optional().isString().withMessage('GroupId must be a string'),
    body('memberProfile').optional().isObject().withMessage('MemberProfile must be an object')
  ]),
  async (req, res) => {
    console.log('[ProductionOrchestration] 🚀 Session start endpoint hit');
    const startTime = Date.now();

    try {
      console.log('[ProductionOrchestration] 📝 Extracting request data...');
      const { groupId, memberProfile } = req.body;
      console.log('[ProductionOrchestration] Request body:', { groupId, memberProfile });

      console.log('[ProductionOrchestration] 👤 Getting member from request...');
      const memberId = req.member.id;
      console.log(`[ProductionOrchestration] Member ID: ${memberId}`);

      console.log(`[ProductionOrchestration] 🔄 Calling orchestratorService.startSession...`);
      const result = await orchestratorService.startSession(memberId, groupId, memberProfile);
      console.log('[ProductionOrchestration] ✅ Got result from orchestratorService:', result);

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error starting session:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to start conversation session',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * POST /api/orchestration/message
 * Process a message through the orchestration system
 */
router.post('/message',
  authenticateToken,
  messageLimiter,
  validateRequest([
    body('content')
      .notEmpty()
      .withMessage('Message content is required')
      .isLength({ max: 4000 })
      .withMessage('Message content too long (max 4000 characters)'),
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .matches(/^session_\d+_[a-f0-9\-]{36}$/)
      .withMessage('Invalid session ID format'),
    body('messageType')
      .optional()
      .isIn(['member', 'system'])
      .withMessage('MessageType must be member or system')
  ]),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { content, sessionId, messageType = 'member' } = req.body;
      const memberId = req.member.id;

      console.log(`[ProductionOrchestration] Processing message for session ${sessionId}`);

      const result = await orchestratorService.processMessage({
        memberId,
        sessionId,
        content,
        messageType
      });

      const duration = Date.now() - startTime;

      // Log metrics for monitoring
      console.log(`[ProductionOrchestration] Message processed in ${duration}ms with confidence ${result.confidence}`);
      console.log(`[ProductionOrchestration] AGENTS USED:`, {
        agentUsed: result.agentUsed,
        agentUsedType: typeof result.agentUsed,
        agentUsedLength: Array.isArray(result.agentUsed) ? result.agentUsed.length : 'not array',
        agentUsedStringified: JSON.stringify(result.agentUsed)
      });

      res.json({
        success: result.success,
        data: {
          response: result.response,
          sessionId,
          agentUsed: result.agentUsed,
          confidence: result.confidence,
          needsCrisisIntervention: result.needsCrisisIntervention,
          suggestGroupMatching: result.suggestGroupMatching,
          metadata: result.metadata
        },
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration,
          confidence: result.confidence,
          agents_used: result.agentUsed.length
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error processing message:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * GET /api/orchestration/session/:sessionId/analytics
 * Get session analytics and metrics
 */
router.get('/session/:sessionId/analytics',
  authenticateToken,
  orchestrationLimiter,
  validateRequest([
    param('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .matches(/^session_\d+_[a-f0-9\-]{36}$/)
      .withMessage('Invalid session ID format')
  ]),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { sessionId } = req.params;

      console.log(`[ProductionOrchestration] Getting analytics for session ${sessionId}`);

      const result = await orchestratorService.getSessionAnalytics(sessionId);

      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error getting analytics:', error);

      res.status(404).json({
        success: false,
        error: 'Failed to get session analytics',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * POST /api/orchestration/session/:sessionId/end
 * End a conversation session
 */
router.post('/session/:sessionId/end',
  authenticateToken,
  orchestrationLimiter,
  validateRequest([
    param('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .matches(/^session_\d+_[a-f0-9\-]{36}$/)
      .withMessage('Invalid session ID format')
  ]),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { sessionId } = req.params;

      console.log(`[ProductionOrchestration] Ending session ${sessionId}`);

      const result = await orchestratorService.endSession(sessionId);

      const duration = Date.now() - startTime;

      res.json({
        success: result.success,
        data: result,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error ending session:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to end session',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * GET /api/orchestration/health
 * System health check with detailed metrics
 */
router.get('/health',
  async (req, res) => {
    const startTime = Date.now();

    try {
      const healthStatus = orchestratorService.getHealthStatus();
      const duration = Date.now() - startTime;

      const responseData = {
        status: healthStatus.status,
        timestamp: new Date().toISOString(),
        version: healthStatus.version,
        system: {
          uptime: healthStatus.uptime,
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        },
        orchestration: {
          activeSessions: healthStatus.activeSessions,
          maxSessions: 10000,
          utilizationPercent: (healthStatus.activeSessions / 10000) * 100
        },
        performance: {
          healthCheckDuration_ms: duration
        }
      };

      // Set appropriate status code based on health
      const statusCode = healthStatus.status === 'healthy' ? 200 :
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status !== 'unhealthy',
        data: responseData
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Health check failed:', error);

      res.status(503).json({
        success: false,
        error: 'Health check failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * GET /api/orchestration/agents
 * List all available agents and their tools
 */
router.get('/agents',
  async (req, res) => {
    const startTime = Date.now();

    try {
      const agentsAndTools = orchestratorService.getAvailableAgentsAndTools();
      const duration = Date.now() - startTime;

      res.json({
        success: true,
        data: agentsAndTools,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error getting agents:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to get available agents and tools',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * POST /api/orchestration/agent/call
 * Call a specific agent directly with a message
 */
router.post('/agent/call',
  authenticateToken,
  messageLimiter,
  validateRequest([
    body('agentId')
      .notEmpty()
      .withMessage('Agent ID is required')
      .isIn(['ai-router', 'sentiment', 'crisis', 'facilitator', 'matching', 'insight', 'chat', 'tracker', 'action-items', 'analytics', 'voice', 'orchestration', 'personalization', 'safety', 'knowledge', 'context'])
      .withMessage('Invalid agent ID'),
    body('message')
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 4000 })
      .withMessage('Message too long (max 4000 characters)'),
    body('sessionId')
      .notEmpty()
      .withMessage('Session ID is required')
      .matches(/^session_\d+_[a-f0-9\-]{36}$/)
      .withMessage('Invalid session ID format'),
    body('toolName')
      .optional()
      .isString()
      .withMessage('Tool name must be a string')
  ]),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { agentId, message, sessionId, toolName } = req.body;
      const memberId = req.member.id;

      console.log(`[ProductionOrchestration] Direct agent call: ${agentId} for session ${sessionId}`);

      const result = await orchestratorService.callAgentDirectly(
        agentId,
        message,
        sessionId,
        memberId,
        toolName
      );

      const duration = Date.now() - startTime;

      res.json({
        success: result.success,
        data: {
          response: result.response,
          agentUsed: result.agentUsed,
          toolsUsed: result.toolsUsed,
          confidence: result.confidence,
          metadata: result.metadata
        },
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration,
          confidence: result.confidence
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      console.error('[ProductionOrchestration] Error in direct agent call:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to call agent directly',
        message: error.message,
        timestamp: new Date().toISOString(),
        performance: {
          duration_ms: duration
        }
      });
    }
  }
);

/**
 * GET /api/orchestration/metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics',
  async (req, res) => {
    try {
      const healthStatus = orchestratorService.getHealthStatus();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Prometheus format metrics
      const metrics = `
# HELP peerbond_orchestration_active_sessions Number of active orchestration sessions
# TYPE peerbond_orchestration_active_sessions gauge
peerbond_orchestration_active_sessions ${healthStatus.activeSessions}

# HELP peerbond_orchestration_uptime_seconds System uptime in seconds
# TYPE peerbond_orchestration_uptime_seconds counter
peerbond_orchestration_uptime_seconds ${healthStatus.uptime}

# HELP peerbond_memory_usage_bytes Memory usage in bytes
# TYPE peerbond_memory_usage_bytes gauge
peerbond_memory_usage_bytes{type="rss"} ${memoryUsage.rss}
peerbond_memory_usage_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
peerbond_memory_usage_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
peerbond_memory_usage_bytes{type="external"} ${memoryUsage.external}

# HELP peerbond_cpu_usage_microseconds CPU usage in microseconds
# TYPE peerbond_cpu_usage_microseconds counter
peerbond_cpu_usage_microseconds{type="user"} ${cpuUsage.user}
peerbond_cpu_usage_microseconds{type="system"} ${cpuUsage.system}

# HELP peerbond_orchestration_status System health status (0=unhealthy, 1=degraded, 2=healthy)
# TYPE peerbond_orchestration_status gauge
peerbond_orchestration_status ${healthStatus.status === 'healthy' ? 2 : healthStatus.status === 'degraded' ? 1 : 0}
`.trim();

      res.set('Content-Type', 'text/plain');
      res.send(metrics);

    } catch (error) {
      console.error('[ProductionOrchestration] Metrics endpoint failed:', error);
      res.status(500).send('# Metrics unavailable\n');
    }
  }
);

export default router;