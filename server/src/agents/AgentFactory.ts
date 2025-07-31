/**
 * Agent Factory - Creates and manages all PeerBond AI agents
 * Singleton pattern to ensure single instances of agents
 */

import { BaseAgent } from './BaseAgent';
import { MatchingAgent } from './MatchingAgent';
import { FacilitatorAgent } from './FacilitatorAgent';
import { SentimentAgent } from './SentimentAgent';
import { InsightAgent } from './InsightAgent';
import { CrisisAgent } from './CrisisAgent';
import { logger } from '../utils/logger';

export type AgentType = 
  | 'matching' 
  | 'facilitator' 
  | 'sentiment' 
  | 'insight' 
  | 'crisis'
  | 'ai-router'
  | 'chat'
  | 'tracker'
  | 'action-items'
  | 'analytics'
  | 'voice'
  | 'orchestration'
  | 'personalization'
  | 'safety'
  | 'knowledge'
  | 'context';

export class AgentFactory {
  private static instance: AgentFactory;
  private agents: Map<string, BaseAgent>;
  
  private constructor() {
    this.agents = new Map();
    this.initializeAgents();
  }

  public static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }

  private initializeAgents(): void {
    logger.info('[AgentFactory] Initializing agents...');

    // Initialize core agents with tool integration
    this.agents.set('matching', new MatchingAgent());
    this.agents.set('facilitator', new FacilitatorAgent());
    this.agents.set('sentiment', new SentimentAgent());
    this.agents.set('insight', new InsightAgent());
    
    this.agents.set('crisis', new CrisisAgent());

    // TODO: Implement remaining agents
    // this.agents.set('ai-router', new AIRouterAgent());
    // this.agents.set('chat', new ChatAgent());
    // this.agents.set('tracker', new TrackerAgent());
    // this.agents.set('action-items', new ActionItemsAgent());
    // this.agents.set('analytics', new AnalyticsAgent());
    // this.agents.set('voice', new VoiceAgent());
    // this.agents.set('orchestration', new OrchestrationAgent());
    // this.agents.set('personalization', new PersonalizationAgent());
    // this.agents.set('safety', new SafetyAgent());
    // this.agents.set('knowledge', new KnowledgeAgent());
    // this.agents.set('context', new ContextAgent());

    logger.info(`[AgentFactory] Initialized ${this.agents.size} agents`);
  }

  /**
   * Get a specific agent by type
   */
  public getAgent(type: AgentType): BaseAgent | null {
    const agent = this.agents.get(type);
    if (!agent) {
      logger.warn(`[AgentFactory] Agent type '${type}' not found`);
      return null;
    }
    return agent;
  }

  /**
   * Get all available agents
   */
  public getAllAgents(): Map<string, BaseAgent> {
    return new Map(this.agents);
  }

  /**
   * Get agent information for display
   */
  public getAgentInfo(): Array<{
    id: string;
    name: string;
    description: string;
    availableTools: string[];
  }> {
    const info: any[] = [];
    
    this.agents.forEach((agent, id) => {
      info.push({
        id,
        ...agent.getInfo()
      });
    });

    return info;
  }

  /**
   * Check if an agent type is available
   */
  public hasAgent(type: string): boolean {
    return this.agents.has(type);
  }

  /**
   * Get available agent types
   */
  public getAvailableAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }
}