/**
 * Matching Agent - Finds and recommends suitable peer support groups
 * Uses tool system for proper database integration
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class MatchingAgent extends BaseAgent {
  constructor() {
    super({
      id: 'matching',
      name: 'Matching Agent',
      description: 'Finds and recommends suitable peer support groups based on member needs',
      availableTools: ['searchGroups', 'rankGroupsByRelevance', 'generateGroupRecommendations']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0;

    try {
      // Analyze message intent
      const lowerMessage = message.toLowerCase();
      const isListAllRequest = this.isListAllGroupsRequest(lowerMessage);

      logger.info(`[${this.name}] Detected request type:`, { isListAllRequest });

      // Extract member needs from message
      const memberGoals = this.extractGoals(message);
      const memberNeeds = this.extractNeeds(message);

      // Step 1: Search for groups
      const searchParams = {
        memberGoals: isListAllRequest ? [] : memberGoals,
        experienceLevel: 'intermediate',
        preferredGroupSize: 'any',
        supportType: this.determineSupportType(message),
        location: undefined,
        ageRange: undefined
      };

      const searchResult = await this.executeTool('searchGroups', searchParams, context);
      toolsUsed.push('searchGroups');
      toolResults.push(searchResult);

      if (!searchResult.success || !searchResult.data?.groups || searchResult.data.groups.length === 0) {
        response = this.getNoGroupsResponse();
        return {
          response,
          confidence: 0.7,
          toolsUsed,
          toolResults,
          metadata: { noGroupsFound: true }
        };
      }

      const availableGroups = searchResult.data.groups;
      logger.info(`[${this.name}] Found ${availableGroups.length} groups`);

      // Step 2: Rank groups by relevance (unless listing all)
      if (!isListAllRequest && availableGroups.length > 1) {
        const rankingParams = {
          memberId: context.memberId,
          candidateGroups: availableGroups.map(g => g.id),
          memberProfile: {
            goals: memberGoals,
            interests: memberNeeds,
            challengesAreas: this.extractChallenges(message),
            communicationStyle: 'moderate'
          }
        };

        const rankingResult = await this.executeTool('rankGroupsByRelevance', rankingParams, context);
        toolsUsed.push('rankGroupsByRelevance');
        toolResults.push(rankingResult);

        if (rankingResult.success && rankingResult.data?.rankedGroups) {
          // Reorder groups based on ranking
          const rankedGroupIds = rankingResult.data.rankedGroups.map(rg => rg.groupId);
          availableGroups.sort((a, b) => {
            const aIndex = rankedGroupIds.indexOf(a.id);
            const bIndex = rankedGroupIds.indexOf(b.id);
            return aIndex - bIndex;
          });
        }
      }

      // Step 3: Generate recommendations
      const recommendationParams = {
        memberId: context.memberId,
        currentGroups: [],
        recommendationContext: isListAllRequest ? 'seeking_additional' : 'initial_signup',
        maxRecommendations: isListAllRequest ? availableGroups.length : 3,
        includeExplanations: true
      };

      const recommendationResult = await this.executeTool('generateGroupRecommendations', recommendationParams, context);
      toolsUsed.push('generateGroupRecommendations');
      toolResults.push(recommendationResult);

      // Build response
      if (recommendationResult.success && recommendationResult.data?.recommendations) {
        response = this.buildRecommendationResponse(
          recommendationResult.data.recommendations,
          isListAllRequest,
          message
        );
        confidence = recommendationResult.confidence || 0.9;
      } else {
        // Fallback to basic formatting if recommendation tool fails
        response = this.buildBasicGroupListResponse(availableGroups, isListAllRequest);
        confidence = 0.8;
      }

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          groupCount: availableGroups.length,
          isListAllRequest,
          memberGoals,
          recommendationType: recommendationParams.recommendationContext
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.1,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private isListAllGroupsRequest(message: string): boolean {
    const listPatterns = [
      'list all',
      'show all',
      'what groups are available',
      'all groups',
      'show me all',
      'available groups',
      'list groups',
      'show groups'
    ];
    
    return listPatterns.some(pattern => message.includes(pattern));
  }

  private extractGoals(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const goals: string[] = [];

    const goalPatterns = {
      'Manage anxiety': ['anxiety', 'anxious', 'panic', 'worry'],
      'Combat depression': ['depression', 'depressed', 'sad', 'hopeless'],
      'Build connections': ['lonely', 'isolated', 'connect', 'friends'],
      'Personal growth': ['improve', 'growth', 'better', 'progress'],
      'Stress management': ['stress', 'overwhelmed', 'pressure', 'burnout'],
      'Trauma recovery': ['trauma', 'ptsd', 'abuse', 'healing']
    };

    Object.entries(goalPatterns).forEach(([goal, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        goals.push(goal);
      }
    });

    return goals.length > 0 ? goals : ['General support'];
  }

  private extractNeeds(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const needs: string[] = [];

    if (lowerMessage.includes('support')) needs.push('Peer support');
    if (lowerMessage.includes('understand')) needs.push('Understanding');
    if (lowerMessage.includes('help')) needs.push('Guidance');
    if (lowerMessage.includes('cope') || lowerMessage.includes('coping')) needs.push('Coping strategies');
    if (lowerMessage.includes('share')) needs.push('Safe space to share');

    return needs.length > 0 ? needs : ['Community support'];
  }

  private extractChallenges(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const challenges: string[] = [];

    const challengePatterns = {
      'Anxiety disorders': ['anxiety', 'panic', 'worry', 'fear'],
      'Depression': ['depression', 'sad', 'hopeless', 'unmotivated'],
      'Relationship issues': ['relationship', 'partner', 'family', 'divorce'],
      'Work stress': ['work', 'job', 'career', 'boss'],
      'Health concerns': ['health', 'illness', 'chronic', 'pain'],
      'Social isolation': ['lonely', 'alone', 'isolated', 'no friends']
    };

    Object.entries(challengePatterns).forEach(([challenge, keywords]) => {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        challenges.push(challenge);
      }
    });

    return challenges;
  }

  private determineSupportType(message: string): 'recovery' | 'wellness' | 'general' | 'crisis' {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('recovery') || lowerMessage.includes('addiction')) {
      return 'recovery';
    }
    if (lowerMessage.includes('wellness') || lowerMessage.includes('self-care')) {
      return 'wellness';
    }
    if (lowerMessage.includes('crisis') || lowerMessage.includes('urgent')) {
      return 'crisis';
    }
    
    return 'general';
  }

  private buildRecommendationResponse(
    recommendations: any[],
    isListAll: boolean,
    originalMessage: string
  ): string {
    let response = '';

    if (isListAll) {
      response = `Here are all the available peer support groups:\n\n`;
    } else {
      response = `Based on what you've shared, I've found some wonderful peer support groups that could be a great fit for you:\n\n`;
    }

    recommendations.forEach((rec, index) => {
      response += `**${index + 1}. ${rec.groupName}**\n`;
      if (rec.reasoning) {
        response += `${rec.reasoning}\n`;
      }
      response += `• Match Score: ${Math.round(rec.matchScore * 100)}%\n`;
      
      if (rec.expectedBenefits && rec.expectedBenefits.length > 0) {
        response += `• What you'll gain: ${rec.expectedBenefits.slice(0, 2).join(', ')}\n`;
      }
      
      if (rec.nextSteps && rec.nextSteps.length > 0) {
        response += `• Next step: ${rec.nextSteps[0]}\n`;
      }
      
      response += '\n';
    });

    if (isListAll) {
      response += `These are all the currently active peer support groups. Each offers unique support and community. Would you like me to help you find the best match for your specific needs?`;
    } else {
      response += `These recommendations are based on your expressed needs and goals. Would you like to join any of these groups, or would you like more details about a specific one?`;
    }

    return response;
  }

  private buildBasicGroupListResponse(groups: any[], isListAll: boolean): string {
    let response = '';

    if (isListAll) {
      response = `Here are all ${groups.length} available peer support groups:\n\n`;
    } else {
      const displayCount = Math.min(3, groups.length);
      response = `I found ${groups.length} groups that might be helpful. Here are my top ${displayCount} recommendations:\n\n`;
      groups = groups.slice(0, displayCount);
    }

    groups.forEach((group, index) => {
      response += `**${index + 1}. ${group.name}**\n`;
      response += `${group.description}\n`;
      response += `• Members: ${group.memberCount}/${group.maxMembers || 8}\n`;
      response += `• Compatibility: ${Math.round(group.compatibility * 100)}%\n\n`;
    });

    response += `Would you like to join any of these groups or hear more about a specific one?`;

    return response;
  }

  private getNoGroupsResponse(): string {
    return `I'd love to help you find a supportive group, but it looks like we don't have any active groups available right now.

Would you like me to help you:
• Create a new support group based on your interests?
• Connect you with our therapist network for one-on-one support?
• Provide some self-help resources while we work on expanding our group offerings?

Your wellbeing is important, and we want to make sure you get the support you need.`;
  }

  protected getErrorResponse(): string {
    return `I apologize, but I'm having trouble accessing our group database right now. 

In the meantime, could you tell me more about what kind of support you're looking for? This will help me provide better recommendations once the system is back online.

Some helpful details might include:
• What challenges you're facing
• What type of group environment you prefer
• Any specific goals for your wellness journey`;
  }
}