import { AgentRegistry } from './registry';
import { ToolRegistry } from '../tools/registry';
import { ToolContext } from '../tools/types';

export interface RouterDecision {
  primaryAgent: string;
  tools: string[];
  reasoning: string;
  confidence: number;
}

export interface RouterExecution {
  success: boolean;
  response: string;
  agentUsed: string;
  toolsExecuted: string[];
  confidence: number;
  metadata?: any;
}

export class AgentRouter {
  /**
   * Analyze user input and determine the best agent/tool combination
   */
  async analyzeIntent(
    message: string,
    _context: {
      userId: string;
      sessionId: string;
      messageHistory?: string[];
    }
  ): Promise<RouterDecision> {
    const lowerMessage = message.toLowerCase();
    
    // Group listing requests (highest priority)
    if (this.isGroupListingRequest(lowerMessage)) {
      return {
        primaryAgent: 'matching',
        tools: ['listAllGroups'],
        reasoning: 'User is asking to see all available groups',
        confidence: 0.95
      };
    }

    // Group finding/matching requests
    if (this.isGroupFindingRequest(lowerMessage)) {
      return {
        primaryAgent: 'matching',
        tools: ['suggestGroup'],
        reasoning: 'User is looking for specific group recommendations',
        confidence: 0.9
      };
    }

    // Crisis/emergency detection
    if (this.isCrisisRequest(lowerMessage)) {
      return {
        primaryAgent: 'facilitator-maya',
        tools: ['escalateCrisis'],
        reasoning: 'Potential crisis situation detected, prioritizing safety',
        confidence: 0.95
      };
    }

    // Mood/emotional tracking
    if (this.isMoodTrackingRequest(lowerMessage)) {
      return {
        primaryAgent: 'sentiment-analyzer',
        tools: ['logMood'],
        reasoning: 'User wants to track or discuss their emotional state',
        confidence: 0.85
      };
    }

    // General therapeutic support (default)
    return {
      primaryAgent: 'facilitator-maya',
      tools: ['postMessage'],
      reasoning: 'General conversation requiring empathetic support',
      confidence: 0.7
    };
  }

  /**
   * Execute the routing decision by actually calling the agent and tools
   */
  async executeRouting(
    decision: RouterDecision,
    message: string,
    context: {
      userId: string;
      sessionId: string;
      agentId?: string;
    }
  ): Promise<RouterExecution> {
    try {
      console.log(`[AgentRouter] Executing decision: ${decision.primaryAgent} with tools: ${decision.tools.join(', ')}`);

      const toolContext: ToolContext = {
        userId: context.userId,
        sessionId: context.sessionId,
        agentId: decision.primaryAgent,
        timestamp: new Date()
      };

      let response = '';
      let agentUsed = decision.primaryAgent;
      let toolsExecuted: string[] = [];
      let confidence = decision.confidence;

      // Execute tools first if needed
      const toolResults = [];
      for (const toolName of decision.tools) {
        try {
          console.log(`[AgentRouter] Executing tool: ${toolName}`);
          
          const args = this.generateToolArgs(toolName, message, context);
          const result = await ToolRegistry.execute(toolName, args, toolContext);
          
          if (result.success) {
            toolsExecuted.push(toolName);
            toolResults.push({ tool: toolName, result: result.data });
            console.log(`[AgentRouter] Tool ${toolName} executed successfully`);
          } else {
            console.error(`[AgentRouter] Tool ${toolName} failed:`, result.error);
          }
        } catch (error) {
          console.error(`[AgentRouter] Error executing tool ${toolName}:`, error);
        }
      }

      // Get agent instance and process message
      const agent = AgentRegistry.getInstance(decision.primaryAgent);
      if (agent && typeof agent.processMessage === 'function') {
        console.log(`[AgentRouter] Processing message with agent: ${decision.primaryAgent}`);
        
        // Check if agent has a session
        let session = await agent.getSession(context.sessionId);
        if (!session) {
          session = await agent.createSession(context.userId);
        }

        const agentResponse = await agent.processMessage(session.id, message);
        response = agentResponse.message;
        
        // Combine tool results into response if applicable
        if (toolResults.length > 0) {
          response = this.combineToolResultsWithResponse(toolResults, response, decision.primaryAgent);
        }
      } else {
        // Fallback: use tool results directly
        console.log(`[AgentRouter] Agent ${decision.primaryAgent} not available, using tool results`);
        response = this.formatToolResults(toolResults, message);
        agentUsed = 'tool-direct';
        confidence = Math.max(0.5, confidence - 0.2);
      }

      return {
        success: true,
        response,
        agentUsed,
        toolsExecuted,
        confidence,
        metadata: {
          decision,
          toolResults,
          executionTime: new Date()
        }
      };

    } catch (error) {
      console.error('[AgentRouter] Error executing routing:', error);
      
      return {
        success: false,
        response: "I apologize, but I'm having trouble processing your request right now. How are you feeling today?",
        agentUsed: 'error-fallback',
        toolsExecuted: [],
        confidence: 0.1,
        metadata: { error: (error as Error).message }
      };
    }
  }

  /**
   * Route and execute in one step
   */
  async routeAndExecute(
    message: string,
    context: {
      userId: string;
      sessionId: string;
      agentId?: string;
      messageHistory?: string[];
    }
  ): Promise<RouterExecution> {
    const decision = await this.analyzeIntent(message, context);
    return this.executeRouting(decision, message, context);
  }

  // Private helper methods
  private isGroupListingRequest(message: string): boolean {
    const listPatterns = [
      'list all groups',
      'show all groups',
      'what groups are available',
      'groups available to me',
      'show me all groups',
      'list groups',
      'all available groups'
    ];
    
    return listPatterns.some(pattern => message.includes(pattern)) ||
           (message.includes('groups') && (message.includes('available') || message.includes('list') || message.includes('show')));
  }

  private isGroupFindingRequest(message: string): boolean {
    const findPatterns = [
      'find group',
      'recommend group',
      'suggest group',
      'group for',
      'support group',
      'match me with',
      'connect me to'
    ];
    
    return findPatterns.some(pattern => message.includes(pattern));
  }

  private isCrisisRequest(message: string): boolean {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'better off dead',
      'can\'t go on', 'hopeless', 'no point', 'emergency'
    ];
    
    return crisisKeywords.some(keyword => message.includes(keyword));
  }

  private isMoodTrackingRequest(message: string): boolean {
    const moodPatterns = [
      'feeling',
      'mood',
      'emotion',
      'track my',
      'log my'
    ];
    
    return moodPatterns.some(pattern => message.includes(pattern)) &&
           (message.includes('today') || message.includes('right now') || message.includes('currently'));
  }

  private generateToolArgs(toolName: string, message: string, context: any): any {
    switch (toolName) {
      case 'listAllGroups':
        return {
          userId: context.userId,
          limit: 50,
          includeInactive: false
        };
      
      case 'suggestGroup':
        return {
          userId: context.userId,
          goals: this.extractGoals(message),
          language: 'en'
        };
      
      case 'logMood':
        return {
          mood: this.extractMood(message),
          score: this.extractMoodScore(message),
          note: message.substring(0, 500)
        };
      
      case 'escalateCrisis':
        return {
          severity: 'high',
          userId: context.userId,
          indicators: this.extractCrisisIndicators(message),
          immediateRisk: true,
          context: message
        };
      
      default:
        return {};
    }
  }

  private extractGoals(message: string): string[] {
    const goalMap = {
      anxiety: ['anxiety', 'anxious', 'panic', 'worry'],
      depression: ['depression', 'depressed', 'sad', 'hopeless'],
      social: ['lonely', 'isolated', 'social', 'friends'],
      stress: ['stress', 'overwhelmed', 'pressure']
    };

    const goals = [];
    for (const [goal, keywords] of Object.entries(goalMap)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        goals.push(goal);
      }
    }

    return goals.length > 0 ? goals : ['general'];
  }

  private extractMood(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('great') || lowerMessage.includes('amazing')) return 'very_positive';
    if (lowerMessage.includes('good') || lowerMessage.includes('better')) return 'positive';
    if (lowerMessage.includes('bad') || lowerMessage.includes('terrible')) return 'negative';
    if (lowerMessage.includes('awful') || lowerMessage.includes('horrible')) return 'very_negative';
    return 'neutral';
  }

  private extractMoodScore(message: string): number {
    // Simple sentiment scoring
    const positiveWords = ['good', 'great', 'happy', 'better', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'sad', 'awful', 'horrible'];
    
    const lowerMessage = message.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) score += 0.2;
    });
    
    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) score -= 0.2;
    });
    
    return Math.max(-1, Math.min(1, score));
  }

  private extractCrisisIndicators(message: string): string[] {
    const indicators: string[] = [];
    const crisisKeywords = ['suicide', 'hopeless', 'end it all', 'no point', 'can\'t go on'];
    
    crisisKeywords.forEach(keyword => {
      if (message.toLowerCase().includes(keyword)) {
        indicators.push(keyword);
      }
    });
    
    return indicators as any[];
  }

  private combineToolResultsWithResponse(toolResults: any[], agentResponse: string, agentType: string): string {
    if (agentType === 'matching' && toolResults.some(tr => tr.tool === 'listAllGroups')) {
      // For group listing, format the results nicely
      const groupData = toolResults.find(tr => tr.tool === 'listAllGroups')?.result;
      if (groupData && Array.isArray(groupData)) {
        let response = "Here are all the available peer support groups:\n\n";
        
        groupData.forEach((group, index) => {
          response += `**${index + 1}. ${group.name}**\n`;
          response += `${group.description}\n`;
          response += `• Type: ${group.type.replace('_', ' ')}\n`;
          response += `• Members: ${group.memberCount}/${group.maxMembers}\n`;
          response += `• Schedule: ${group.meetingSchedule || 'TBD'}\n\n`;
        });
        
        response += "Would you like me to help you join one of these groups or learn more about any specific group?";
        return response;
      }
    }
    
    return agentResponse;
  }

  private formatToolResults(toolResults: any[], _originalMessage: string): string {
    if (toolResults.length === 0) {
      return "I'm here to help you. Could you tell me more about what you're looking for?";
    }

    // Format based on the tool that was executed
    const groupTool = toolResults.find(tr => tr.tool === 'listAllGroups');
    if (groupTool && groupTool.result) {
      return this.combineToolResultsWithResponse(toolResults, '', 'matching');
    }

    return "I've processed your request. How else can I help you today?";
  }
}

// Export singleton instance
export const agentRouter = new AgentRouter();