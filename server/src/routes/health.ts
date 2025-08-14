import { Router } from 'express';
import { GeminiService } from '../services/geminiService';
import { ProductionOrchestratorService } from '../orchestration/orchestrator';
import { DatabaseService } from '../services/database';

const router = Router();

// Health check endpoint with Maya AI status
router.get('/maya-status', async (req, res) => {
  try {
    const geminiService = new GeminiService();
    const orchestrator = new ProductionOrchestratorService();
    const dbService = new DatabaseService();

    // Check Gemini API status
    const geminiStatus = {
      initialized: !!(geminiService as any).model,
      apiKeyConfigured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      apiKeyName: process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : process.env.GOOGLE_API_KEY ? 'GOOGLE_API_KEY' : 'NOT_SET'
    };

    // Test simple AI response if API is configured
    let testResponse = null;
    let aiWorking = false;
    if (geminiStatus.initialized) {
      try {
        testResponse = await geminiService.generateResponse('Say "Maya is working!" in a friendly way.');
        aiWorking = testResponse && testResponse.length > 0 && !testResponse.includes('not able to provide');
      } catch (error) {
        testResponse = `AI Error: ${error.message}`;
      }
    }

    // Check database connection
    let dbConnected = false;
    try {
      await dbService.healthCheck();
      dbConnected = true;
    } catch (error) {
      dbConnected = false;
    }

    res.json({
      status: aiWorking ? 'healthy' : 'degraded',
      maya: {
        aiEnabled: geminiStatus.initialized,
        apiKeyConfigured: geminiStatus.apiKeyConfigured,
        apiKeyVariable: geminiStatus.apiKeyName,
        aiResponding: aiWorking,
        testResponse: testResponse || 'No response - API key may be missing',
        fallbackMode: !aiWorking
      },
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
        geminiApi: geminiStatus.initialized ? 'initialized' : 'not initialized',
        orchestrator: 'active',
        toolSystem: process.env.USE_TOOL_SYSTEM === 'true' ? 'enabled' : 'disabled'
      },
      recommendations: !aiWorking ? [
        'Set GOOGLE_API_KEY or GEMINI_API_KEY in your .env file',
        'Get API key from: https://makersuite.google.com/app/apikey',
        'Restart server after adding API key'
      ] : [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'peerbond-api',
    timestamp: new Date().toISOString()
  });
});

export default router;