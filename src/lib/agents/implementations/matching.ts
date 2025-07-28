import { BaseAgent } from '../base';

export class MatchingAgent extends BaseAgent {
  id = 'matching-agent';
  name = 'Matching Agent';
  description = 'Finds and recommends suitable peer support groups based on user needs';
  model = 'gpt-4o';
  provider = 'openai';

  tools = [
    'suggestGroup',
    'listAllGroups'
  ];

  systemPrompt = `You are a specialized AI agent for matching users with appropriate peer support groups.

Your role:
- Analyze user needs, goals, and preferences
- Match users with suitable peer support groups
- Provide comprehensive group recommendations
- Help users understand group dynamics and benefits
- Facilitate connections within the peer support community

Available tools:
- suggestGroup: Find the best matching groups for specific user needs
- listAllGroups: Show all available groups when users want to browse options

Guidelines:
- Always consider user safety and comfort level
- Match based on specific challenges, goals, and preferences
- Explain why certain groups are recommended
- Provide clear information about group dynamics, schedules, and expectations
- Encourage gradual engagement for anxious users
- Respect privacy and confidentiality preferences

Response patterns:
- Be warm and encouraging about group participation
- Address any concerns about joining groups
- Highlight the benefits of peer support
- Provide practical next steps for joining
- Follow up on group experiences when appropriate

Remember: Peer support groups can be transformative, but the right match is crucial for success.`;

  async findGroupsForUser(
    sessionId: string,
    userId: string,
    criteria: {
      goals?: string[];
      challenges?: string[];
      preferences?: string[];
      showAll?: boolean;
    }
  ): Promise<string> {
    const context = {
      searchCriteria: criteria,
      userId,
      requestType: criteria.showAll ? 'list_all' : 'targeted_search'
    };

    let prompt = '';
    
    if (criteria.showAll) {
      prompt = `Please list all available peer support groups for user ${userId}. Show comprehensive details about each group including meeting times, focus areas, and member capacity.`;
    } else {
      prompt = `Find suitable peer support groups for a user with the following needs:
      - Goals: ${criteria.goals?.join(', ') || 'general support'}
      - Challenges: ${criteria.challenges?.join(', ') || 'none specified'}
      - Preferences: ${criteria.preferences?.join(', ') || 'none specified'}
      
      Please suggest the best matching groups and explain why they're good fits.`;
    }

    const response = await this.processMessage(sessionId, prompt, context);
    return response.message;
  }

  async explainGroupBenefits(sessionId: string, groupType: string): Promise<string> {
    const prompt = `Explain the benefits and what to expect from joining a ${groupType} peer support group. Address common concerns about group participation.`;

    const response = await this.processMessage(sessionId, prompt, {
      activityType: 'group_education',
      groupType
    });

    return response.message;
  }

  async helpWithGroupJoining(
    sessionId: string,
    groupId: string,
    userConcerns?: string[]
  ): Promise<string> {
    let prompt = `Help the user understand the process of joining group ${groupId} and provide encouragement.`;
    
    if (userConcerns && userConcerns.length > 0) {
      prompt += ` Address these specific concerns: ${userConcerns.join(', ')}`;
    }

    const response = await this.processMessage(sessionId, prompt, {
      activityType: 'joining_assistance',
      targetGroup: groupId,
      concerns: userConcerns
    });

    return response.message;
  }
}