/**
 * Summarize Session Tool Implementation
 * Generates session summaries for dashboards and analytics
 */

import { z } from 'zod';
import { SummarizeSessionTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function summarizeSession(
  params: z.infer<typeof SummarizeSessionTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { 
      groupId,
      sessionId, 
      includeParticipants,
      includeKeyTopics,
      includeActionItems,
      summaryType,
      audienceType
    } = params;

    logger.info('[summarizeSession] Generating session summary', {
      groupId,
      sessionId,
      summaryType,
      audienceType,
      includeParticipants,
      includeKeyTopics,
      includeActionItems,
      agent: context.agent
    });

    // Simulate session data based on parameters
    const sessionData = await generateSessionData(groupId, sessionId, summaryType);
    
    // Build summary components based on what's requested
    const highlights: string[] = [];
    const concerns: string[] = [];
    
    if (includeParticipants) {
      highlights.push(`Session included ${sessionData.participantCount} active participants`);
    }
    
    if (includeKeyTopics) {
      highlights.push(`Key topics: ${sessionData.keyTopics.join(', ')}`);
    }
    
    if (includeActionItems && sessionData.actionItemsCreated > 0) {
      highlights.push(`${sessionData.actionItemsCreated} action items created for follow-up`);
    }

    // Add concerns based on session data
    if (sessionData.overallSentiment < -0.5) {
      concerns.push('Participants showed signs of distress during session');
    }
    
    if (sessionData.engagementScore < 0.5) {
      concerns.push('Low engagement levels detected');
    }

    // Generate recommendations based on audience type
    const recommendations = generateAudienceSpecificRecommendations(
      audienceType, 
      sessionData,
      summaryType
    );

    // Build summary text
    const summary = buildSummaryText(sessionData, summaryType, audienceType);

    return {
      success: true,
      data: {
        summary,
        keyMetrics: {
          duration: sessionData.duration,
          participantCount: sessionData.participantCount,
          messageCount: sessionData.messageCount,
          engagementScore: sessionData.engagementScore
        },
        highlights,
        concerns: concerns.length > 0 ? concerns : undefined,
        recommendations
      },
      confidence: 0.9,
      metadata: {
        groupId,
        sessionId,
        summaryType,
        audienceType,
        summarizedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('[summarizeSession] Error generating summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate session summary',
      confidence: 0.3
    };
  }
}

async function generateSessionData(groupId: string, sessionId: string, summaryType: string): Promise<any> {
  // Simulate fetching session data (in production, this would query the database)
  await new Promise(resolve => setTimeout(resolve, 100));

  const sessionDuration = Math.floor(Math.random() * 45) + 15; // 15-60 minutes
  const messageCount = Math.floor(Math.random() * 30) + 10; // 10-40 messages
  const participantCount = Math.floor(Math.random() * 6) + 2; // 2-8 participants

  // Generate realistic session topics
  const possibleTopics = [
    'anxiety management', 'coping strategies', 'self-care practices', 
    'relationship challenges', 'work stress', 'personal growth',
    'mindfulness techniques', 'goal setting', 'progress reflection'
  ];
  
  const keyTopics = possibleTopics
    .sort(() => 0.5 - Math.random())
    .slice(0, Math.floor(Math.random() * 4) + 2);

  // Calculate engagement score
  const engagementScore = Math.min(
    0.3 + (messageCount / participantCount / 10) + (Math.random() * 0.4),
    1.0
  );

  const overallSentiment = (Math.random() - 0.3) * 1.2; // -0.36 to 0.84 range
  const actionItemsCreated = Math.floor(Math.random() * 3);

  return {
    duration: `${sessionDuration} minutes`,
    messageCount,
    participantCount,
    keyTopics,
    engagementScore,
    overallSentiment,
    actionItemsCreated,
    sessionDuration // Keep numeric version for calculations
  };
}

function generateAudienceSpecificRecommendations(
  audienceType: string,
  sessionData: any,
  summaryType: string
): string[] {
  const recommendations: string[] = [];

  if (audienceType === 'admin') {
    recommendations.push('Monitor group engagement levels');
    if (sessionData.engagementScore < 0.6) {
      recommendations.push('Consider facilitator training or group restructuring');
    }
    recommendations.push('Review session analytics for optimization opportunities');
  } else if (audienceType === 'therapist') {
    if (sessionData.overallSentiment < -0.3) {
      recommendations.push('Schedule individual check-ins with distressed participants');
      recommendations.push('Consider additional crisis prevention resources');
    }
    recommendations.push('Follow up on action items created during session');
    recommendations.push('Review therapeutic progress with regular participants');
  } else if (audienceType === 'participant') {
    recommendations.push('Continue engaging in group discussions');
    if (sessionData.actionItemsCreated > 0) {
      recommendations.push('Work on personal action items before next session');
    }
    recommendations.push('Practice techniques discussed in group');
  }

  // Summary type specific recommendations
  if (summaryType === 'clinical') {
    recommendations.push('Document therapeutic outcomes for treatment planning');
  }

  return recommendations;
}

function buildSummaryText(sessionData: any, summaryType: string, audienceType: string): string {
  let summary = '';

  if (summaryType === 'brief') {
    summary = `${sessionData.participantCount} participants engaged in a ${sessionData.duration} session. `;
    summary += `Key topics: ${sessionData.keyTopics.slice(0, 2).join(', ')}. `;
    summary += `Overall engagement: ${Math.round(sessionData.engagementScore * 100)}%.`;
  } else if (summaryType === 'clinical') {
    summary = `Clinical Summary: Group session with ${sessionData.participantCount} participants over ${sessionData.duration}. `;
    summary += `Therapeutic focus areas included ${sessionData.keyTopics.join(', ')}. `;
    summary += `Average sentiment score: ${sessionData.overallSentiment.toFixed(2)}. `;
    summary += `Engagement metrics indicate ${sessionData.engagementScore > 0.7 ? 'high' : sessionData.engagementScore > 0.4 ? 'moderate' : 'low'} participant involvement. `;
    if (sessionData.actionItemsCreated > 0) {
      summary += `${sessionData.actionItemsCreated} therapeutic action items were established. `;
    }
    summary += 'Continued monitoring and intervention planning recommended.';
  } else { // detailed
    summary = `Comprehensive session summary for ${sessionData.duration} group session. `;
    summary += `${sessionData.participantCount} participants actively engaged in discussions covering ${sessionData.keyTopics.join(', ')}. `;
    
    // Engagement analysis
    if (sessionData.engagementScore > 0.7) {
      summary += 'High levels of participant engagement were observed throughout the session. ';
    } else if (sessionData.engagementScore > 0.4) {
      summary += 'Moderate engagement levels with opportunities for increased participation. ';
    } else {
      summary += 'Lower engagement levels may indicate need for session format adjustments. ';
    }

    // Sentiment analysis
    if (sessionData.overallSentiment > 0.3) {
      summary += 'Overall positive emotional tone with participants expressing hope and progress. ';
    } else if (sessionData.overallSentiment < -0.3) {
      summary += 'Some participants expressed distress; additional support may be beneficial. ';
    } else {
      summary += 'Balanced emotional tone with mix of challenges and coping strategies discussed. ';
    }

    // Action items
    if (sessionData.actionItemsCreated > 0) {
      summary += `${sessionData.actionItemsCreated} concrete action items were established to support participant goals. `;
    }

    summary += 'Session demonstrates ongoing therapeutic value and community support benefits.';
  }

  return summary;
}

export default {
  name: SummarizeSessionTool.name,
  description: SummarizeSessionTool.description,
  agent: SummarizeSessionTool.agent,
  execute: summarizeSession
};