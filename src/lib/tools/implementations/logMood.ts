import { z } from 'zod';
import { BaseTool } from '../base';
import { ToolContext } from '../types';

const LogMoodSchema = z.object({
  mood: z.enum(['very_negative', 'negative', 'neutral', 'positive', 'very_positive'])
    .describe('The current mood state'),
  score: z.number().min(-1).max(1).describe('Mood score from -1 (very negative) to 1 (very positive)'),
  note: z.string().max(500).optional().describe('Optional note about the mood'),
  triggers: z.array(z.string()).optional().describe('Identified triggers for the mood'),
  copingStrategies: z.array(z.string()).optional().describe('Coping strategies used or planned')
});

type LogMoodArgs = z.infer<typeof LogMoodSchema>;

interface MoodLogResult {
  logId: string;
  timestamp: Date;
  trend: 'improving' | 'stable' | 'declining';
  alertTriggered: boolean;
}

export class LogMoodTool extends BaseTool<LogMoodArgs, MoodLogResult> {
  name = 'logMood';
  description = 'Logs a member\'s current mood state and analyzes trends';
  schema = LogMoodSchema;
  permissions = ['mood:write', 'member:write'];
  rateLimit = { requests: 20, window: 3600 }; // 20 logs per hour

  protected async run(args: LogMoodArgs, context: ToolContext): Promise<MoodLogResult> {
    const logId = `mood_${Date.now()}_${context.memberId}`;

    // In a real implementation, this would:
    // 1. Store in time-series database
    // 2. Calculate trend based on historical data
    // 3. Check for crisis patterns
    // 4. Trigger alerts if needed

    // Mock trend calculation
    const trend = this.calculateTrend(args.score);
    const alertTriggered = this.checkCrisisPattern(args);

    // Log the mood entry
    console.log(`Mood logged for member ${context.memberId}:`, {
      logId,
      mood: args.mood,
      score: args.score,
      hasNote: !!args.note,
      triggerCount: args.triggers?.length || 0
    });

    return {
      logId,
      timestamp: new Date(),
      trend,
      alertTriggered
    };
  }

  private calculateTrend(currentScore: number): 'improving' | 'stable' | 'declining' {
    // In real implementation, compare with historical data
    // Mock implementation based on score
    if (currentScore > 0.3) return 'improving';
    if (currentScore < -0.3) return 'declining';
    return 'stable';
  }

  private checkCrisisPattern(args: LogMoodArgs): boolean {
    // Check for crisis indicators
    const crisisKeywords = [
      'suicide', 'self-harm', 'hopeless', 'worthless',
      'end it all', 'no point', 'can\'t go on'
    ];

    const noteText = (args.note || '').toLowerCase();
    const triggersText = (args.triggers || []).join(' ').toLowerCase();
    const allText = `${noteText} ${triggersText}`;

    const hasCrisisKeyword = crisisKeywords.some(keyword =>
      allText.includes(keyword)
    );

    const hasVerySevereScore = args.score <= -0.8;

    return hasCrisisKeyword || hasVerySevereScore;
  }

  async validate(args: LogMoodArgs, _context: ToolContext): Promise<boolean> {
    // Ensure mood enum matches score
    const moodScoreMap = {
      'very_negative': [-1, -0.6],
      'negative': [-0.6, -0.2],
      'neutral': [-0.2, 0.2],
      'positive': [0.2, 0.6],
      'very_positive': [0.6, 1]
    };

    const [min, max] = moodScoreMap[args.mood];
    if (args.score < min || args.score > max) {
      throw new Error(`Score ${args.score} doesn't match mood ${args.mood}`);
    }

    return true;
  }
}