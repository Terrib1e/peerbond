/**
 * Adapt To Member Tool Implementation
 * Adapts interaction style based on member behavior and preferences
 */

import { z } from 'zod';
import { AdaptToMemberTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function adaptToMember(
  params: z.infer<typeof AdaptToMemberTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { memberId, interactionHistory, currentContext, adaptationAreas } = params;

    logger.info('[adaptToMember] Adapting interaction style', {
      memberId,
      currentContext,
      adaptationAreas,
      historyLength: interactionHistory?.length || 0,
      agent: context.agent
    });

    // Retrieve member preferences and profile
    const memberProfile = await retrieveMemberProfile(memberId);
    
    // Analyze interaction history for patterns
    const historyAnalysis = analyzeInteractionHistory(interactionHistory || []);
    
    // Generate adaptations for each requested area
    const adaptations = await generateAdaptations(
      memberProfile,
      historyAnalysis,
      currentContext,
      adaptationAreas
    );

    // Calculate confidence based on available data
    const confidence = calculateAdaptationConfidence(memberProfile, historyAnalysis, adaptationAreas);

    logger.info('[adaptToMember] Adaptation analysis completed', {
      memberId,
      adaptedApproach: adaptations.adaptedApproach,
      recommendedTone: adaptations.recommendedTone,
      confidence,
      adaptationFactors: adaptations.adaptationFactors.length
    });

    return {
      success: true,
      data: {
        adaptedApproach: adaptations.adaptedApproach,
        recommendedTone: adaptations.recommendedTone,
        suggestedExamples: adaptations.suggestedExamples,
        avoidanceList: adaptations.avoidanceList,
        confidence
      },
      confidence,
      metadata: {
        memberId,
        currentContext,
        adaptationAreas,
        memberProfile: {
          hasPreferences: !!memberProfile.preferences,
          historyLength: historyAnalysis.totalInteractions,
          adaptationFactors: adaptations.adaptationFactors
        },
        analysisTimestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('[adaptToMember] Error adapting to member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to adapt to member preferences',
      confidence: 0.3
    };
  }
}

async function retrieveMemberProfile(memberId: string): Promise<any> {
  // Simulate database lookup (in production, this would query the database)
  await new Promise(resolve => setTimeout(resolve, 150));

  // Generate realistic member profile based on ID patterns
  const profileVariant = Math.abs(memberId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 5;
  
  const profiles = [
    {
      preferences: {
        communicationStyle: 'gentle',
        preferredSupport: ['validation', 'resources'],
        triggerWords: ['failure', 'stupid'],
        notificationSettings: { frequency: 'daily' }
      },
      demographics: { ageRange: '25-34', supportExperience: 'beginner' },
      challenges: ['anxiety', 'self-esteem'],
      strengths: ['empathy', 'resilience'],
      learningStyle: 'visual'
    },
    {
      preferences: {
        communicationStyle: 'direct',
        preferredSupport: ['practical_advice', 'peer_connection'],
        notificationSettings: { frequency: 'weekly' }
      },
      demographics: { ageRange: '35-44', supportExperience: 'intermediate' },
      challenges: ['work_stress', 'relationships'],
      strengths: ['problem-solving', 'determination'],
      learningStyle: 'kinesthetic'
    },
    {
      preferences: {
        communicationStyle: 'encouraging',
        preferredSupport: ['validation', 'peer_connection'],
        triggerWords: ['weak', 'burden'],
        availabilityHours: '18:00-22:00'
      },
      demographics: { ageRange: '18-24', supportExperience: 'beginner' },
      challenges: ['depression', 'social_anxiety'],
      strengths: ['creativity', 'self-awareness'],
      learningStyle: 'auditory'
    },
    {
      preferences: {
        communicationStyle: 'analytical',
        preferredSupport: ['resources', 'practical_advice'],
        notificationSettings: { frequency: 'immediate', methods: ['email'] }
      },
      demographics: { ageRange: '45-54', supportExperience: 'advanced' },
      challenges: ['trauma', 'work_stress'],
      strengths: ['analytical_thinking', 'resilience'],
      learningStyle: 'reading'
    },
    {
      preferences: {},
      demographics: { ageRange: '25-34', supportExperience: 'beginner' },
      challenges: ['anxiety'],
      strengths: ['empathy'],
      learningStyle: undefined
    }
  ];

  return profiles[profileVariant];
}

function analyzeInteractionHistory(history: any[]): any {
  if (history.length === 0) {
    return {
      totalInteractions: 0,
      effectivenessPattern: 'unknown',
      preferredTypes: [],
      responsePatterns: {},
      engagement: 'unknown'
    };
  }

  // Analyze interaction effectiveness
  const averageEffectiveness = history.reduce((sum, interaction) => 
    sum + (interaction.effectiveness || 0.5), 0) / history.length;

  let effectivenessPattern: string;
  if (averageEffectiveness > 0.7) effectivenessPattern = 'high_engagement';
  else if (averageEffectiveness > 0.5) effectivenessPattern = 'moderate_engagement';
  else effectivenessPattern = 'low_engagement';

  // Identify preferred interaction types
  const typeEffectiveness: Record<string, number[]> = {};
  history.forEach(interaction => {
    if (!typeEffectiveness[interaction.type]) {
      typeEffectiveness[interaction.type] = [];
    }
    typeEffectiveness[interaction.type].push(interaction.effectiveness || 0.5);
  });

  const preferredTypes = Object.entries(typeEffectiveness)
    .map(([type, scores]) => ({
      type,
      avgEffectiveness: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .filter(item => item.avgEffectiveness > 0.6)
    .sort((a, b) => b.avgEffectiveness - a.avgEffectiveness)
    .map(item => item.type);

  // Analyze response patterns
  const responsePatterns = {
    respondsWellToValidation: history.some(h => h.type === 'validation' && h.effectiveness > 0.7),
    prefersDetailedExplanations: history.some(h => h.type === 'detailed' && h.effectiveness > 0.6),
    engagesWithPeerStories: history.some(h => h.type === 'peer_example' && h.effectiveness > 0.6),
    respondsToChallenging: history.some(h => h.type === 'challenging' && h.effectiveness > 0.6)
  };

  return {
    totalInteractions: history.length,
    effectivenessPattern,
    preferredTypes,
    responsePatterns,
    engagement: effectivenessPattern,
    averageEffectiveness
  };
}

async function generateAdaptations(
  memberProfile: any,
  historyAnalysis: any,
  currentContext: string,
  adaptationAreas: string[]
): Promise<any> {
  const adaptations: any = {
    adaptedApproach: 'supportive',
    recommendedTone: 'warm',
    suggestedExamples: [],
    avoidanceList: [],
    adaptationFactors: []
  };

  // Adapt tone based on preferences and context
  if (adaptationAreas.includes('tone')) {
    adaptations.recommendedTone = adaptTone(memberProfile, currentContext, historyAnalysis);
    adaptations.adaptationFactors.push(`Tone adapted based on ${memberProfile.preferences?.communicationStyle || 'interaction history'}`);
  }

  // Adapt approach based on support preferences and effectiveness
  if (adaptationAreas.includes('approach')) {
    adaptations.adaptedApproach = adaptApproach(memberProfile, historyAnalysis, currentContext);
    adaptations.adaptationFactors.push(`Approach adapted for ${currentContext} context`);
  }

  // Generate contextual examples
  if (adaptationAreas.includes('examples')) {
    adaptations.suggestedExamples = generateContextualExamples(
      memberProfile,
      currentContext,
      historyAnalysis
    );
    adaptations.adaptationFactors.push(`Examples tailored to ${memberProfile.learningStyle || 'general'} learning style`);
  }

  // Adapt pacing based on availability and preferences
  if (adaptationAreas.includes('pacing')) {
    const pacingStrategy = adaptPacing(memberProfile, currentContext);
    adaptations.pacingStrategy = pacingStrategy;
    adaptations.adaptationFactors.push(`Pacing adjusted for ${pacingStrategy} delivery`);
  }

  // Adapt depth based on experience and context
  if (adaptationAreas.includes('depth')) {
    const depthLevel = adaptDepth(memberProfile, historyAnalysis, currentContext);
    adaptations.depthLevel = depthLevel;
    adaptations.adaptationFactors.push(`Content depth set to ${depthLevel} level`);
  }

  // Build avoidance list
  adaptations.avoidanceList = buildAvoidanceList(memberProfile, historyAnalysis);

  return adaptations;
}

function adaptTone(memberProfile: any, currentContext: string, historyAnalysis: any): string {
  // Start with preference-based tone
  let tone = memberProfile.preferences?.communicationStyle || 'warm';

  // Adjust based on context
  const contextAdjustments: Record<string, string> = {
    'crisis': 'gentle',
    'celebration': 'encouraging',
    'learning': 'supportive',
    'routine_check': 'warm',
    'seeking_support': 'compassionate'
  };

  const contextTone = contextAdjustments[currentContext];
  if (contextTone && contextTone !== tone) {
    // Blend tones for context
    const toneBlends: Record<string, Record<string, string>> = {
      'direct': {
        'gentle': 'supportive',
        'encouraging': 'motivational',
        'compassionate': 'understanding'
      },
      'gentle': {
        'encouraging': 'nurturing',
        'supportive': 'caring'
      },
      'encouraging': {
        'gentle': 'nurturing',
        'supportive': 'uplifting'
      }
    };

    tone = toneBlends[tone]?.[contextTone] || contextTone;
  }

  // Adjust based on history
  if (historyAnalysis.effectivenessPattern === 'low_engagement') {
    tone = tone === 'direct' ? 'gentle' : 'encouraging';
  }

  return tone;
}

function adaptApproach(memberProfile: any, historyAnalysis: any, currentContext: string): string {
  // Base approach on preferred support types
  const supportPreferences = memberProfile.preferences?.preferredSupport || [];
  
  if (supportPreferences.includes('practical_advice')) {
    return 'solution_focused';
  } else if (supportPreferences.includes('validation')) {
    return 'validation_focused';
  } else if (supportPreferences.includes('resources')) {
    return 'educational';
  } else if (supportPreferences.includes('peer_connection')) {
    return 'collaborative';
  }

  // Adjust based on interaction history
  if (historyAnalysis.preferredTypes.includes('challenging')) {
    return 'growth_oriented';
  } else if (historyAnalysis.preferredTypes.includes('validation')) {
    return 'validation_focused';
  }

  // Context-based defaults
  const contextApproaches: Record<string, string> = {
    'crisis': 'stabilizing',
    'celebration': 'affirming',
    'learning': 'educational',
    'routine_check': 'supportive',
    'seeking_support': 'comprehensive'
  };

  return contextApproaches[currentContext] || 'supportive';
}

function generateContextualExamples(
  memberProfile: any,
  currentContext: string,
  historyAnalysis: any
): string[] {
  const examples: string[] = [];
  const learningStyle = memberProfile.learningStyle;

  // Learning style specific examples
  if (learningStyle === 'visual') {
    examples.push('I can describe this like a mental image or diagram');
    examples.push('Picture this scenario in your mind');
  } else if (learningStyle === 'auditory') {
    examples.push('Listen to how this sounds when you say it out loud');
    examples.push('Think of this like a conversation you might have');
  } else if (learningStyle === 'kinesthetic') {
    examples.push('Try this hands-on exercise');
    examples.push('Practice this step-by-step approach');
  } else if (learningStyle === 'reading') {
    examples.push('Here\'s a detailed written explanation');
    examples.push('Review these key points in writing');
  }

  // Context-specific examples
  if (currentContext === 'crisis') {
    examples.push('Think of this like putting on your own oxygen mask first');
    examples.push('Imagine you\'re helping a good friend through this same situation');
  } else if (currentContext === 'learning') {
    examples.push('This is similar to learning to ride a bike - it takes practice');
    examples.push('Think of this skill like building muscle memory');
  }

  // Challenge-specific examples
  if (memberProfile.challenges?.includes('anxiety')) {
    examples.push('Like turning down the volume on anxious thoughts');
    examples.push('Think of anxiety as a smoke alarm that\'s too sensitive');
  }

  return examples.slice(0, 3); // Limit to 3 examples
}

function adaptPacing(memberProfile: any, currentContext: string): string {
  // Check availability preferences
  if (memberProfile.preferences?.availabilityHours) {
    const [start, end] = memberProfile.preferences.availabilityHours.split('-');
    const availableHours = parseInt(end.split(':')[0]) - parseInt(start.split(':')[0]);
    
    if (availableHours <= 2) return 'concise';
    if (availableHours >= 4) return 'detailed';
  }

  // Context-based pacing
  const contextPacing: Record<string, string> = {
    'crisis': 'immediate',
    'celebration': 'energetic',
    'learning': 'methodical',
    'routine_check': 'steady',
    'seeking_support': 'thoughtful'
  };

  return contextPacing[currentContext] || 'balanced';
}

function adaptDepth(memberProfile: any, historyAnalysis: any, currentContext: string): string {
  // Experience-based depth
  const experience = memberProfile.demographics?.supportExperience;
  if (experience === 'advanced') return 'comprehensive';
  if (experience === 'beginner') return 'introductory';
  
  // History-based adjustment
  if (historyAnalysis.responsePatterns?.prefersDetailedExplanations) {
    return 'detailed';
  }
  
  // Context-based depth
  if (currentContext === 'crisis') return 'focused';
  if (currentContext === 'learning') return 'comprehensive';
  
  return 'moderate';
}

function buildAvoidanceList(memberProfile: any, historyAnalysis: any): string[] {
  const avoidanceList: string[] = [];

  // Add trigger words from preferences
  if (memberProfile.preferences?.triggerWords) {
    avoidanceList.push(...memberProfile.preferences.triggerWords);
  }

  // Add patterns from interaction history
  if (historyAnalysis.effectivenessPattern === 'low_engagement') {
    avoidanceList.push('complex jargon', 'overwhelming information');
  }

  // Challenge-specific avoidances
  if (memberProfile.challenges?.includes('anxiety')) {
    avoidanceList.push('pressure language', 'urgency words');
  }
  
  if (memberProfile.challenges?.includes('depression')) {
    avoidanceList.push('toxic positivity', 'dismissive language');
  }

  return [...new Set(avoidanceList)]; // Remove duplicates
}

function calculateAdaptationConfidence(
  memberProfile: any,
  historyAnalysis: any,
  adaptationAreas: string[]
): number {
  let confidence = 0.6; // Base confidence

  // Boost confidence with more profile data
  if (memberProfile.preferences && Object.keys(memberProfile.preferences).length > 0) {
    confidence += 0.2;
  }

  // Boost confidence with interaction history
  if (historyAnalysis.totalInteractions > 0) {
    confidence += Math.min(historyAnalysis.totalInteractions * 0.05, 0.15);
  }

  // Boost confidence with clear learning style
  if (memberProfile.learningStyle) {
    confidence += 0.1;
  }

  // Reduce confidence if requesting many adaptation areas without much data
  if (adaptationAreas.length > 3 && historyAnalysis.totalInteractions < 5) {
    confidence -= 0.1;
  }

  return Math.min(Math.max(confidence, 0.4), 0.95);
}

export default {
  name: AdaptToMemberTool.name,
  description: AdaptToMemberTool.description,
  agent: AdaptToMemberTool.agent,
  execute: adaptToMember
};