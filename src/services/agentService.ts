/**
 * Agent Service - Easy interface for calling agents and listing tools
 * Provides a simple way to interact with the PeerBond agent system
 */

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
}

export interface Tool {
  name: string;
  description: string;
  agent: string;
  parameters?: any;
}

export interface AgentCallResponse {
  success: boolean;
  response: string;
  agentUsed: string;
  toolsUsed?: string[];
  confidence: number;
  metadata?: any;
}

export interface AgentsAndToolsResponse {
  agents: Agent[];
  tools: Tool[];
}

class AgentService {
  private baseUrl = '/api/orchestration';

  /**
   * Get all available agents and their tools
   */
  async getAvailableAgentsAndTools(): Promise<AgentsAndToolsResponse> {
    try {
      const token = localStorage.getItem('peerbond_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Only add auth header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/agents`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear invalid token and provide helpful error
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in to PeerBond again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to access AI agents.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        }
        if (response.status >= 500) {
          throw new Error('AI service temporarily unavailable. Please try again in a moment.');
        }
        throw new Error(`Failed to fetch agents: ${response.statusText} (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to retrieve agent information');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching agents and tools:', error);

      // Provide member-friendly error messages for common issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }

      throw error;
    }
  }

  /**
   * Call a specific agent directly with a message
   */
  async callAgent(
    agentId: string,
    message: string,
    sessionId: string,
    toolName?: string
  ): Promise<AgentCallResponse> {
    try {
      const token = localStorage.getItem('peerbond_token');

      if (!token) {
        throw new Error('Authentication required. Please sign in to PeerBond first.');
      }

      const response = await fetch(`${this.baseUrl}/agent/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          agentId,
          message,
          sessionId,
          toolName
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Clear expired token
          localStorage.removeItem('peerbond_token');
          throw new Error('Authentication expired. Please sign in to PeerBond again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to use this AI agent.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making another request.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Invalid request. Please check your input and try again.');
        }
        if (response.status >= 500) {
          throw new Error('AI agent temporarily unavailable. Please try again in a moment.');
        }

        // Try to get more specific error from response
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to call agent: ${response.statusText} (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Agent ${agentId} failed to process your request`);
      }

      return result.data;
    } catch (error) {
      console.error(`Error calling agent ${agentId}:`, error);

      // Provide member-friendly error messages for network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }

      throw error;
    }
  }

  /**
   * Get available agents as a simple list
   */
  async getAgentsList(): Promise<Agent[]> {
    const data = await this.getAvailableAgentsAndTools();
    return data.agents;
  }

  /**
   * Get available tools as a simple list
   */
  async getToolsList(): Promise<Tool[]> {
    const data = await this.getAvailableAgentsAndTools();
    return data.tools;
  }

  /**
   * Get tools for a specific agent
   */
  async getToolsForAgent(agentId: string): Promise<Tool[]> {
    const data = await this.getAvailableAgentsAndTools();
    return data.tools.filter(tool => tool.agent === agentId);
  }

  /**
   * Find an agent by ID
   */
  async findAgent(agentId: string): Promise<Agent | null> {
    const agents = await this.getAgentsList();
    return agents.find(agent => agent.id === agentId) || null;
  }

  /**
   * Search agents by capability
   */
  async findAgentsByCapability(capability: string): Promise<Agent[]> {
    const agents = await this.getAgentsList();
    return agents.filter(agent =>
      agent.capabilities.some(cap =>
        cap.toLowerCase().includes(capability.toLowerCase())
      )
    );
  }

  /**
   * Get formatted agent descriptions for display
   */
  async getAgentDescriptions(): Promise<string> {
    const agents = await this.getAgentsList();

    let description = "**Available Agents:**\n\n";

    agents.forEach((agent, index) => {
      description += `**${index + 1}. ${agent.name}** (\`${agent.id}\`)\n`;
      description += `${agent.description}\n`;
      description += `• **Capabilities:** ${agent.capabilities.join(', ')}\n`;
      description += `• **Tools:** ${agent.tools.join(', ')}\n\n`;
    });

    return description;
  }

  /**
   * Get formatted tool descriptions for display
   */
  async getToolDescriptions(): Promise<string> {
    const tools = await this.getToolsList();

    let description = "**Available Tools:**\n\n";

    // Group tools by agent
    const toolsByAgent = tools.reduce((acc, tool) => {
      if (!acc[tool.agent]) {
        acc[tool.agent] = [];
      }
      acc[tool.agent].push(tool);
      return acc;
    }, {} as Record<string, Tool[]>);

    Object.entries(toolsByAgent).forEach(([agentId, agentTools]) => {
      description += `**${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Agent Tools:**\n`;
      agentTools.forEach(tool => {
        description += `• **${tool.name}**: ${tool.description}\n`;
      });
      description += '\n';
    });

    return description;
  }

  /**
   * Helper method to get quick agent recommendations based on member intent
   */
  getAgentRecommendations(memberMessage: string): string[] {
    const message = memberMessage.toLowerCase();
    const recommendations: string[] = [];

    // Group-related requests
    if (message.includes('group') || message.includes('connect') ||
        message.includes('community') || message.includes('others')) {
      recommendations.push('matching');
    }

    // Emotional support requests
    if (message.includes('sad') || message.includes('anxious') ||
        message.includes('depressed') || message.includes('support')) {
      recommendations.push('facilitator');
    }

    // Crisis-related keywords
    if (message.includes('crisis') || message.includes('emergency') ||
        message.includes('help') || message.includes('urgent')) {
      recommendations.push('crisis');
    }

    // Progress/insight requests
    if (message.includes('progress') || message.includes('journey') ||
        message.includes('growth') || message.includes('insight')) {
      recommendations.push('insight');
    }

    // Sentiment analysis requests
    if (message.includes('analyze') || message.includes('sentiment') ||
        message.includes('mood') || message.includes('emotion')) {
      recommendations.push('sentiment');
    }

    // Default to facilitator if no specific matches
    if (recommendations.length === 0) {
      recommendations.push('facilitator');
    }

    return recommendations;
  }

  /**
   * Convenience method to call the most appropriate agent based on member message
   */
  async callRecommendedAgent(
    message: string,
    sessionId: string
  ): Promise<{ recommendation: string; result: AgentCallResponse }> {
    const recommendations = this.getAgentRecommendations(message);
    const primaryRecommendation = recommendations[0];

    const result = await this.callAgent(primaryRecommendation, message, sessionId);

    return {
      recommendation: primaryRecommendation,
      result
    };
  }
}

// Export a singleton instance
export const agentService = new AgentService();

// Export utility functions for easy use in components
export const listAllAgents = () => agentService.getAgentsList();
export const listAllTools = () => agentService.getToolsList();
export const callAgent = (agentId: string, message: string, sessionId: string, toolName?: string) =>
  agentService.callAgent(agentId, message, sessionId, toolName);
export const getAgentDescriptions = () => agentService.getAgentDescriptions();
export const getToolDescriptions = () => agentService.getToolDescriptions();
export const findAgentsByCapability = (capability: string) =>
  agentService.findAgentsByCapability(capability);

export default agentService;