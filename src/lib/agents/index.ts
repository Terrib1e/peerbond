export * from './types';
export * from './base';
export * from './registry';
export * from './implementations';

import { AgentRegistry } from './registry';
import { ALL_AGENTS } from './implementations';

export function initializeAgents() {
  // Register all agents
  ALL_AGENTS.forEach(agent => {
    AgentRegistry.register(agent);
    AgentRegistry.setInstance(agent.id, agent);
  });

  console.log('Agent system initialized with', ALL_AGENTS.length, 'agents');
}