/**
 * Log Mood Tool
 * Records member mood and emotional state for tracking
 */

import { ToolContext, ToolResult } from '../schemas';
import { DatabaseService } from '../../services/database';

export interface LogMoodParams {
  memberMessage: string;
  moodScore?: number; // 1-10 scale
  emotions?: string[]; // Array of emotion labels
  triggers?: string; // What triggered this mood
  notes?: string; // Additional member notes
}

/**
 * Record member mood and emotional state in the database
 */
export async function logMood(
  params: LogMoodParams,
  context: ToolContext
): Promise<ToolResult> {
  const dbService = new DatabaseService();

  try {
    // Extract mood information from message if not provided
    let moodScore = params.moodScore;
    let emotions = params.emotions || [];

    if (!moodScore) {
      // Simple mood analysis from text
      const message = params.memberMessage.toLowerCase();
      if (message.includes('great') || message.includes('amazing') || message.includes('fantastic')) {
        moodScore = 9;
      } else if (message.includes('good') || message.includes('better') || message.includes('happy')) {
        moodScore = 7;
      } else if (message.includes('okay') || message.includes('fine') || message.includes('alright')) {
        moodScore = 5;
      } else if (message.includes('bad') || message.includes('sad') || message.includes('down')) {
        moodScore = 3;
      } else if (message.includes('terrible') || message.includes('awful') || message.includes('horrible')) {
        moodScore = 1;
      } else {
        moodScore = 5; // Default neutral
      }
    }

    // Extract emotions from message
    if (emotions.length === 0) {
      const message = params.memberMessage.toLowerCase();
      if (message.includes('anxious') || message.includes('worried')) emotions.push('anxious');
      if (message.includes('sad') || message.includes('depressed')) emotions.push('sad');
      if (message.includes('angry') || message.includes('frustrated')) emotions.push('angry');
      if (message.includes('happy') || message.includes('joy')) emotions.push('happy');
      if (message.includes('stressed') || message.includes('overwhelmed')) emotions.push('stressed');
      if (message.includes('lonely') || message.includes('isolated')) emotions.push('lonely');
    }

    // Create mood entry in database
    const moodEntry = await dbService.createMoodEntry({
      memberId: context.memberId,
      score: moodScore,
      emotions: emotions.join(', '),
      triggers: params.triggers || 'Not specified',
      notes: params.notes || params.memberMessage
    });

    // Log tool usage for audit trail
    await dbService.createAuditLog({
      memberId: context.memberId,
      action: 'tool_executed',
      resource: 'mood_entry',
      resourceId: moodEntry.id,
      ipAddress: 'system',
      memberAgent: 'maya-tracker',
      metadata: {
        tool: 'logMood',
        moodScore,
        emotions: emotions.join(', '),
        extractedFromMessage: !params.moodScore
      }
    });

    const encouragement = moodScore >= 7
      ? "It's wonderful that you're feeling positive! Tracking these good moments helps build resilience."
      : moodScore >= 4
      ? "Thank you for sharing how you're feeling. Tracking your mood helps us understand your patterns better."
      : "I appreciate you being honest about how you're feeling. Remember that difficult emotions are temporary and valid.";

    return {
      success: true,
      data: {
        moodEntry,
        moodScore,
        emotions,
        encouragement,
        trackingStreak: await getMoodTrackingStreak(context.memberId, dbService)
      },
      metadata: {
        toolName: 'logMood',
        confidence: 0.9,
        emotional_state: moodScore >= 7 ? 'positive' : moodScore >= 4 ? 'neutral' : 'needs_support'
      }
    };

  } catch (error) {
    console.error('[LogMood] Error:', error);

    return {
      success: false,
      data: {
        message: "I appreciate you wanting to track your mood. While I couldn't save it right now, sharing how you feel is always valuable. How has your mood been overall today?"
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        toolName: 'logMood',
        confidence: 0.2,
        fallback: true
      }
    };
  }
}

async function getMoodTrackingStreak(memberId: string, dbService: DatabaseService): Promise<number> {
  try {
    // TODO: Implement proper mood streak calculation when method is available
    // implement:
    // get the last 7 days of mood entries
    // count the number of days with a mood score of 7 or higher
    // return the number of days

    // get the last 7 days of mood entries
    const moodEntries = await dbService.getMoodEntries(memberId, 7);
    // count the number of days with a mood score of 7 or higher
    const positiveDays = moodEntries.filter(entry => entry.score >= 7).length;
    // return the number of days
    return positiveDays;



  } catch (error) {
    return 0;
  }
}

export default {
  name: 'logMood',
  description: 'Log mood entry for member',
  agent: 'chat',
  execute: logMood
}