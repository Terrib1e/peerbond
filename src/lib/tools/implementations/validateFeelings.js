"use strict";
/**
 * Validate Feelings Tool
 * Provides empathetic validation and emotional normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFeelings = validateFeelings;
const database_1 = require("../../../../server/src/services/database");
const geminiService_1 = require("../../../../server/src/services/geminiService");
/**
 * Validate and normalize the member's emotional experience
 */
async function validateFeelings(params, context) {
    const dbService = new database_1.DatabaseService();
    const geminiService = new geminiService_1.GeminiService();
    try {
        // Get member information
        const member = await dbService.getMemberById(context.memberId);
        if (!member) {
            throw new Error('Member not found');
        }
        // Analyze emotional content if emotions not provided
        let emotions = params.identifiedEmotions;
        if (!emotions || emotions.length === 0) {
            const emotionAnalysisPrompt = `Extract the main emotions from this message. Return only the emotion words, separated by commas:

"${params.memberMessage}"

Common emotions: sad, angry, anxious, frustrated, hopeful, confused, overwhelmed, lonely, excited, scared, proud, disappointed, grateful, guilty, numb, etc.`;
            const emotionResponse = await geminiService.generateResponse(emotionAnalysisPrompt);
            emotions = emotionResponse.split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0);
        }
        // Generate validation response
        const validationPrompt = `You are Maya, a compassionate mental health facilitator. Your role is to validate and normalize the member's emotional experience.

Member: ${member.firstName}
Identified emotions: ${emotions.join(', ')}
Emotional intensity: ${params.intensity || 'moderate'}
Context: ${params.context || 'ongoing'}

Member's message: "${params.memberMessage}"

Provide emotional validation that:
1. Acknowledges their specific emotions as valid and understandable
2. Normalizes their experience ("Many people feel this way when...")
3. Reflects back what you're hearing without judgment
4. Shows understanding of the emotional complexity
5. Avoids minimizing or "fixing" their feelings
6. Uses warm, accepting language

Keep the response conversational and genuine. Focus purely on validation, not problem-solving.`;
        const validationResponse = await geminiService.generateResponse(validationPrompt);
        // Determine if additional support might be needed
        const needsAdditionalSupport = emotions?.some((emotion) => ['hopeless', 'suicidal', 'worthless', 'trapped', 'desperate'].includes(emotion)) || params.intensity === 'overwhelming';
        // Log the validation
        await dbService.createAuditLog({
            memberId: context.memberId,
            action: 'tool_executed',
            resource: 'feelings_validation',
            resourceId: context.sessionId,
            ipAddress: 'system',
            memberAgent: 'maya-facilitator',
            metadata: {
                tool: 'validateFeelings',
                identifiedEmotions: emotions || [],
                intensity: params.intensity,
                needsAdditionalSupport,
                validationProvided: true
            }
        });
        return {
            success: true,
            data: {
                validationResponse: validationResponse.trim(),
                identifiedEmotions: emotions,
                emotionalIntensity: params.intensity || 'moderate',
                needsAdditionalSupport,
                memberName: member.firstName
            },
            metadata: {
                toolName: 'validateFeelings',
                confidence: 0.9,
                emotionsValidated: emotions?.length || 0,
                supportLevel: needsAdditionalSupport ? 'high' : 'standard'
            }
        };
    }
    catch (error) {
        console.error('[ValidateFeelings] Error:', error);
        // Fallback validation response
        const fallbackResponse = "What you're feeling right now is completely valid and understandable. Emotions can be complex and sometimes overwhelming, and it's okay to feel whatever you're feeling. Thank you for sharing this with me - it takes courage to be open about our emotional experiences.";
        return {
            success: false,
            data: {
                validationResponse: fallbackResponse,
                identifiedEmotions: [],
                needsAdditionalSupport: false
            },
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
                toolName: 'validateFeelings',
                confidence: 0.4,
                fallback: true
            }
        };
    }
}
//# sourceMappingURL=validateFeelings.js.map