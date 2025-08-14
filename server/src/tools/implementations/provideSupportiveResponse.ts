/**
 * Provide Supportive Response Tool
 * Generates therapeutic, empathetic responses based on evidence-based practices
 */

import { ToolContext, ToolResult } from '../schemas';
import { DatabaseService } from '../../services/database';
import { GeminiService } from '../../services/geminiService';

export interface ProvideSupportiveResponseParams {
  memberMessage: string;
  emotionalState?: 'positive' | 'neutral' | 'distressed' | 'crisis';
  therapeuticApproach?: 'cbt' | 'dbt' | 'mindfulness' | 'validation' | 'motivational';
  previousContext?: string;
}

/**
 * Generate a supportive, therapeutic response using evidence-based approaches
 */
export async function provideSupportiveResponse(
  params: ProvideSupportiveResponseParams,
  context: ToolContext
): Promise<ToolResult> {
  const dbService = new DatabaseService();
  const geminiService = new GeminiService();

  try {
    // Determine emotional state if not provided
    const emotionalState = params.emotionalState || 'neutral';
    const therapeuticApproach = params.therapeuticApproach || 'validation';

    // Get member context from database (graceful fallback if not found)
    let member = null;
    try {
      member = await dbService.getMemberById(context.memberId);
    } catch (error) {
      console.warn('[ProvideSupportiveResponse] Member not found in database, using anonymous mode:', context.memberId);
    }

    // Build therapeutic prompt based on approach
    const therapeuticPrompts = {
      cbt: `Using Cognitive Behavioral Therapy principles, provide a supportive response that offers practical insights, identifies helpful thought patterns, and provides actionable strategies. Include specific techniques they can use right now.`,
      dbt: `Using Dialectical Behavior Therapy principles, provide validation AND practical coping skills. Give them specific mindfulness techniques, distress tolerance strategies, or emotion regulation tools they can implement immediately.`,
      mindfulness: `Using mindfulness-based approaches, provide a specific breathing technique, grounding exercise, or present-moment practice they can do right now. Give clear, step-by-step instructions.`,
      validation: `Provide warm validation of their experience AND offer helpful perspective or insight. Acknowledge their feelings and then provide supportive guidance or encouragement.`,
      motivational: `Acknowledge their situation and provide encouragement about their ability to handle this. Offer specific suggestions while highlighting their strengths and resilience.`
    };

    const systemPrompt = `You are Maya, a compassionate AI mental health facilitator. ${therapeuticPrompts[therapeuticApproach]}

Member's current emotional state: ${emotionalState}
Member's name: ${member?.firstName || 'there'}
Session context: ${params.previousContext || 'Individual support session'}

Guidelines:
- Be warm, empathetic, and non-judgmental
- Provide ACTIONABLE support - give them something they can DO right now
- Validate their experience AND offer practical help
- Keep responses helpful and solution-oriented
- Avoid medical advice or diagnosis
- If crisis indicators, acknowledge and suggest professional support
- Use their name occasionally to personalize the response
- IMPORTANT: Provide real advice, strategies, and insights - not just questions

Your goal is to give them helpful, practical support they can use immediately. Respond to their message with specific therapeutic guidance:`;

    const response = await geminiService.generateResponse(
      `${systemPrompt}\n\nMember's message: "${params.memberMessage}"\n\nYour supportive response:`
    );

    // Log tool usage for audit trail
    await dbService.createAuditLog({
      memberId: context.memberId,
      action: 'tool_executed',
      resource: 'supportive_response',
      resourceId: context.sessionId,
      ipAddress: 'system',
      memberAgent: 'maya-facilitator',
      metadata: {
        tool: 'provideSupportiveResponse',
        emotionalState,
        therapeuticApproach,
        messageLength: params.memberMessage.length,
        responseLength: response.length
      }
    });

    return {
      success: true,
      data: {
        response: response.trim(),
        therapeuticApproach,
        emotionalState,
        memberName: member?.firstName || 'there'
      },
      metadata: {
        toolName: 'provideSupportiveResponse',
        confidence: 0.85,
        approach: therapeuticApproach,
        validationProvided: true
      }
    };

  } catch (error) {
    console.error('[ProvideSupportiveResponse] Error:', error);
    
    // Fallback response for errors - provide actual support instead of just questions
    const fallbackResponse = "I hear you, and I want you to know that what you're sharing matters. It takes real courage to reach out. Here's something that might help right now: take three slow, deep breaths - in for 4 counts, hold for 4, out for 6. This can help activate your parasympathetic nervous system and create a sense of calm. You're not alone in this, and your feelings are valid. What you're experiencing is part of being human, and you have the strength to work through this.";

    return {
      success: false,
      data: { response: fallbackResponse },
      error: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        toolName: 'provideSupportiveResponse',
        confidence: 0.3,
        fallback: true
      }
    };
  }
}