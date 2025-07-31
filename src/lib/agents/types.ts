import { Message, ToolDefinition } from '../providers/types';

export interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  model: string;
  provider: string;
  config: AgentConfig;
}

export interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  memoryLimit?: number;
  persistSession?: boolean;
}

export interface AgentSession {
  id: string;
  agentId: string;
  memberId: string;
  messages: Message[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface AgentExecution {
  sessionId: string;
  messageId: string;
  timestamp: Date;
  duration: number;
  toolCalls: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
}

export interface WorkflowStep {
  id: string;
  type: 'tool' | 'decision' | 'human' | 'agent';
  name: string;
  config: any;
  conditions?: WorkflowCondition[];
  nextSteps: string[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: any;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Record<string, any>;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook';
  config: any;
}