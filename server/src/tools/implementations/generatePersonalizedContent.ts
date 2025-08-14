/**
 * Generate Personalized Content Tool Implementation
 * Creates content tailored to member preferences and needs
 */

import { z } from 'zod';
import { GeneratePersonalizedContentTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function generatePersonalizedContent(
  params: z.infer<typeof GeneratePersonalizedContentTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { memberId, contentType, memberProfile, contextualFactors } = params;

    logger.info('[generatePersonalizedContent] Generating personalized content', {
      memberId,
      contentType,
      hasProfile: !!memberProfile,
      hasContextualFactors: !!contextualFactors,
      agent: context.agent
    });

    // Analyze member profile and context
    const contentStrategy = analyzeContentRequirements(
      contentType,
      memberProfile || {},
      contextualFactors || {}
    );

    // Generate content based on strategy
    const contentResult = await createPersonalizedContent(
      contentStrategy,
      contentType,
      memberProfile || {},
      contextualFactors || {}
    );

    // Generate follow-up suggestions
    const followUpSuggestions = generateFollowUpSuggestions(
      contentType,
      memberProfile || {},
      contentResult.personalizationFactors
    );

    logger.info('[generatePersonalizedContent] Content generation completed', {
      memberId,
      contentType,
      contentLength: contentResult.content.length,
      personalizationFactors: contentResult.personalizationFactors.length,
      followUpSuggestions: followUpSuggestions.length
    });

    return {
      success: true,
      data: {
        content: contentResult.content,
        format: contentResult.format,
        personalizationFactors: contentResult.personalizationFactors,
        adaptationReason: contentResult.adaptationReason,
        followUpSuggestions
      },
      confidence: contentResult.confidence,
      metadata: {
        memberId,
        contentType,
        contentStrategy,
        memberProfile: {
          challenges: memberProfile?.challenges?.length || 0,
          strengths: memberProfile?.strengths?.length || 0,
          preferences: memberProfile?.preferences?.length || 0
        },
        contextualFactors,
        generationTimestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    logger.error('[generatePersonalizedContent] Error generating content:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate personalized content',
      confidence: 0.3
    };
  }
}

function analyzeContentRequirements(
  contentType: string,
  memberProfile: any,
  contextualFactors: any
): any {
  const strategy: any = {
    primaryFocus: contentType,
    personalizationLevel: 'moderate',
    deliveryStyle: 'conversational',
    complexity: 'intermediate',
    emotionalTone: 'supportive'
  };

  // Adjust based on member challenges
  if (memberProfile.challenges) {
    if (memberProfile.challenges.includes('anxiety')) {
      strategy.emotionalTone = 'calming';
      strategy.complexity = 'simple';
    }
    if (memberProfile.challenges.includes('depression')) {
      strategy.emotionalTone = 'gentle';
      strategy.deliveryStyle = 'encouraging';
    }
    if (memberProfile.challenges.includes('trauma')) {
      strategy.emotionalTone = 'careful';
      strategy.complexity = 'gradual';
    }
  }

  // Adjust based on strengths
  if (memberProfile.strengths) {
    if (memberProfile.strengths.includes('analytical_thinking')) {
      strategy.deliveryStyle = 'logical';
      strategy.complexity = 'detailed';
    }
    if (memberProfile.strengths.includes('creativity')) {
      strategy.deliveryStyle = 'creative';
      strategy.personalizationLevel = 'high';
    }
  }

  // Adjust based on learning style
  if (memberProfile.learningStyle) {
    const styleAdjustments: Record<string, any> = {
      'visual': { format: 'structured', includeMetaphors: true },
      'auditory': { format: 'conversational', includeDialogue: true },
      'kinesthetic': { format: 'action-oriented', includeExercises: true },
      'reading': { format: 'detailed', includeResources: true }
    };
    
    const adjustment = styleAdjustments[memberProfile.learningStyle];
    if (adjustment) {
      Object.assign(strategy, adjustment);
    }
  }

  // Adjust based on contextual factors
  if (contextualFactors.recentMood === 'negative') {
    strategy.emotionalTone = 'validating';
    strategy.complexity = 'simple';
  } else if (contextualFactors.recentMood === 'positive') {
    strategy.emotionalTone = 'affirming';
    strategy.deliveryStyle = 'energetic';
  }

  if (contextualFactors.timeOfDay === 'late_night' || contextualFactors.timeOfDay === 'morning') {
    strategy.deliveryStyle = 'gentle';
  }

  if (contextualFactors.availableTime) {
    const timeAdjustments: Record<string, any> = {
      '5_minutes': { complexity: 'simple', format: 'concise' },
      '15_minutes': { complexity: 'moderate', format: 'structured' },
      '30_minutes': { complexity: 'detailed', format: 'comprehensive' },
      '1_hour': { complexity: 'thorough', format: 'interactive' }
    };
    
    const timeAdjustment = timeAdjustments[contextualFactors.availableTime];
    if (timeAdjustment) {
      Object.assign(strategy, timeAdjustment);
    }
  }

  return strategy;
}

async function createPersonalizedContent(
  strategy: any,
  contentType: string,
  memberProfile: any,
  contextualFactors: any
): Promise<any> {
  // Simulate content generation processing time
  await new Promise(resolve => setTimeout(resolve, 300));

  const contentGenerators: Record<string, Function> = {
    'coping_strategy': generateCopingStrategy,
    'encouragement': generateEncouragement,
    'educational': generateEducationalContent,
    'reflection_prompt': generateReflectionPrompt,
    'resource': generateResourceContent
  };

  const generator = contentGenerators[contentType] || contentGenerators.encouragement;
  const baseContent = generator(strategy, memberProfile, contextualFactors);

  // Apply personalization factors
  const personalizationFactors = identifyPersonalizationFactors(
    strategy,
    memberProfile,
    contextualFactors
  );

  // Adapt content based on personalization factors
  const personalizedContent = applyPersonalization(
    baseContent,
    personalizationFactors,
    strategy
  );

  return {
    content: personalizedContent.content,
    format: strategy.format || 'conversational',
    personalizationFactors,
    adaptationReason: personalizedContent.adaptationReason,
    confidence: calculateContentConfidence(strategy, memberProfile, personalizedContent)
  };
}

function generateCopingStrategy(strategy: any, memberProfile: any, contextualFactors: any): string {
  const strategies = {
    anxiety: [
      "Let's work on a personalized breathing technique that you can use anywhere, anytime.",
      "I want to share a grounding exercise that's particularly effective for anxious thoughts.",
      "Here's a cognitive technique to help you challenge anxious predictions."
    ],
    depression: [
      "I'd like to introduce you to a gentle activity scheduling approach.",
      "Let's explore a self-compassion exercise that can help during low moments.",
      "Here's a thought reframing technique that honors your feelings while offering new perspectives."
    ],
    stress: [
      "Let me share a stress management technique that fits your lifestyle.",
      "Here's a personalized approach to setting boundaries that protect your energy.",
      "I want to teach you a quick stress reset you can use during busy days."
    ],
    general: [
      "Let's explore a coping strategy that builds on your natural strengths.",
      "Here's a versatile technique you can adapt to different situations.",
      "I want to share an evidence-based approach that many find helpful."
    ]
  };

  const challengeCategory = memberProfile.challenges?.[0] || 'general';
  const categoryStrategies = strategies[challengeCategory] || strategies.general;
  
  return categoryStrategies[Math.floor(Math.random() * categoryStrategies.length)];
}

function generateEncouragement(strategy: any, memberProfile: any, contextualFactors: any): string {
  let content = '';

  // Start with personalized acknowledgment
  if (memberProfile.strengths && memberProfile.strengths.length > 0) {
    const strength = memberProfile.strengths[0];
    const strengthMessages: Record<string, string> = {
      'resilience': "I see incredible resilience in your journey so far.",
      'empathy': "Your empathy and care for others, including yourself, is truly remarkable.",
      'creativity': "The creative way you approach challenges is inspiring.",
      'determination': "Your determination to keep moving forward despite difficulties shows real courage.",
      'self-awareness': "Your self-awareness and willingness to reflect is a tremendous strength.",
      'problem-solving': "I admire how thoughtfully you approach solving problems."
    };
    
    content += strengthMessages[strength] || "I recognize the unique strengths you bring to your healing journey.";
  } else {
    content += "I want you to know that reaching out for support shows tremendous courage and self-awareness.";
  }

  // Add contextual encouragement
  if (contextualFactors.recentMood === 'negative') {
    content += " Even on difficult days like today, you're taking positive steps toward your wellbeing.";
  } else if (contextualFactors.recentMood === 'positive') {
    content += " It's wonderful to see you in a positive space - this is the perfect time to build on your progress.";
  } else {
    content += " Every step you take in your healing journey, no matter how small, is meaningful progress.";
  }

  // Add challenge-specific encouragement
  if (memberProfile.challenges) {
    const challengeEncouragements: Record<string, string> = {
      'anxiety': " Managing anxiety takes practice, and you're building those skills every day.",
      'depression': " Healing from depression is not linear, and you're showing up for yourself even when it's hard.",
      'trauma': " Your courage in facing trauma and seeking healing is truly inspiring.",
      'relationships': " Working on relationships, especially with yourself, takes wisdom and bravery.",
      'self-esteem': " Learning to be kinder to yourself is one of the most important gifts you can give yourself."
    };

    const challenge = memberProfile.challenges[0];
    const encouragement = challengeEncouragements[challenge];
    if (encouragement) {
      content += encouragement;
    }
  }

  // Add forward-looking statement
  content += " I believe in your ability to create positive change in your life, one step at a time.";

  return content;
}

function generateEducationalContent(strategy: any, memberProfile: any, contextualFactors: any): string {
  let content = "Let me share some insights that might help you understand what you're experiencing better.\n\n";

  // Educational content based on challenges
  if (memberProfile.challenges && memberProfile.challenges.length > 0) {
    const challenge = memberProfile.challenges[0];
    const educationalContent: Record<string, string> = {
      'anxiety': "Anxiety is your body's natural alarm system, designed to keep you safe. Sometimes this system can become oversensitive, triggering alerts even when there's no real danger. Understanding this can help you respond to anxiety with curiosity rather than fear.",
      
      'depression': "Depression affects brain chemistry, particularly neurotransmitters like serotonin and dopamine that regulate mood. This is why depression isn't something you can simply 'think your way out of' - it's a real medical condition that responds well to proper treatment and support.",
      
      'trauma': "Trauma responses are your nervous system's way of trying to protect you. When we experience trauma, our brain's alarm system can remain on high alert. Healing involves gradually helping your nervous system learn that you're safe now.",
      
      'stress': "Chronic stress activates your body's fight-or-flight response repeatedly, which can impact your physical and mental health. Learning stress management techniques helps retrain your nervous system to find calm and balance."
    };

    content += educationalContent[challenge] || "Understanding your experiences through a psychological lens can help normalize what you're going through and guide your path forward.";
  }

  // Add learning style specific formatting
  if (memberProfile.learningStyle === 'visual') {
    content += "\n\nThink of this like a diagram: your thoughts, feelings, and behaviors are all connected in a triangle, each influencing the others.";
  } else if (memberProfile.learningStyle === 'kinesthetic') {
    content += "\n\nYou can experience this connection by noticing how changing your posture or breathing affects your thoughts and emotions.";
  }

  return content;
}

function generateReflectionPrompt(strategy: any, memberProfile: any, contextualFactors: any): string {
  let content = "I'd like to invite you to reflect on something that might offer valuable insights.\n\n";

  // Tailored reflection prompts
  const prompts = {
    strengths_based: "Think about a time recently when you felt proud of how you handled a challenging situation. What strengths did you draw upon in that moment?",
    
    growth_oriented: "Consider your journey over the past month. What's one small change you've noticed in yourself, even if it feels minor?",
    
    values_focused: "When you imagine your ideal day, what activities or interactions would make you feel most aligned with who you truly are?",
    
    gratitude_based: "What's one thing - however small - that brought you a moment of peace or joy this week?",
    
    challenge_reframe: "If you could speak to yourself from six months ago, what wisdom would you want to share about navigating difficulties?",
    
    future_oriented: "Imagine yourself one year from now, having made progress on your goals. What advice would that future version of you give to your current self?"
  };

  // Select prompt based on context and profile
  let selectedPrompt = prompts.growth_oriented; // default

  if (contextualFactors.recentMood === 'positive') {
    selectedPrompt = prompts.gratitude_based;
  } else if (contextualFactors.recentMood === 'negative') {
    selectedPrompt = prompts.strengths_based;
  } else if (memberProfile.strengths && memberProfile.strengths.length > 0) {
    selectedPrompt = prompts.values_focused;
  }

  content += selectedPrompt;

  // Add gentle guidance
  content += "\n\nTake your time with this reflection. There are no right or wrong answers - just your honest thoughts and feelings.";

  return content;
}

function generateResourceContent(strategy: any, memberProfile: any, contextualFactors: any): string {
  let content = "I'd like to share some resources that are specifically chosen with your needs in mind.\n\n";

  // Challenge-specific resources
  if (memberProfile.challenges) {
    const challenge = memberProfile.challenges[0];
    const resources: Record<string, string> = {
      'anxiety': "**For Anxiety Management:**\n• Box breathing technique (4-4-4-4 pattern)\n• Progressive muscle relaxation audio guides\n• Anxiety tracking apps like Headspace or Calm\n• The book 'Dare' by Barry McDonagh for panic attacks",
      
      'depression': "**For Depression Support:**\n• Behavioral activation worksheets\n• Light therapy information (especially for seasonal depression)\n• The 'Depression and Bipolar Support Alliance' website\n• 'Feeling Good' by David Burns for cognitive techniques",
      
      'trauma': "**For Trauma Recovery:**\n• Grounding techniques (5-4-3-2-1 sensory method)\n• 'The Body Keeps the Score' by Bessel van der Kolk\n• EMDR therapy information resources\n• Trauma-informed yoga practices"
    };

    content += resources[challenge] || "**General Mental Health Resources:**\n• Crisis Text Line: Text HOME to 741741\n• National Suicide Prevention Lifeline: 988\n• Mental Health America website for screening tools";
  }

  // Learning style specific resources
  if (memberProfile.learningStyle) {
    content += "\n\n**Personalized for Your Learning Style:**\n";
    const styleResources: Record<string, string> = {
      'visual': "• Infographics and visual guides on mental health topics\n• Mind mapping tools for organizing thoughts\n• Therapy workbooks with diagrams and charts",
      'auditory': "• Meditation podcasts and guided audio sessions\n• Audiobooks on mental health and wellness\n• Music therapy playlists for mood regulation",
      'kinesthetic': "• Movement-based anxiety relief exercises\n• Hands-on therapy tools like stress balls or fidgets\n• Outdoor therapy and nature-based healing activities",
      'reading': "• Comprehensive self-help books and workbooks\n• Journaling prompts and writing exercises\n• Online articles from reputable mental health sources"
    };

    content += styleResources[memberProfile.learningStyle] || "• Varied resources to match different learning preferences";
  }

  return content;
}

function identifyPersonalizationFactors(
  strategy: any,
  memberProfile: any,
  contextualFactors: any
): string[] {
  const factors: string[] = [];

  if (memberProfile.challenges) {
    factors.push(`Challenge-specific content for ${memberProfile.challenges.join(', ')}`);
  }

  if (memberProfile.strengths) {
    factors.push(`Strength-based approach utilizing ${memberProfile.strengths.join(', ')}`);
  }

  if (memberProfile.learningStyle) {
    factors.push(`${memberProfile.learningStyle} learning style accommodation`);
  }

  if (strategy.emotionalTone !== 'supportive') {
    factors.push(`${strategy.emotionalTone} emotional tone`);
  }

  if (contextualFactors.availableTime) {
    factors.push(`Optimized for ${contextualFactors.availableTime} time window`);
  }

  if (contextualFactors.recentMood) {
    factors.push(`Adapted for ${contextualFactors.recentMood} mood state`);
  }

  if (strategy.complexity !== 'intermediate') {
    factors.push(`${strategy.complexity} complexity level`);
  }

  return factors;
}

function applyPersonalization(
  baseContent: string,
  personalizationFactors: string[],
  strategy: any
): any {
  let content = baseContent;
  const adaptations: string[] = [];

  // Apply complexity adjustments
  if (strategy.complexity === 'simple') {
    // Simplify language and structure
    content = content.replace(/\b(utilize|implement|methodology)\b/g, (match) => {
      const replacements: Record<string, string> = {
        'utilize': 'use',
        'implement': 'try',
        'methodology': 'method'
      };
      return replacements[match] || match;
    });
    adaptations.push('Simplified language for accessibility');
  } else if (strategy.complexity === 'detailed') {
    // Add more depth and detail
    if (!content.includes('research shows') && !content.includes('studies indicate')) {
      content += "\n\nResearch in psychology supports this approach, showing measurable benefits for people in similar situations.";
      adaptations.push('Added evidence-based context');
    }
  }

  // Apply emotional tone adjustments
  if (strategy.emotionalTone === 'calming') {
    content = content.replace(/\b(challenging|difficult|struggle)\b/g, (match) => {
      const replacements: Record<string, string> = {
        'challenging': 'manageable',
        'difficult': 'temporary',
        'struggle': 'work through'
      };
      return replacements[match] || match;
    });
    adaptations.push('Calming language adjustments applied');
  }

  // Apply format adjustments
  if (strategy.format === 'structured') {
    if (!content.includes('**') && !content.includes('•')) {
      const sentences = content.split('. ');
      if (sentences.length > 2) {
        const structured = sentences.slice(0, 1).join('. ') + '.\n\n**Key Points:**\n' +
          sentences.slice(1).map(s => `• ${s.trim()}`).join('\n');
        content = structured;
        adaptations.push('Applied structured formatting');
      }
    }
  }

  const adaptationReason = adaptations.length > 0 
    ? `Content adapted with: ${adaptations.join(', ')}`
    : 'Standard personalization applied based on member profile';

  return {
    content,
    adaptationReason
  };
}

function generateFollowUpSuggestions(
  contentType: string,
  memberProfile: any,
  personalizationFactors: string[]
): string[] {
  const suggestions: string[] = [];

  // Content type specific follow-ups
  const followUpsByType: Record<string, string[]> = {
    'coping_strategy': [
      'Practice this technique for 5 minutes daily this week',
      'Notice when you use this strategy and how it feels',
      'Adapt this technique to fit your specific situations'
    ],
    'encouragement': [
      'Write down one strength you recognized in yourself today',
      'Share your progress with someone you trust',
      'Set a small, achievable goal for tomorrow'
    ],
    'educational': [
      'Research one additional resource on this topic',
      'Discuss these insights with your therapist or support network',
      'Apply this knowledge to a current situation you\'re facing'
    ],
    'reflection_prompt': [
      'Journal about your reflections for 10 minutes',
      'Discuss your insights with a trusted friend or therapist',
      'Notice patterns in your reflections over the next week'
    ],
    'resource': [
      'Choose one resource to explore this week',
      'Share a helpful resource with someone who might benefit',
      'Create a personal resource toolkit for future reference'
    ]
  };

  const basesSuggestions = followUpsByType[contentType] || followUpsByType.encouragement;
  suggestions.push(...basesSuggestions);

  // Add personalized suggestions based on profile
  if (memberProfile.learningStyle === 'visual') {
    suggestions.push('Create a visual reminder or diagram of key points');
  } else if (memberProfile.learningStyle === 'kinesthetic') {
    suggestions.push('Practice applying this through hands-on exercises');
  }

  if (memberProfile.challenges?.includes('anxiety')) {
    suggestions.push('Use this when you notice early signs of anxiety');
  }

  return suggestions.slice(0, 4); // Limit to 4 suggestions
}

function calculateContentConfidence(
  strategy: any,
  memberProfile: any,
  personalizedContent: any
): number {
  let confidence = 0.7; // Base confidence

  // Boost confidence with more personalization factors
  const factorCount = personalizedContent.personalizationFactors?.length || 0;
  confidence += Math.min(factorCount * 0.05, 0.2);

  // Boost confidence with detailed member profile
  const profileDepth = (memberProfile.challenges?.length || 0) + 
                      (memberProfile.strengths?.length || 0) + 
                      (memberProfile.preferences?.length || 0);
  confidence += Math.min(profileDepth * 0.03, 0.15);

  // Boost confidence with clear learning style
  if (memberProfile.learningStyle) {
    confidence += 0.08;
  }

  // Boost confidence with contextual factors
  if (strategy.recentMood && strategy.availableTime) {
    confidence += 0.05;
  }

  return Math.min(Math.max(confidence, 0.5), 0.95);
}

export default {
  name: GeneratePersonalizedContentTool.name,
  description: GeneratePersonalizedContentTool.description,
  agent: GeneratePersonalizedContentTool.agent,
  execute: generatePersonalizedContent
};