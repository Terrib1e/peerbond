/**
 * Analyze Voice Sentiment Tool Implementation
 * Analyzes emotional content from voice transcription with voice-specific markers
 */

import { z } from 'zod';
import { AnalyzeVoiceSentimentTool } from '../schemas';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

export async function analyzeVoiceSentiment(
  params: z.infer<typeof AnalyzeVoiceSentimentTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { transcriptionId, includeEmotionalMarkers, confidenceThreshold, contextualFactors } = params;

    logger.info('[analyzeVoiceSentiment] Analyzing voice sentiment', {
      transcriptionId,
      includeEmotionalMarkers,
      confidenceThreshold,
      contextualFactors,
      agent: context.agent
    });

    // Simulate retrieving transcription data (in production, this would fetch from database)
    const transcriptionData = await retrieveTranscriptionData(transcriptionId);
    
    if (!transcriptionData) {
      return {
        success: false,
        error: `Transcription ${transcriptionId} not found`,
        confidence: 0.0
      };
    }

    // Perform voice-specific sentiment analysis
    const sentimentAnalysis = await performVoiceSentimentAnalysis(
      transcriptionData.text,
      transcriptionData.audioMetadata,
      contextualFactors
    );

    // Extract voice markers if requested
    let voiceMarkers: any[] = [];
    if (includeEmotionalMarkers) {
      voiceMarkers = await extractVoiceMarkers(
        transcriptionData.text,
        transcriptionData.audioMetadata,
        confidenceThreshold
      );
    }

    // Perform risk assessment
    const riskAssessment = assessVoiceRisk(sentimentAnalysis, voiceMarkers, contextualFactors);

    logger.info('[analyzeVoiceSentiment] Analysis completed', {
      transcriptionId,
      overallSentiment: sentimentAnalysis.overallSentiment,
      emotionalScore: sentimentAnalysis.emotionalScore,
      riskLevel: riskAssessment.level,
      voiceMarkersCount: voiceMarkers.length
    });

    return {
      success: true,
      data: {
        overallSentiment: sentimentAnalysis.overallSentiment,
        emotionalScore: sentimentAnalysis.emotionalScore,
        voiceMarkers,
        riskAssessment: riskAssessment.level !== 'low' ? riskAssessment : undefined
      },
      confidence: sentimentAnalysis.confidence,
      metadata: {
        transcriptionId,
        analysisMethod: 'voice_multimodal',
        processingTime: Date.now(),
        textLength: transcriptionData.text.length,
        audioFeatures: transcriptionData.audioMetadata
      }
    };

  } catch (error) {
    logger.error('[analyzeVoiceSentiment] Error analyzing voice sentiment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze voice sentiment',
      confidence: 0.0
    };
  }
}

async function retrieveTranscriptionData(transcriptionId: string): Promise<any> {
  // Simulate database lookup (in production, this would be a real database query)
  await new Promise(resolve => setTimeout(resolve, 100));

  // Generate mock transcription data based on ID patterns
  const isDistressed = transcriptionId.includes('distress') || Math.random() < 0.2;
  const isPositive = transcriptionId.includes('positive') || Math.random() < 0.3;
  const isNeutral = !isDistressed && !isPositive;

  let text = '';
  let audioMetadata: any = {};

  if (isDistressed) {
    text = "I'm having a really hard time right now. Everything feels overwhelming and I don't know how to cope anymore. I feel like I'm drowning and I can't see a way out of this darkness.";
    audioMetadata = {
      averagePitch: 180, // Hz, lower than normal female voice
      pitchVariation: 45, // High variation indicates emotional distress
      speakingRate: 2.1, // Words per second, slower than normal
      pauseFrequency: 0.8, // Pauses per sentence
      voiceShaking: 0.7, // 0-1 scale
      breathPattern: 'irregular',
      volumeVariation: 0.6,
      emotionalMarkers: ['voice_break', 'trembling', 'sighing']
    };
  } else if (isPositive) {
    text = "I wanted to share some good news! I've been practicing the mindfulness techniques and they're really helping. I'm feeling more hopeful about managing my anxiety.";
    audioMetadata = {
      averagePitch: 220, // Hz, higher indicating positive emotion
      pitchVariation: 35, // Moderate variation
      speakingRate: 2.8, // Words per second, normal to slightly fast
      pauseFrequency: 0.3, // Fewer pauses
      voiceShaking: 0.1, // Minimal
      breathPattern: 'regular',
      volumeVariation: 0.3,
      emotionalMarkers: ['upward_inflection', 'clear_tone', 'steady_rhythm']
    };
  } else {
    text = "Hi, I'm looking for some support with managing my daily stress. I've been having some challenges lately and I think talking to someone might help.";
    audioMetadata = {
      averagePitch: 200, // Hz, neutral range
      pitchVariation: 25, // Low variation
      speakingRate: 2.5, // Words per second, normal
      pauseFrequency: 0.4, // Normal pause frequency
      voiceShaking: 0.2, // Minimal
      breathPattern: 'regular',
      volumeVariation: 0.25,
      emotionalMarkers: ['steady_tone', 'measured_pace']
    };
  }

  return {
    transcriptionId,
    text,
    audioMetadata,
    timestamp: new Date().toISOString(),
    confidence: 0.85
  };
}

async function performVoiceSentimentAnalysis(
  text: string,
  audioMetadata: any,
  contextualFactors?: any
): Promise<any> {
  // Text-based sentiment analysis
  const textSentiment = analyzeTextSentiment(text);
  
  // Voice-specific sentiment analysis
  const voiceSentiment = analyzeVoiceFeatures(audioMetadata);
  
  // Combine text and voice analysis
  const combinedScore = (textSentiment.score * 0.6) + (voiceSentiment.score * 0.4);
  
  // Contextual adjustments
  let contextualAdjustment = 0;
  if (contextualFactors?.timeOfDay === 'late_night') {
    contextualAdjustment -= 0.1; // Late night often indicates distress
  }
  if (contextualFactors?.recentEvents?.length > 0) {
    contextualAdjustment -= 0.05; // Recent events may indicate ongoing stress
  }
  
  const finalScore = Math.max(-1, Math.min(1, combinedScore + contextualAdjustment));
  
  // Determine overall sentiment category
  let overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  if (finalScore >= 0.6) overallSentiment = 'very_positive';
  else if (finalScore >= 0.2) overallSentiment = 'positive';
  else if (finalScore >= -0.2) overallSentiment = 'neutral';
  else if (finalScore >= -0.6) overallSentiment = 'negative';
  else overallSentiment = 'very_negative';
  
  // Calculate confidence based on agreement between text and voice
  const agreement = 1 - Math.abs(textSentiment.score - voiceSentiment.score);
  const confidence = 0.7 + (agreement * 0.25);
  
  return {
    overallSentiment,
    emotionalScore: finalScore,
    confidence,
    textComponent: textSentiment,
    voiceComponent: voiceSentiment,
    contextualAdjustment
  };
}

function analyzeTextSentiment(text: string): { score: number; indicators: string[] } {
  const lowerText = text.toLowerCase();
  let score = 0;
  const indicators: string[] = [];
  
  // Negative indicators
  const negativeWords = {
    severe: ['hopeless', 'worthless', 'suicide', 'die', 'end it', 'can\'t go on'],
    moderate: ['depressed', 'anxious', 'overwhelmed', 'struggling', 'difficult', 'hard'],
    mild: ['worried', 'concerned', 'stressed', 'tired', 'frustrated']
  };
  
  Object.entries(negativeWords).forEach(([severity, words]) => {
    words.forEach(word => {
      if (lowerText.includes(word)) {
        const impact = severity === 'severe' ? -0.4 : severity === 'moderate' ? -0.2 : -0.1;
        score += impact;
        indicators.push(`${severity}_negative: ${word}`);
      }
    });
  });
  
  // Positive indicators
  const positiveWords = ['better', 'good', 'happy', 'hopeful', 'improving', 'grateful', 'progress'];
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) {
      score += 0.2;
      indicators.push(`positive: ${word}`);
    }
  });
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    indicators
  };
}

function analyzeVoiceFeatures(audioMetadata: any): { score: number; indicators: string[] } {
  let score = 0;
  const indicators: string[] = [];
  
  // Voice shaking/tremor indicates distress
  if (audioMetadata.voiceShaking > 0.5) {
    score -= 0.3;
    indicators.push('voice_tremor');
  }
  
  // Speaking rate analysis
  if (audioMetadata.speakingRate < 2.0) {
    score -= 0.2; // Very slow speech can indicate depression
    indicators.push('slow_speech');
  } else if (audioMetadata.speakingRate > 3.5) {
    score -= 0.1; // Very fast speech can indicate anxiety
    indicators.push('rapid_speech');
  }
  
  // Pitch analysis
  if (audioMetadata.pitchVariation > 40) {
    score -= 0.2; // High pitch variation can indicate emotional distress
    indicators.push('high_pitch_variation');
  }
  
  // Pause frequency
  if (audioMetadata.pauseFrequency > 0.7) {
    score -= 0.15; // Frequent pauses may indicate difficulty
    indicators.push('frequent_pauses');
  }
  
  // Breathing pattern
  if (audioMetadata.breathPattern === 'irregular') {
    score -= 0.1;
    indicators.push('irregular_breathing');
  }
  
  // Positive voice markers
  if (audioMetadata.emotionalMarkers?.includes('upward_inflection')) {
    score += 0.2;
    indicators.push('positive_inflection');
  }
  
  if (audioMetadata.emotionalMarkers?.includes('clear_tone')) {
    score += 0.15;
    indicators.push('clear_confident_tone');
  }
  
  return {
    score: Math.max(-1, Math.min(1, score)),
    indicators
  };
}

async function extractVoiceMarkers(
  text: string,
  audioMetadata: any,
  confidenceThreshold: number
): Promise<any[]> {
  const markers: any[] = [];
  
  // Extract voice-specific emotional markers
  if (audioMetadata.emotionalMarkers) {
    audioMetadata.emotionalMarkers.forEach((marker: string, index: number) => {
      const confidence = calculateMarkerConfidence(marker, audioMetadata);
      
      if (confidence >= confidenceThreshold) {
        markers.push({
          marker,
          confidence,
          timespan: {
            start: index * 10, // Rough time estimation
            end: (index + 1) * 10
          },
          category: categorizeVoiceMarker(marker)
        });
      }
    });
  }
  
  // Add derived markers from audio analysis
  if (audioMetadata.voiceShaking > 0.6) {
    markers.push({
      marker: 'vocal_tremor',
      confidence: audioMetadata.voiceShaking,
      timespan: { start: 0, end: 30 },
      category: 'distress_indicator'
    });
  }
  
  if (audioMetadata.pitchVariation > 45) {
    markers.push({
      marker: 'emotional_pitch_variation',
      confidence: Math.min(audioMetadata.pitchVariation / 60, 0.95),
      timespan: { start: 5, end: 25 },
      category: 'emotional_intensity'
    });
  }
  
  return markers;
}

function calculateMarkerConfidence(marker: string, audioMetadata: any): number {
  const baseConfidence: Record<string, number> = {
    'voice_break': 0.85,
    'trembling': 0.80,
    'sighing': 0.75,
    'upward_inflection': 0.82,
    'clear_tone': 0.78,
    'steady_rhythm': 0.76,
    'steady_tone': 0.74,
    'measured_pace': 0.72
  };
  
  let confidence = baseConfidence[marker] || 0.70;
  
  // Adjust based on supporting audio features
  if (marker === 'trembling' && audioMetadata.voiceShaking > 0.7) {
    confidence += 0.10;
  }
  
  if (marker === 'clear_tone' && audioMetadata.volumeVariation < 0.3) {
    confidence += 0.08;
  }
  
  return Math.min(confidence, 0.95);
}

function categorizeVoiceMarker(marker: string): string {
  const categories: Record<string, string> = {
    'voice_break': 'distress_indicator',
    'trembling': 'distress_indicator',
    'sighing': 'mild_distress',
    'upward_inflection': 'positive_indicator',
    'clear_tone': 'stability_indicator',
    'steady_rhythm': 'stability_indicator',
    'steady_tone': 'neutral_indicator',
    'measured_pace': 'control_indicator'
  };
  
  return categories[marker] || 'general_indicator';
}

function assessVoiceRisk(
  sentimentAnalysis: any,
  voiceMarkers: any[],
  contextualFactors?: any
): { level: 'low' | 'medium' | 'high'; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;
  
  // Sentiment-based risk
  if (sentimentAnalysis.emotionalScore < -0.6) {
    riskScore += 2;
    factors.push('Very negative emotional state');
  } else if (sentimentAnalysis.emotionalScore < -0.3) {
    riskScore += 1;
    factors.push('Negative emotional state');
  }
  
  // Voice marker risk factors
  const distressMarkers = voiceMarkers.filter(m => 
    m.category === 'distress_indicator' && m.confidence > 0.8
  );
  
  if (distressMarkers.length >= 2) {
    riskScore += 2;
    factors.push('Multiple vocal distress indicators');
  } else if (distressMarkers.length >= 1) {
    riskScore += 1;
    factors.push('Vocal distress indicators present');
  }
  
  // Contextual risk factors
  if (contextualFactors?.timeOfDay === 'late_night') {
    riskScore += 1;
    factors.push('Late night timing');
  }
  
  // Determine risk level
  let level: 'low' | 'medium' | 'high';
  if (riskScore >= 4) level = 'high';
  else if (riskScore >= 2) level = 'medium';
  else level = 'low';
  
  return { level, factors };
}

export default {
  name: AnalyzeVoiceSentimentTool.name,
  description: AnalyzeVoiceSentimentTool.description,
  agent: AnalyzeVoiceSentimentTool.agent,
  execute: analyzeVoiceSentiment
};