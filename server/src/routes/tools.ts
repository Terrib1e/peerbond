/**
 * Tools API - Testing and management endpoints for the tool system
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param } from 'express-validator';
import ToolExecutor from '../tools/executor';
import { AGENT_TOOLS } from '../tools/schemas';

const router = express.Router();
const toolExecutor = new ToolExecutor();

/**
 * GET /api/tools/available/:agent
 * Get available tools for a specific agent
 */
router.get('/available/:agent', 
  authenticateToken,
  validateRequest([
    param('agent').isIn(['ai-router', 'facilitator', 'sentiment', 'crisis', 'matching', 'insight'])
  ]),
  async (req, res) => {
    try {
      const { agent } = req.params;
      const tools = toolExecutor.getAvailableTools(agent as any);
      
      res.json({
        success: true,
        data: {
          agent,
          availableTools: tools,
          toolCount: tools.length,
          schemas: AGENT_TOOLS[agent as keyof typeof AGENT_TOOLS]?.map(tool => ({
            name: tool.name,
            description: tool.description,
            agent: tool.agent
          })) || []
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get available tools',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/tools/audit/:sessionId
 * Get audit logs for a session
 */
router.get('/audit/:sessionId',
  authenticateToken,
  validateRequest([
    param('sessionId').matches(/^session_\d+_[a-f0-9\-]{36}$/)
  ]),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const auditLogs = await toolExecutor.getAuditLogs(sessionId);
      
      res.json({
        success: true,
        data: {
          sessionId,
          auditLogs,
          totalExecutions: auditLogs.length,
          successfulExecutions: auditLogs.filter(log => log.success).length,
          failedExecutions: auditLogs.filter(log => !log.success).length,
          toolsUsed: [...new Set(auditLogs.map(log => log.toolName))],
          agentsInvolved: [...new Set(auditLogs.map(log => log.agent))]
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/tools/test
 * Test tool execution (for development/debugging)
 */
router.post('/test',
  authenticateToken,
  validateRequest([
    body('toolName').notEmpty(),
    body('agent').isIn(['ai-router', 'facilitator', 'sentiment', 'crisis', 'matching', 'insight']),
    body('parameters').isObject(),
    body('sessionId').optional().matches(/^session_\d+_[a-f0-9\-]{36}$/)
  ]),
  async (req, res) => {
    try {
      const { toolName, agent, parameters, sessionId } = req.body;
      const userId = req.user.id;
      
      const context = {
        userId,
        sessionId: sessionId || `session_${Date.now()}_test-session`,
        groupId: 'test-group',
        messageId: `test-${Date.now()}`,
        timestamp: new Date(),
        agent,
        metadata: { source: 'test-endpoint' }
      };

      const result = await toolExecutor.executeTool(toolName, parameters, context);

      res.json({
        success: true,
        data: {
          toolName,
          agent,
          parameters,
          result,
          executionContext: context
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Tool test execution failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/tools/schemas
 * Get all tool schemas for documentation
 */
router.get('/schemas',
  authenticateToken,
  async (req, res) => {
    try {
      const allSchemas = Object.entries(AGENT_TOOLS).map(([agent, tools]) => ({
        agent,
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          agent: tool.agent,
          // Note: Not including full schema to avoid exposing internal structure
          parameterCount: Object.keys(tool.schema.shape || {}).length
        }))
      }));

      res.json({
        success: true,
        data: {
          totalAgents: allSchemas.length,
          totalTools: allSchemas.reduce((sum, agent) => sum + agent.tools.length, 0),
          schemas: allSchemas
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get tool schemas',
        message: error.message
      });
    }
  }
);

export default router;