/**
 * Crisis Agent - Handles crisis intervention and provides immediate safety resources
 * Prioritizes member safety with evidence-based crisis response protocols
 */

import { BaseAgent, AgentExecutionResult } from './BaseAgent';
import { ToolContext, ToolResult } from '../tools/schemas';
import { logger } from '../utils/logger';

export class CrisisAgent extends BaseAgent {
  constructor() {
    super({
      id: 'crisis',
      name: 'Crisis Agent',
      description: 'Handles crisis intervention and provides immediate safety resources',
      availableTools: ['provideCrisisSupport', 'escalateToHuman']
    });
  }

  protected async processMessage(
    message: string,
    context: ToolContext
  ): Promise<AgentExecutionResult> {
    const toolsUsed: string[] = [];
    const toolResults: ToolResult[] = [];
    let response = '';
    let confidence = 0;

    try {
      // Analyze crisis severity
      const crisisAnalysis = this.analyzeCrisisSeverity(message);
      
      logger.info(`[${this.name}] Crisis analysis:`, {
        crisisType: crisisAnalysis.type,
        severityLevel: crisisAnalysis.severity,
        requiresEscalation: crisisAnalysis.requiresEscalation
      });

      // Step 1: Provide immediate crisis support
      const supportParams = {
        crisisType: crisisAnalysis.type,
        severityLevel: crisisAnalysis.severity,
        immediateNeeds: crisisAnalysis.immediateNeeds,
        availableSupports: []
      };

      const supportResult = await this.executeTool('provideCrisisSupport', supportParams, context);
      toolsUsed.push('provideCrisisSupport');
      toolResults.push(supportResult);

      if (supportResult.success && supportResult.data) {
        response = supportResult.data.immediateResponse || '';
        
        // Add safety resources
        if (supportResult.data.safetyResources) {
          response += '\n\n**Immediate Support Available:**\n';
          supportResult.data.safetyResources.forEach(resource => {
            response += `• **${resource.name}**: ${resource.contact}\n`;
            response += `  ${resource.description}\n`;
          });
        }

        // Add grounding techniques
        if (supportResult.data.groundingTechniques && supportResult.data.groundingTechniques.length > 0) {
          response += '\n**Right Now Coping Techniques:**\n';
          supportResult.data.groundingTechniques.slice(0, 3).forEach(technique => {
            response += `• ${technique}\n`;
          });
        }

        confidence = supportResult.confidence || 0.95;
      }

      // Step 2: Escalate to human if needed
      if (crisisAnalysis.requiresEscalation) {
        const escalationParams = {
          urgencyLevel: crisisAnalysis.severity === 'imminent' ? 'emergency' : 'urgent',
          crisisDetails: `Type: ${crisisAnalysis.type}, Severity: ${crisisAnalysis.severity}`,
          memberConsent: true, // In crisis, implied consent for safety
          locationInfo: undefined
        };

        const escalationResult = await this.executeTool('escalateToHuman', escalationParams, context);
        toolsUsed.push('escalateToHuman');
        toolResults.push(escalationResult);

        if (escalationResult.success && escalationResult.data) {
          response += '\n\n🚨 **Professional Support Activated**\n';
          response += `A crisis counselor has been notified and will connect with you ${escalationResult.data.estimatedResponseTime}.\n`;
          response += `Reference: ${escalationResult.data.ticketId}\n`;
          
          if (escalationResult.data.emergencyProtocolActivated) {
            response += '\n⚠️ Emergency protocol has been activated for your safety.';
          }
        }
      }

      // Add safety plan reminder
      response += this.addSafetyPlanReminder(crisisAnalysis.severity);

      // Add hope and connection
      response += '\n\n💙 You are not alone. Reaching out shows incredible strength, and there are people who want to help you through this moment.';

      return {
        response,
        confidence,
        toolsUsed,
        toolResults,
        metadata: {
          crisisType: crisisAnalysis.type,
          severityLevel: crisisAnalysis.severity,
          escalated: crisisAnalysis.requiresEscalation,
          interventionProvided: true
        }
      };

    } catch (error) {
      logger.error(`[${this.name}] Error in processMessage:`, error);
      
      // In crisis situations, always provide safety resources even on error
      return {
        response: this.getCrisisErrorResponse(),
        confidence: 1.0,
        toolsUsed,
        toolResults,
        metadata: { 
          error: error.message,
          safetyResourcesProvided: true 
        }
      };
    }
  }

  private analyzeCrisisSeverity(message: string): {
    type: 'suicidal_ideation' | 'self_harm' | 'panic_attack' | 'substance_crisis' | 'emotional_overwhelm';
    severity: 'mild' | 'moderate' | 'severe' | 'imminent';
    requiresEscalation: boolean;
    immediateNeeds: string[];
  } {
    const lowerMessage = message.toLowerCase();
    
    // Imminent risk indicators
    const imminentRisk = [
      'right now', 'tonight', 'today', 'going to', 'have a plan', 
      'have the means', 'goodbye', 'final', 'end it now'
    ];
    
    // Suicidal ideation indicators
    const suicidalIndicators = [
      'suicide', 'kill myself', 'end my life', 'not worth living',
      'better off dead', 'want to die', 'no reason to live'
    ];
    
    // Self-harm indicators
    const selfHarmIndicators = [
      'hurt myself', 'cut myself', 'self harm', 'self-harm',
      'burn myself', 'punish myself'
    ];
    
    // Panic indicators
    const panicIndicators = [
      'panic attack', 'can\'t breathe', 'heart racing', 'dying',
      'losing control', 'going crazy'
    ];
    
    // Substance crisis indicators
    const substanceIndicators = [
      'overdose', 'too much', 'drunk', 'high', 'relapse',
      'using again', 'can\'t stop drinking'
    ];

    let type: any = 'emotional_overwhelm';
    let severity: any = 'moderate';
    let requiresEscalation = false;
    const immediateNeeds: string[] = [];

    // Determine crisis type
    if (suicidalIndicators.some(indicator => lowerMessage.includes(indicator))) {
      type = 'suicidal_ideation';
      severity = 'severe';
      requiresEscalation = true;
      immediateNeeds.push('Safety assessment', 'Immediate support');
    } else if (selfHarmIndicators.some(indicator => lowerMessage.includes(indicator))) {
      type = 'self_harm';
      severity = 'severe';
      requiresEscalation = true;
      immediateNeeds.push('Harm reduction', 'Alternative coping');
    } else if (panicIndicators.some(indicator => lowerMessage.includes(indicator))) {
      type = 'panic_attack';
      severity = 'moderate';
      immediateNeeds.push('Grounding', 'Breathing support');
    } else if (substanceIndicators.some(indicator => lowerMessage.includes(indicator))) {
      type = 'substance_crisis';
      severity = 'severe';
      requiresEscalation = true;
      immediateNeeds.push('Medical assessment', 'Recovery support');
    }

    // Check for imminent risk
    if (imminentRisk.some(indicator => lowerMessage.includes(indicator))) {
      severity = 'imminent';
      requiresEscalation = true;
      immediateNeeds.unshift('Immediate intervention');
    }

    return {
      type,
      severity,
      requiresEscalation,
      immediateNeeds
    };
  }

  private addSafetyPlanReminder(severity: string): string {
    if (severity === 'imminent' || severity === 'severe') {
      return `\n\n📋 **Safety Plan Reminder**:
1. Remove or secure any means of harm
2. Call someone you trust right now
3. Go to a safe place where you're not alone
4. Use the crisis resources above if needed`;
    }
    
    return `\n\n🛡️ **Remember Your Coping Tools**:
• Reach out to your support network
• Use grounding techniques when overwhelmed
• Take things one moment at a time`;
  }

  private getCrisisErrorResponse(): string {
    return `I'm here and I want to help you through this crisis. While I'm experiencing technical issues, your safety is my top priority.

**Please reach out for immediate support:**

🆘 **Crisis Hotlines (24/7)**:
• **National Suicide Prevention Lifeline**: 988
• **Crisis Text Line**: Text HOME to 741741
• **Emergency Services**: 911

**International Crisis Lines**:
• **UK**: 116 123 (Samaritans)
• **Canada**: 1-833-456-4566
• **Australia**: 13 11 14 (Lifeline)

**Immediate Coping**:
• Take slow, deep breaths (4 counts in, 6 counts out)
• Call a trusted friend or family member
• Go to your nearest emergency room if in immediate danger

You matter. Your life has value. Please reach out for help right now. 💙`;
  }

  protected getErrorResponse(): string {
    return this.getCrisisErrorResponse();
  }
}