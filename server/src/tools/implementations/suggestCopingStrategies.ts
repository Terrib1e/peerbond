/**
 * Suggest Coping Strategies Tool
 * Provides personalized, evidence-based coping strategies
 */

import { ToolContext, ToolResult } from '../types';
import { DatabaseService } from '../../services/database';
import { GeminiService } from '../../services/geminiService';

export interface SuggestCopingStrategiesParams {
  memberMessage: string;
  primaryEmotion?: string;
  copingStyle?: 'problem_focused' | 'emotion_focused' | 'meaning_focused' | 'social_support';
  timeAvailable?: 'immediate' | 'short_term' | 'long_term';
  environment?: 'private' | 'public' | 'work' | 'home';
}

/**
 * Suggest personalized coping strategies based on member's situation and needs
 */
export async function suggestCopingStrategies(
  params: SuggestCopingStrategiesParams,
  context: ToolContext
): Promise<ToolResult> {
  const dbService = new DatabaseService();
  const geminiService = new GeminiService();

  try {
    // Get member information and preferences
    const member = await dbService.getMemberById(context.memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    // Analyze the situation to determine best coping approaches
    const analysisPrompt = `Analyze this message to understand what coping strategies would be most helpful:

Member's message: "${params.memberMessage}"

Consider:
- What emotions are present?
- What type of situation are they dealing with?
- What level of distress?
- What might work best for them right now?

Provide your analysis in this format:
Emotions: [list]
Situation type: [internal/external/interpersonal/existential]
Distress level: [low/moderate/high]
Recommended approach: [problem_focused/emotion_focused/meaning_focused/social_support]`;

    const analysis = await geminiService.generateResponse(analysisPrompt);

    // Determine coping style if not provided
    const copingStyle = params.copingStyle || 'emotion_focused';
    const timeFrame = params.timeAvailable || 'immediate';
    const environment = params.environment || 'private';

    // Generate personalized coping strategies
    const strategiesPrompt = `You are Maya, a mental health facilitator. Suggest specific, actionable coping strategies for this member.

Member: ${member.firstName}
Member's experience level: ${member.experienceLevel}
Current situation: "${params.memberMessage}"
Analysis: ${analysis}

Preferences:
- Coping style: ${copingStyle}
- Time available: ${timeFrame}
- Environment: ${environment}

Provide 3-4 specific, practical coping strategies that:
1. Match their current emotional state and situation
2. Are appropriate for their experience level
3. Can be used in their current environment
4. Include both immediate relief and longer-term support
5. Are evidence-based (CBT, DBT, mindfulness, etc.)

Format each strategy with:
- A clear, simple name
- Step-by-step instructions
- Why it helps
- When to use it

Be encouraging and specific. Avoid generic advice.`;

    const strategiesResponse = await geminiService.generateResponse(strategiesPrompt);

    // Extract strategy categories for metadata
    const strategyCategories = [];
    if (strategiesResponse.toLowerCase().includes('breath')) strategyCategories.push('breathing');
    if (strategiesResponse.toLowerCase().includes('ground')) strategyCategories.push('grounding');
    if (strategiesResponse.toLowerCase().includes('thought')) strategyCategories.push('cognitive');
    if (strategiesResponse.toLowerCase().includes('body')) strategyCategories.push('somatic');
    if (strategiesResponse.toLowerCase().includes('social')) strategyCategories.push('interpersonal');

    // Determine if crisis resources should be mentioned
    const needsCrisisResources = params.memberMessage.toLowerCase().includes('suicid') ||
                                params.memberMessage.toLowerCase().includes('harm') ||
                                params.memberMessage.toLowerCase().includes('hopeless');

    // Log the tool usage
    await dbService.createAuditLog({
      memberId: context.memberId,
      action: 'tool_executed',
      resource: 'coping_strategies',
      resourceId: context.sessionId,
      ipAddress: 'system',
      memberAgent: 'maya-facilitator',
      metadata: {
        tool: 'suggestCopingStrategies',
        copingStyle,
        timeFrame,
        environment,
        strategyCategories,
        needsCrisisResources,
        memberExperienceLevel: member.experienceLevel
      }
    });

    return {
      success: true,
      data: {
        strategies: strategiesResponse.trim(),
        copingStyle,
        timeFrame,
        environment,
        strategyCategories,
        needsCrisisResources,
        memberName: member.firstName,
        analysisInsight: analysis
      },
      metadata: {
        toolName: 'suggestCopingStrategies',
        confidence: 0.88,
        strategiesProvided: strategyCategories.length,
        personalized: true,
        evidenceBased: true
      }
    };

  } catch (error) {
    console.error('[SuggestCopingStrategies] Error:', error);

    // Fallback coping strategies
    const fallbackStrategies = `Here are some gentle coping strategies you can try right now:

**Deep Breathing (2-3 minutes)**
- Breathe in slowly for 4 counts
- Hold for 4 counts  
- Breathe out slowly for 6 counts
- This activates your body's natural calm response

**5-4-3-2-1 Grounding**
- Notice 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste
- This brings you into the present moment

**Self-Compassion Break**
- Place your hand on your heart
- Remind yourself: "This is a moment of difficulty"
- "Difficulty is part of life"
- "May I be kind to myself right now"

Remember, coping strategies work best with practice. Be patient with yourself as you try these.`;

    return {
      success: false,
      data: { 
        strategies: fallbackStrategies,
        copingStyle: 'general',
        fallback: true
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        toolName: 'suggestCopingStrategies',
        confidence: 0.5,
        fallback: true
      }
    };
  }
}