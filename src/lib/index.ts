// Main exports for the PeerBond tools and agents system
export * from './providers';
export * from './tools';
export * from './agents';
export * from './security';

import { initializeTools } from './tools';
import { initializeAgents } from './agents';
import { initializeSecurity } from './security';
import { createProvider } from './providers';
import { ToolRegistry } from './tools/registry';
import { createSecurityMiddleware } from './security';

export interface PeerBondConfig {
  providers: {
    openai?: { apiKey: string; baseUrl?: string };
    anthropic?: { apiKey: string; baseUrl?: string };
    gemini?: { apiKey: string; baseUrl?: string };
  };
  security?: {
    enableAudit?: boolean;
    encryption?: boolean;
  };
}

export function initializePeerBond(config: PeerBondConfig) {
  console.log('Initializing PeerBond AI System...');

  // Initialize security first
  initializeSecurity();

  // Set up providers
  if (config.providers.openai) {
    createProvider('openai', config.providers.openai);
  }
  if (config.providers.anthropic) {
    createProvider('anthropic', config.providers.anthropic);
  }
  if (config.providers.gemini) {
    createProvider('gemini', config.providers.gemini);
  }

  // Initialize tools with security middleware
  initializeTools();
  ToolRegistry.addMiddleware(createSecurityMiddleware());

  // Initialize agents
  initializeAgents();

  console.log('PeerBond AI System ready! 🤖');
  console.log('Available tools:', ToolRegistry.getAll().map(t => t.name));
}

// Quick start configuration
export function createDevConfig(): PeerBondConfig {
  return {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'your-openai-key'
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-key'
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || 'your-gemini-key'
      }
    },
    security: {
      enableAudit: true,
      encryption: true
    }
  };
}

export function createProdConfig(): PeerBondConfig {
  return {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        baseUrl: process.env.OPENAI_BASE_URL
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY!,
        baseUrl: process.env.ANTHROPIC_BASE_URL
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY!
      }
    },
    security: {
      enableAudit: true,
      encryption: true
    }
  };
}