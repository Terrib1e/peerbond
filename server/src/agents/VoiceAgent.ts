/**
 * Voice Agent - Processes voice notes with transcription and emotional analysis
 * Handles voice-to-text conversion and voice-specific sentiment analysis
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class VoiceAgent extends BaseAgent {
  constructor() {
    super({
      id: 'voice',
      name: 'Voice Agent',
      description: 'Processes voice notes with transcription and emotional analysis',
      availableTools: ['transcribeVoiceNote', 'analyzeVoiceSentiment', 'processVoiceToText']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0.85;

    try {
      // Parse the voice processing request
      const voiceRequest = this.parseVoiceRequest(message);
      
      if (!voiceRequest) {
        return {
          response: this.getInvalidRequestResponse(),
          confidence: 0.3,
          toolsUsed: [],
          toolResults: [],
          metadata: { error: 'Invalid voice processing request' }
        };
      }

      logger.info(`[${this.name}] Processing voice request`, {
        requestType: voiceRequest.type,
        hasAudioData: !!voiceRequest.audioData,
        hasAudioUrl: !!voiceRequest.audioUrl,
        format: voiceRequest.format
      });

      let transcriptionResult: ToolResult | null = null;
      let transcriptionId: string | undefined;
      let transcribedText: string = '';

      // Step 1: Process voice to text (choose method based on input)
      if (voiceRequest.audioUrl) {
        // Use transcribeVoiceNote for URL-based audio
        const transcribeParams = {
          audioUrl: voiceRequest.audioUrl,
          memberId: context.memberId,
          language: voiceRequest.language || 'en-US',
          includeEmotionalAnalysis: true,
          confidenceThreshold: 0.8
        };

        transcriptionResult = await this.executeTool('transcribeVoiceNote', transcribeParams, context);
        toolsUsed.push('transcribeVoiceNote');
        toolResults.push(transcriptionResult);

        if (transcriptionResult.success && transcriptionResult.data) {
          transcriptionId = transcriptionResult.data.transcriptionId;
          transcribedText = transcriptionResult.data.text;
          confidence = transcriptionResult.data.confidence || 0.85;
        }
      } else if (voiceRequest.audioData) {
        // Use processVoiceToText for raw audio data
        const processParams = {
          audioData: voiceRequest.audioData,
          format: voiceRequest.format || 'mp3',
          quality: voiceRequest.quality || 'standard',
          speakerDiarization: voiceRequest.enableSpeakerDiarization || false,
          enhanceAudio: true
        };

        const processResult = await this.executeTool('processVoiceToText', processParams, context);
        toolsUsed.push('processVoiceToText');
        toolResults.push(processResult);

        if (processResult.success && processResult.data) {
          transcribedText = processResult.data.processedText;
          confidence = processResult.data.qualityScore || 0.8;
          
          // Create a mock transcription ID for voice sentiment analysis
          transcriptionId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      }

      // Step 2: Analyze voice sentiment if transcription was successful
      let sentimentAnalysis: any = null;
      if (transcriptionId && transcribedText.length > 0) {
        const sentimentParams = {
          transcriptionId,
          includeEmotionalMarkers: true,
          confidenceThreshold: 0.8,
          contextualFactors: {
            timeOfDay: this.getTimeOfDay(),
            recentEvents: [] // Could be populated from member history
          }
        };

        const sentimentResult = await this.executeTool('analyzeVoiceSentiment', sentimentParams, context);
        toolsUsed.push('analyzeVoiceSentiment');
        toolResults.push(sentimentResult);

        if (sentimentResult.success && sentimentResult.data) {
          sentimentAnalysis = sentimentResult.data;
          
          // Adjust confidence based on sentiment analysis confidence
          if (sentimentResult.data.overallSentiment) {
            confidence = Math.max(confidence, 0.8);
          }
        }
      }

      // Step 3: Generate comprehensive response
      response = this.generateVoiceProcessingResponse({
        transcribedText,
        transcriptionSuccess: !!transcriptionResult?.success,
        sentimentAnalysis,
        originalRequest: voiceRequest,
        processingResults: {
          transcriptionConfidence: transcriptionResult?.data?.confidence,
          emotionalMarkers: transcriptionResult?.data?.emotionalMarkers,
          qualityScore: confidence
        }
      });

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          transcribedText: transcribedText.substring(0, 500), // Truncate for privacy
          transcriptionId,
          sentimentAnalysis: sentimentAnalysis ? {
            overallSentiment: sentimentAnalysis.overallSentiment,
            emotionalScore: sentimentAnalysis.emotionalScore,
            riskLevel: sentimentAnalysis.riskAssessment?.level
          } : null,
          processingType: voiceRequest.type,
          audioFormat: voiceRequest.format,
          qualityScore: confidence
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error processing voice message:`, error);
      return {
        response: this.getErrorResponse(),
        confidence: 0.3,
        toolsUsed,
        toolResults,
        metadata: { error: error.message }
      };
    }
  }

  private parseVoiceRequest(message: string): any {
    try {
      // Try to parse as JSON (for API calls)
      const parsed = JSON.parse(message);
      if (parsed.audioUrl || parsed.audioData) {
        return {
          type: 'api_request',
          audioUrl: parsed.audioUrl,
          audioData: parsed.audioData,
          format: parsed.format,
          language: parsed.language,
          quality: parsed.quality,
          enableSpeakerDiarization: parsed.enableSpeakerDiarization
        };
      }
    } catch {
      // Not JSON, check for text-based voice processing requests
      const lowerMessage = message.toLowerCase();
      
      if (lowerMessage.includes('voice note') || lowerMessage.includes('audio message')) {
        // Text description of voice processing request
        return {
          type: 'text_request',
          description: message,
          format: 'mp3' // default
        };
      }
      
      // Check for file paths or URLs in the message
      const urlPattern = /(https?:\/\/[^\s]+\.(mp3|wav|ogg|m4a))/i;
      const filePathPattern = /([^\s]+\.(mp3|wav|ogg|m4a))/i;
      
      const urlMatch = message.match(urlPattern);
      const fileMatch = message.match(filePathPattern);
      
      if (urlMatch) {
        return {
          type: 'url_request',
          audioUrl: urlMatch[1],
          format: urlMatch[2].toLowerCase()
        };
      }
      
      if (fileMatch) {
        return {
          type: 'file_request',
          filePath: fileMatch[1],
          format: fileMatch[2].toLowerCase()
        };
      }
    }
    
    return null;
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'late_night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'late_night';
  }

  private generateVoiceProcessingResponse(data: {
    transcribedText: string;
    transcriptionSuccess: boolean;
    sentimentAnalysis: any;
    originalRequest: any;
    processingResults: any;
  }): string {
    let response = '';

    if (!data.transcriptionSuccess) {
      response = `I had trouble processing your voice message. This could be due to audio quality, format issues, or connectivity problems. `;
      response += `Please try again with a clear recording, or feel free to type your message instead. `;
      response += `I'm here to support you regardless of how you choose to communicate.`;
      return response;
    }

    // Successful transcription
    response = `I've successfully processed your voice message. `;
    
    if (data.transcribedText.length > 0) {
      // Provide brief summary of what was transcribed
      const wordCount = data.transcribedText.split(' ').length;
      response += `I transcribed about ${wordCount} words from your ${Math.floor(wordCount / 150) || 1}-minute message. `;
      
      // Include sentiment insights if available
      if (data.sentimentAnalysis) {
        const sentiment = data.sentimentAnalysis.overallSentiment;
        const emotionalScore = data.sentimentAnalysis.emotionalScore;
        
        if (sentiment === 'very_negative' || emotionalScore < -0.5) {
          response += `I can hear some distress in your voice, and I want you to know that I'm here to support you. `;
          
          // Check for crisis indicators
          if (data.sentimentAnalysis.riskAssessment?.level === 'high') {
            response += `I'm concerned about your wellbeing. Would you like me to connect you with crisis support resources? `;
          }
        } else if (sentiment === 'positive' || sentiment === 'very_positive') {
          response += `I can hear positive energy in your voice, which is wonderful. `;
        } else {
          response += `I'm listening carefully to both your words and the emotions in your voice. `;
        }
        
        // Voice-specific emotional markers
        if (data.sentimentAnalysis.voiceMarkers && data.sentimentAnalysis.voiceMarkers.length > 0) {
          const markers = data.sentimentAnalysis.voiceMarkers
            .filter(m => m.confidence > 0.7)
            .map(m => m.marker)
            .slice(0, 2);
          
          if (markers.length > 0) {
            response += `I noticed ${markers.join(' and ')} in your voice. `;
          }
        }
      }
      
      response += `What would you like to talk about regarding what you shared? I'm here to listen and provide support.`;
    } else {
      response = `I processed your voice message but wasn't able to extract clear speech. `;
      response += `This might be due to background noise, audio quality, or technical issues. `;
      response += `Would you like to try again, or would you prefer to type your message? I'm here to help either way.`;
    }

    // Add quality information if low
    if (data.processingResults.qualityScore < 0.6) {
      response += `\n\n*Note: The audio quality was a bit low, so I may have missed some nuances. `;
      response += `If anything seems unclear, please feel free to clarify.*`;
    }

    return response;
  }

  private getInvalidRequestResponse(): string {
    return `I'm designed to process voice messages and audio content. To use my voice processing capabilities, you can:

• Share an audio file URL (MP3, WAV, OGG, M4A formats)
• Upload an audio file for transcription
• Send voice message data for analysis

I can help with:
🎙️ **Voice-to-text transcription** with high accuracy
🎭 **Emotional analysis** of voice tone and inflection  
📊 **Voice sentiment analysis** for therapeutic insights
🔧 **Audio quality enhancement** and processing

How would you like to share your voice message with me?`;
  }

  protected getErrorResponse(): string {
    return `I'm experiencing technical difficulties with voice processing right now. 

In the meantime, I can still support you through text messages. Please feel free to type what you were going to say in your voice message.

If you're in crisis and need immediate support:
• Call 988 (Suicide & Crisis Lifeline)  
• Text HOME to 741741 (Crisis Text Line)
• Call 911 for emergencies

I'm here to help in whatever way I can.`;
  }
}

export default VoiceAgent;