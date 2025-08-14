"use strict";
/**
 * Provide Supportive Response Tool
 * Generates therapeutic, empathetic responses based on evidence-based practices
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.provideSupportiveResponse = provideSupportiveResponse;
const database_1 = require("../../../../server/src/services/database");
const geminiService_1 = require("../../../../server/src/services/geminiService");
/**
 * Generate a supportive, therapeutic response using evidence-based approaches
 */
async function provideSupportiveResponse(params, context) {
    const dbService = new database_1.DatabaseService();
    const geminiService = new geminiService_1.GeminiService();
    try {
        // Determine emotional state if not provided
        const emotionalState = params.emotionalState || 'neutral';
        const therapeuticApproach = params.therapeuticApproach || 'validation';
        // Get member context from database
        const member = await dbService.getMemberById(context.memberId);
        if (!member) {
            throw new Error('Member not found');
        }
        // Build therapeutic prompt based on approach
        const therapeuticPrompts = {
            cbt: `Using Cognitive Behavioral Therapy principles, provide a supportive response that helps identify thoughts, feelings, and behaviors. Focus on gentle questioning and reframing negative thought patterns.`,
            dbt: `Using Dialectical Behavior Therapy principles, provide validation and practical coping skills. Focus on mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness.`,
            mindfulness: `Using mindfulness-based approaches, guide toward present-moment awareness and acceptance. Include breathing techniques or grounding exercises when appropriate.`,
            validation: `Provide warm validation of their experience. Acknowledge their feelings as valid and understandable. Use reflective listening and empathetic responses.`,
            motivational: `Use motivational interviewing techniques to explore their own motivation for change. Ask open-ended questions and reflect their own words back to them.`
        };
        const systemPrompt = `You are Maya, a compassionate AI mental health facilitator. ${therapeuticPrompts[therapeuticApproach]}

Member's current emotional state: ${emotionalState}
Member's name: ${member.firstName}
Session context: ${params.previousContext || 'Individual support session'}

Guidelines:
- Be warm, empathetic, and non-judgmental
- Use person-first language
- Validate their experience before offering suggestions
- Keep responses conversational and accessible
- Avoid medical advice or diagnosis
- If crisis indicators, acknowledge and suggest professional support
- Use their name occasionally to personalize the response

Respond to their message with therapeutic support:`;
        const response = await geminiService.generateResponse(`${systemPrompt}\n\nMember's message: "${params.memberMessage}"\n\nYour supportive response:`);
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
                memberName: member.firstName
            },
            metadata: {
                toolName: 'provideSupportiveResponse',
                confidence: 0.85,
                approach: therapeuticApproach,
                validationProvided: true
            }
        };
    }
    catch (error) {
        console.error('[ProvideSupportiveResponse] Error:', error);
        // Fallback response for errors
        const fallbackResponse = "I hear you, and I want you to know that what you're sharing matters. Sometimes it takes real courage to reach out and talk about what we're experiencing. How are you feeling right now in this moment?";
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
//# sourceMappingURL=provideSupportiveResponse.js.map