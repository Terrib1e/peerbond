import { Agent, AgentSession } from './types';

export class AgentRegistry {
  private static agents = new Map<string, Agent>();
  private static instances = new Map<string, any>();

  static register(agent: Agent) {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} is already registered`);
    }
    this.agents.set(agent.id, agent);
  }

  static get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  static getInstance<T = any>(id: string): T | undefined {
    return this.instances.get(id);
  }

  static setInstance(id: string, instance: any) {
    this.instances.set(id, instance);
  }

  static getAll(): Agent[] {
    return Array.from(this.agents.values());
  }

  static clear() {
    this.agents.clear();
    this.instances.clear();
  }

  static async createSession(agentId: string, userId: string, context?: Record<string, any>): Promise<AgentSession | null> {
    const instance = this.getInstance(agentId);
    if (!instance || typeof instance.createSession !== 'function') {
      return null;
    }
    return instance.createSession(userId, context);
  }

  static async processMessage(
    agentId: string,
    sessionId: string,
    message: string,
    context?: Record<string, any>
  ): Promise<{ message: string; toolResults?: any[] } | null> {
    const instance = this.getInstance(agentId);
    if (!instance || typeof instance.processMessage !== 'function') {
      return null;
    }
    return instance.processMessage(sessionId, message, context);
  }
}