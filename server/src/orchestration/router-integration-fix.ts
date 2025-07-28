/**
 * Quick fix to replace routing analysis with actual execution
 * Drop this into your existing orchestration system
 */

export interface QuickRouterFix {
  executeInsteadOfAnalyze(
    message: string,
    session: any,
    originalAiRouterMethod: Function,
    originalExecuteRoutingMethod: Function
  ): Promise<{
    response: string;
    confidence: number;
    agentsUsed: string[];
    toolResults: any[];
  }>;
}

export class RouterExecutionFix implements QuickRouterFix {
  
  /**
   * This method replaces the analysis-only behavior with actual execution
   */
  async executeInsteadOfAnalyze(
    message: string,
    session: any,
    originalAiRouterMethod: Function,
    originalExecuteRoutingMethod: Function
  ): Promise<{
    response: string;
    confidence: number;
    agentsUsed: string[];
    toolResults: any[];
  }> {
    
    try {
      console.log('[RouterFix] Intercepting routing call to execute instead of analyze');
      
      // Step 1: Get the routing decision (same as before)
      const routingDecision = await originalAiRouterMethod.call(this, message, session);
      console.log('[RouterFix] Routing decision:', routingDecision);
      
      // Step 2: Execute the routing decision (this is the missing piece!)
      const executionResult = await originalExecuteRoutingMethod.call(this, routingDecision, message, session);
      console.log('[RouterFix] Execution result:', executionResult);
      
      // Step 3: Return the actual execution results instead of analysis text
      return {
        response: executionResult.response,
        confidence: executionResult.confidence,
        agentsUsed: executionResult.agentsUsed,
        toolResults: executionResult.toolResults || []
      };
      
    } catch (error) {
      console.error('[RouterFix] Error in router execution fix:', error);
      
      // Fallback to a helpful response
      return {
        response: "I'm here to help you. Could you tell me more about what you're looking for?",
        confidence: 0.5,
        agentsUsed: ['fallback'],
        toolResults: []
      };
    }
  }
  
  /**
   * Alternative approach: Direct message routing without showing analysis
   */
  async directMessageRouting(
    message: string,
    session: any,
    databaseService: any
  ): Promise<{
    response: string;
    confidence: number;
    agentUsed: string;
  }> {
    
    const lowerMessage = message.toLowerCase();
    
    // Check for group listing requests
    if (this.isGroupListingRequest(lowerMessage)) {
      console.log('[RouterFix] Direct routing to group listing');
      return await this.executeGroupListing(session, databaseService);
    }
    
    // Check for group finding requests  
    if (this.isGroupFindingRequest(lowerMessage)) {
      console.log('[RouterFix] Direct routing to group matching');
      return await this.executeGroupMatching(message, session, databaseService);
    }
    
    // Default to facilitator
    console.log('[RouterFix] Direct routing to facilitator');
    return await this.executeFacilitator(message, session);
  }
  
  private isGroupListingRequest(message: string): boolean {
    const patterns = [
      'what groups are available',
      'list all groups', 
      'show all groups',
      'groups available',
      'list groups',
      'show groups'
    ];
    
    return patterns.some(pattern => message.includes(pattern)) ||
           (message.includes('groups') && (message.includes('available') || message.includes('list')));
  }
  
  private isGroupFindingRequest(message: string): boolean {
    const patterns = [
      'find group',
      'recommend group', 
      'suggest group',
      'group for',
      'support group'
    ];
    
    return patterns.some(pattern => message.includes(pattern));
  }
  
  private async executeGroupListing(session: any, databaseService: any): Promise<{
    response: string;
    confidence: number;
    agentUsed: string;
  }> {
    
    try {
      // Get groups from database (mimics your existing matchingAgent logic)
      const { groups: allGroups } = await databaseService.getGroups(1, 50, {
        status: true,
        userId: session.userId
      });
      
      if (allGroups.length === 0) {
        return {
          response: "I'd love to help you find a supportive group, but it looks like we don't have any active groups available right now. Would you like me to help you create a new support group or connect you with our therapist network?",
          confidence: 0.9,
          agentUsed: 'matching'
        };
      }
      
      // Format the response like your existing system
      let response = "Here are all the available peer support groups:\n\n";
      
      allGroups.forEach((group: any, index: number) => {
        const memberCount = Array.isArray(group.members) ? group.members.length : 0;
        const maxMembers = group.maxMembers || 8;
        
        response += `**${index + 1}. ${group.name}**\n`;
        response += `${group.description}\n`;
        response += `• Group Type: ${group.type}\n`;
        response += `• Members: ${memberCount}/${maxMembers}\n`;
        response += `• Status: ${group.isActive ? 'Active' : 'Inactive'}\n\n`;
      });
      
      response += "Would you like me to help you join one of these groups, or would you like me to recommend which groups might be best for your specific needs?";
      
      return {
        response,
        confidence: 0.95,
        agentUsed: 'matching'
      };
      
    } catch (error) {
      console.error('[RouterFix] Error in group listing:', error);
      return {
        response: "I'm having trouble accessing our group database right now. Could you tell me more about what type of support you're looking for?",
        confidence: 0.6,
        agentUsed: 'matching-fallback'
      };
    }
  }
  
  private async executeGroupMatching(message: string, session: any, databaseService: any): Promise<{
    response: string;
    confidence: number;
    agentUsed: string;
  }> {
    
    // This would implement your existing matchingAgent logic
    // For now, return a helpful response
    return {
      response: "I'll help you find the right support group! Could you tell me more about what challenges you're facing or what type of support you're looking for? For example, are you dealing with anxiety, depression, social challenges, or something else?",
      confidence: 0.8,
      agentUsed: 'matching'
    };
  }
  
  private async executeFacilitator(message: string, session: any): Promise<{
    response: string;
    confidence: number;
    agentUsed: string;
  }> {
    
    // Simple facilitator response
    return {
      response: "Thank you for sharing that with me. I'm here to listen and support you. Could you tell me a bit more about what's on your mind today?",
      confidence: 0.7,
      agentUsed: 'facilitator'
    };
  }
}

// Usage in your existing system:
export const routerFix = new RouterExecutionFix();