/**
 * Search Groups Tool
 * Finds peer support groups matching member criteria
 */

import { ToolContext, ToolResult } from '../schemas';
import { DatabaseService } from '../../services/database';

export interface SearchGroupsParams {
  memberMessage: string;
  groupType?: 'recovery' | 'wellness' | 'general';
  interests?: string[];
  maxResults?: number;
  memberLocation?: string;
}

/**
 * Search for groups matching member criteria and preferences
 */
export async function searchGroups(
  params: SearchGroupsParams,
  context: ToolContext
): Promise<ToolResult> {
  const dbService = new DatabaseService();

  try {
    // Extract search criteria from member message if not provided
    const searchCriteria = extractSearchCriteria(params.memberMessage);
    const groupType = params.groupType || searchCriteria.groupType;
    const interests = params.interests || searchCriteria.interests;
    const maxResults = params.maxResults || 6;

    // Get member's current groups to avoid duplicates
    const memberGroups = await dbService.getMemberGroups(context.memberId);
    const memberGroupIds = memberGroups.map(g => g.id);
    
    // Search for groups based on criteria
    const searchFilters = {
      type: groupType,
      status: true, // Only active groups
      publicOnly: true, // Only public groups (isPrivate = false)
      search: interests.length > 0 ? interests[interests.length - 1] : undefined // Use the last/most specific interest
    };

    const searchResults = await dbService.getGroups(1, maxResults * 2, searchFilters);
    
    // Filter out groups member is already in and rank by relevance
    const availableGroups = searchResults.groups
      .filter(group => !memberGroupIds.includes(group.id))
      .map(group => ({
        ...group,
        relevanceScore: calculateRelevanceScore(group, interests, params.memberMessage),
        memberCount: group.members?.length || 0,
        canJoin: (group.members?.length || 0) < group.maxMembers
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults);

    // Create response message
    let responseMessage = '';
    if (availableGroups.length === 0) {
      responseMessage = `I wasn't able to find any ${groupType || 'support'} groups for you right now, but I don't want you to feel stuck.\n\nWe could try creating a new group based on your interests, or I can keep an eye out and notify you as soon as one becomes available. What sounds better to you?`;
    } else {
      responseMessage = `I found ${availableGroups.length} ${groupType || 'support'} groups that might be a good fit for you:\n\n`;
      
      availableGroups.forEach((group, index) => {
        responseMessage += `**${group.name}**\n`;
        responseMessage += `${group.description}\n`;
        responseMessage += `${group.memberCount}/${group.maxMembers} members`;
        if (group.tags && group.tags.length > 0) {
          responseMessage += ` • ${group.tags.join(', ')}`;
        }
        responseMessage += group.canJoin ? ' • Open to join' : ' • Currently full';
        responseMessage += '\n\n';
      });
      
      responseMessage += 'Any of these sound like a good fit? I can help you join one, or we could look for something different.';
    }

    // Log tool usage
    await dbService.createAuditLog({
      memberId: context.memberId,
      action: 'tool_executed',
      resource: 'group_search',
      resourceId: context.sessionId,
      ipAddress: 'system',
      memberAgent: 'maya-matching',
      metadata: {
        tool: 'searchGroups',
        groupType,
        interests: interests.join(', '),
        resultsFound: availableGroups.length,
        searchCriteria
      }
    });

    return {
      success: true,
      data: {
        groups: availableGroups,
        responseMessage,
        searchCriteria: {
          groupType,
          interests,
          totalResults: availableGroups.length
        }
      },
      metadata: {
        toolName: 'searchGroups',
        confidence: 0.85,
        groups_found: availableGroups.length,
        next_actions: availableGroups.length > 0 ? ['join_group', 'get_more_info'] : ['create_group', 'modify_search']
      }
    };

  } catch (error) {
    console.error('[SearchGroups] Error:', error);
    
    return {
      success: false,
      data: { 
        message: "I'd love to help you find peer support groups! While I'm having trouble searching right now, I can tell you that we have recovery, wellness, and general support groups available. What type of support are you most interested in?"
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        toolName: 'searchGroups',
        confidence: 0.3,
        fallback: true
      }
    };
  }
}

function extractSearchCriteria(message: string): {
  groupType: 'recovery' | 'wellness' | 'general';
  interests: string[];
} {
  const messageLower = message.toLowerCase();
  let groupType: 'recovery' | 'wellness' | 'general' = 'general';
  const interests: string[] = [];

  // Determine group type from message
  if (messageLower.includes('recovery') || messageLower.includes('addiction') || messageLower.includes('sober')) {
    groupType = 'recovery';
    interests.push('recovery', 'sobriety', 'addiction support');
  } else if (messageLower.includes('wellness') || messageLower.includes('mental health') || messageLower.includes('anxiety') || messageLower.includes('depression')) {
    groupType = 'wellness';
    interests.push('mental health', 'wellness', 'self-care');
  } else {
    groupType = 'general';
    interests.push('peer support', 'community');
  }

  // Extract specific interests
  const interestKeywords = {
    'anxiety': ['anxiety', 'anxious', 'panic', 'worry'],
    'depression': ['depression', 'sad', 'depressed', 'low mood'],
    'stress': ['stress', 'stressed', 'overwhelmed', 'pressure'],
    'trauma': ['trauma', 'ptsd', 'abuse', 'traumatic'],
    'relationships': ['relationship', 'dating', 'marriage', 'family'],
    'work': ['work', 'job', 'career', 'workplace', 'professional'],
    'parenting': ['parent', 'parenting', 'children', 'kids', 'mom', 'dad'],
    'grief': ['grief', 'loss', 'mourning', 'bereavement', 'death'],
    'self-esteem': ['self-esteem', 'confidence', 'self-worth', 'self-image'],
    'mindfulness': ['mindfulness', 'meditation', 'mindful', 'zen']
  };

  Object.entries(interestKeywords).forEach(([interest, keywords]) => {
    if (keywords.some(keyword => messageLower.includes(keyword))) {
      interests.push(interest);
    }
  });

  return { groupType, interests };
}

function calculateRelevanceScore(group: any, interests: string[], message: string): number {
  let score = 0;
  const messageLower = message.toLowerCase();
  const groupText = `${group.name} ${group.description} ${group.tags?.join(' ') || ''}`.toLowerCase();

  // Score based on group type match
  if (group.type === 'recovery' && (messageLower.includes('recovery') || messageLower.includes('addiction'))) {
    score += 10;
  } else if (group.type === 'wellness' && (messageLower.includes('wellness') || messageLower.includes('mental health'))) {
    score += 10;
  }

  // Score based on interest matches
  interests.forEach(interest => {
    if (groupText.includes(interest.toLowerCase())) {
      score += 5;
    }
  });

  // Score based on keyword matches in message
  const messageWords = messageLower.split(' ');
  messageWords.forEach(word => {
    if (word.length > 3 && groupText.includes(word)) {
      score += 2;
    }
  });

  // Prefer groups with moderate membership (not too empty, not too full)
  const memberCount = group.members?.length || 0;
  const membershipRatio = memberCount / group.maxMembers;
  if (membershipRatio >= 0.3 && membershipRatio <= 0.8) {
    score += 3;
  }

  // Recent activity bonus
  if (group.lastActivity) {
    const daysSinceActivity = (Date.now() - new Date(group.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActivity <= 7) {
      score += 5;
    } else if (daysSinceActivity <= 30) {
      score += 2;
    }
  }

  return score;
}