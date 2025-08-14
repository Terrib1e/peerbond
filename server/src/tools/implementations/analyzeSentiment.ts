/**
 * Analyze Sentiment Tool
 * Analyzes emotional tone and sentiment of member messages
 */

import { ToolContext, ToolResult } from '../schemas';
import { DatabaseService } from '../../services/database';
import { GeminiService } from '../../services/geminiService';

export interface AnalyzeSentimentParams {
  memberMessage: string;
  includeEmotions?: boolean;
  detectCrisis?: boolean;
  contextualAnalysis?: boolean;
}

/**
 * Analyze emotional tone and sentiment score of member message
 */
export async function analyzeSentiment(
  params: AnalyzeSentimentParams,
  context: ToolContext
): Promise<ToolResult> {
  const dbService = new DatabaseService();
  const geminiService = new GeminiService();

  try {
    // Perform basic sentiment analysis
    const basicSentiment = performBasicSentimentAnalysis(params.memberMessage);
    
    // Enhanced analysis with Gemini if available
    let enhancedAnalysis = null;
    try {
      if (params.contextualAnalysis) {
        enhancedAnalysis = await performEnhancedSentimentAnalysis(params.memberMessage, geminiService);
      }
    } catch (error) {
      console.warn('[AnalyzeSentiment] Enhanced analysis failed, using basic analysis:', error);
    }

    // Combine results
    const sentimentScore = enhancedAnalysis?.sentimentScore || basicSentiment.score;
    const emotions = enhancedAnalysis?.emotions || basicSentiment.emotions;
    const crisisRisk = enhancedAnalysis?.crisisRisk || basicSentiment.crisisRisk;
    const keyThemes = enhancedAnalysis?.keyThemes || basicSentiment.themes;

    // Determine overall sentiment category
    const sentimentCategory = categorizeScore(sentimentScore);
    
    // Create response message
    const responseMessage = generateSentimentResponse(
      sentimentScore, 
      sentimentCategory, 
      emotions, 
      crisisRisk,
      keyThemes
    );

    // Store sentiment analysis result (placeholder - real implementation would need SentimentAnalysis model)
    try {
      const sentimentAnalysis = {
        id: `sentiment_${Date.now()}`,
        memberId: context.memberId,
        messageContent: params.memberMessage,
        sentimentScore,
        emotions: emotions.join(', '),
        crisisRisk,
        themes: keyThemes.join(', '),
        sessionId: context.sessionId,
        createdAt: new Date()
      };
      
      // TODO: Implement actual database storage when SentimentAnalysis model is available
      console.log('[AnalyzeSentiment] Created sentiment analysis:', sentimentAnalysis);
    } catch (dbError) {
      console.warn('[AnalyzeSentiment] Could not store analysis:', dbError);
    }

    // Log tool usage
    await dbService.createAuditLog({
      memberId: context.memberId,
      action: 'tool_executed',
      resource: 'sentiment_analysis',
      resourceId: context.sessionId,
      ipAddress: 'system',
      memberAgent: 'maya-sentiment',
      metadata: {
        tool: 'analyzeSentiment',
        sentimentScore,
        sentimentCategory,
        emotions: emotions.join(', '),
        crisisRisk,
        analysisMethod: enhancedAnalysis ? 'enhanced' : 'basic'
      }
    });

    return {
      success: true,
      data: {
        sentimentScore,
        sentimentCategory,
        emotions,
        crisisRisk,
        keyThemes,
        responseMessage,
        analysis: {
          positive_indicators: basicSentiment.positiveWords,
          negative_indicators: basicSentiment.negativeWords,
          neutral_tone: sentimentScore >= -0.1 && sentimentScore <= 0.1
        }
      },
      metadata: {
        toolName: 'analyzeSentiment',
        confidence: enhancedAnalysis ? 0.9 : 0.75,
        requires_follow_up: crisisRisk > 0.7 || sentimentScore < -0.6,
        emotional_state: sentimentCategory,
        crisis_risk_level: crisisRisk > 0.7 ? 'high' : crisisRisk > 0.4 ? 'medium' : 'low'
      }
    };

  } catch (error) {
    console.error('[AnalyzeSentiment] Error:', error);
    
    return {
      success: false,
      data: { 
        message: "I can sense you're sharing something meaningful with me. While I can't analyze the emotional tone right now, I want you to know that all feelings are valid and I'm here to support you."
      },
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        toolName: 'analyzeSentiment',
        confidence: 0.3,
        fallback: true
      }
    };
  }
}

function performBasicSentimentAnalysis(message: string): {
  score: number;
  emotions: string[];
  crisisRisk: number;
  themes: string[];
  positiveWords: string[];
  negativeWords: string[];
} {
  const messageLower = message.toLowerCase();
  
  // Positive words and phrases
  const positiveWords = [
    'happy', 'joy', 'excited', 'grateful', 'thankful', 'blessed', 'amazing', 'wonderful',
    'great', 'fantastic', 'awesome', 'love', 'beautiful', 'perfect', 'incredible',
    'delighted', 'thrilled', 'pleased', 'satisfied', 'content', 'peaceful', 'calm',
    'hopeful', 'optimistic', 'confident', 'proud', 'accomplished', 'successful'
  ];

  // Negative words and phrases
  const negativeWords = [
    'sad', 'depressed', 'angry', 'frustrated', 'upset', 'hurt', 'pain', 'suffering',
    'terrible', 'awful', 'horrible', 'hate', 'disgusted', 'disappointed', 'worried',
    'anxious', 'scared', 'afraid', 'fearful', 'stressed', 'overwhelmed', 'exhausted',
    'lonely', 'isolated', 'helpless', 'hopeless', 'worthless', 'failure', 'broken'
  ];

  // Crisis indicators
  const crisisWords = [
    'suicide', 'kill myself', 'end it all', 'die', 'death', 'can\'t go on', 'giving up',
    'no point', 'worthless', 'hopeless', 'no hope', 'want to die', 'better off dead',
    'hurt myself', 'self harm', 'cut myself', 'overdose', 'pills'
  ];

  // Emotion indicators
  const emotionIndicators = {
    'anxious': ['anxious', 'anxiety', 'worry', 'worried', 'panic', 'nervous', 'tense'],
    'sad': ['sad', 'sadness', 'depressed', 'depression', 'down', 'blue', 'melancholy'],
    'angry': ['angry', 'anger', 'mad', 'furious', 'rage', 'irritated', 'frustrated'],
    'scared': ['scared', 'fear', 'afraid', 'terrified', 'frightened', 'nervous'],
    'lonely': ['lonely', 'alone', 'isolated', 'abandoned', 'left out'],
    'stressed': ['stressed', 'stress', 'pressure', 'overwhelmed', 'burned out'],
    'confused': ['confused', 'lost', 'unclear', 'don\'t understand', 'puzzled'],
    'guilty': ['guilty', 'shame', 'ashamed', 'regret', 'sorry', 'my fault']
  };

  // Count positive and negative words
  const foundPositiveWords = positiveWords.filter(word => messageLower.includes(word));
  const foundNegativeWords = negativeWords.filter(word => messageLower.includes(word));
  
  // Calculate basic sentiment score (-1 to 1)
  let score = 0;
  score += foundPositiveWords.length * 0.1;
  score -= foundNegativeWords.length * 0.15;
  
  // Boost for strongly positive phrases
  if (messageLower.includes('feeling great') || messageLower.includes('really happy')) score += 0.3;
  if (messageLower.includes('best day') || messageLower.includes('so grateful')) score += 0.2;
  
  // Penalty for strongly negative phrases
  if (messageLower.includes('feeling terrible') || messageLower.includes('really sad')) score -= 0.3;
  if (messageLower.includes('worst day') || messageLower.includes('can\'t take')) score -= 0.4;
  
  // Clamp score between -1 and 1
  score = Math.max(-1, Math.min(1, score));

  // Detect emotions
  const detectedEmotions: string[] = [];
  Object.entries(emotionIndicators).forEach(([emotion, indicators]) => {
    if (indicators.some(indicator => messageLower.includes(indicator))) {
      detectedEmotions.push(emotion);
    }
  });

  // Calculate crisis risk (0 to 1)
  let crisisRisk = 0;
  crisisWords.forEach(word => {
    if (messageLower.includes(word)) {
      crisisRisk += 0.3;
    }
  });
  crisisRisk = Math.min(1, crisisRisk);

  // Identify themes
  const themes: string[] = [];
  const themeIndicators = {
    'relationships': ['relationship', 'partner', 'boyfriend', 'girlfriend', 'marriage', 'family'],
    'work': ['work', 'job', 'boss', 'career', 'office', 'colleague'],
    'health': ['health', 'sick', 'illness', 'doctor', 'hospital', 'medical'],
    'recovery': ['recovery', 'sober', 'addiction', 'relapse', 'clean'],
    'therapy': ['therapy', 'therapist', 'counseling', 'session', 'treatment'],
    'self-worth': ['worthless', 'failure', 'not good enough', 'self-esteem', 'confidence']
  };

  Object.entries(themeIndicators).forEach(([theme, indicators]) => {
    if (indicators.some(indicator => messageLower.includes(indicator))) {
      themes.push(theme);
    }
  });

  return {
    score,
    emotions: detectedEmotions,
    crisisRisk,
    themes,
    positiveWords: foundPositiveWords,
    negativeWords: foundNegativeWords
  };
}

async function performEnhancedSentimentAnalysis(message: string, geminiService: GeminiService): Promise<{
  sentimentScore: number;
  emotions: string[];
  crisisRisk: number;
  keyThemes: string[];
}> {
  const prompt = `Analyze the emotional tone and sentiment of this message from someone seeking mental health support:

"${message}"

Please provide analysis in this exact JSON format:
{
  "sentimentScore": <number between -1 and 1>,
  "emotions": [<array of detected emotions>],
  "crisisRisk": <number between 0 and 1>,
  "keyThemes": [<array of main themes discussed>]
}

Consider:
- Overall emotional tone (positive, negative, neutral)
- Specific emotions expressed or implied
- Any crisis indicators or concerning language
- Main topics or themes being discussed
- Context of mental health support conversation`;

  const response = await geminiService.generateResponse(prompt);
  
  try {
    // Try to parse JSON response
    const analysis = JSON.parse(response.trim());
    return {
      sentimentScore: Number(analysis.sentimentScore) || 0,
      emotions: Array.isArray(analysis.emotions) ? analysis.emotions : [],
      crisisRisk: Number(analysis.crisisRisk) || 0,
      keyThemes: Array.isArray(analysis.keyThemes) ? analysis.keyThemes : []
    };
  } catch (parseError) {
    throw new Error('Could not parse enhanced sentiment analysis');
  }
}

function categorizeScore(score: number): string {
  if (score >= 0.3) return 'positive';
  if (score <= -0.3) return 'negative';
  return 'neutral';
}

function generateSentimentResponse(
  score: number, 
  category: string, 
  emotions: string[], 
  crisisRisk: number,
  themes: string[]
): string {
  let response = '';

  // Address the emotional state
  if (crisisRisk > 0.7) {
    response = "I'm noticing some concerning language in what you've shared. Your safety and well-being are very important. ";
  } else if (category === 'positive') {
    response = "I can sense some positive energy in what you're sharing - that's wonderful to see. ";
  } else if (category === 'negative') {
    response = "I can hear that you're going through a difficult time right now. ";
  } else {
    response = "Thank you for sharing what's on your mind. ";
  }

  // Address specific emotions
  if (emotions.length > 0) {
    const emotionList = emotions.slice(0, 3).join(', ');
    response += `It seems like you might be feeling ${emotionList}. `;
  }

  // Validation and support
  response += "All of these feelings are completely valid and understandable. ";

  // Address themes if present
  if (themes.length > 0) {
    const mainTheme = themes[0];
    switch (mainTheme) {
      case 'relationships':
        response += "Relationships can be one of the most challenging yet important parts of our lives. ";
        break;
      case 'work':
        response += "Work stress can really impact our overall well-being. ";
        break;
      case 'recovery':
        response += "Recovery is a brave journey, and every step matters. ";
        break;
      case 'therapy':
        response += "Engaging with therapy shows real commitment to your mental health. ";
        break;
    }
  }

  // Crisis support
  if (crisisRisk > 0.7) {
    response += "If you're having thoughts of self-harm, please reach out to a crisis hotline immediately: 988 (Suicide & Crisis Lifeline). ";
  }

  // Supportive closing
  response += "How can I best support you right now?";

  return response;
}