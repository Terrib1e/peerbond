import { z } from 'zod';
import { BaseTool } from '../base';
import { ToolContext } from '../types';

const EscalateCrisisSchema = z.object({
  severity: z.enum(['moderate', 'high', 'critical']).describe('Severity level of the crisis'),
  userId: z.string().describe('ID of the user in crisis'),
  indicators: z.array(z.string()).describe('Specific indicators that triggered the escalation'),
  immediateRisk: z.boolean().describe('Whether there is immediate risk of harm'),
  context: z.string().max(1000).describe('Additional context about the situation'),
  previousInterventions: z.array(z.object({
    type: z.string(),
    timestamp: z.string(),
    outcome: z.string()
  })).optional().describe('Previous intervention attempts')
});

type EscalateCrisisArgs = z.infer<typeof EscalateCrisisSchema>;

interface CrisisEscalationResult {
  escalationId: string;
  therapistNotified: boolean;
  therapistId: string;
  estimatedResponseTime: number; // in minutes
  supportProtocol: string[];
  emergencyContactsNotified: boolean;
}

export class EscalateCrisisTool extends BaseTool<EscalateCrisisArgs, CrisisEscalationResult> {
  name = 'escalateCrisis';
  description = 'Escalates a mental health crisis to on-call therapist and activates emergency protocols';
  schema = EscalateCrisisSchema;
  permissions = ['crisis:escalate', 'therapist:notify'];
  // No rate limit for crisis situations

  protected async run(args: EscalateCrisisArgs, context: ToolContext): Promise<CrisisEscalationResult> {
    const escalationId = `crisis_${Date.now()}_${args.userId}`;
    
    // In a real implementation, this would:
    // 1. Page on-call therapist via multiple channels
    // 2. Create priority ticket in crisis management system
    // 3. Lock user's account to crisis mode
    // 4. Notify emergency contacts if configured
    // 5. Start recording all interactions for review

    // Mock implementation
    const therapistId = await this.getOnCallTherapist(args.severity);
    const protocol = this.getProtocolForSeverity(args.severity);
    const responseTime = this.estimateResponseTime(args.severity);

    // Log crisis escalation with full audit trail
    console.log(`CRISIS ESCALATION for user ${args.userId}:`, {
      escalationId,
      severity: args.severity,
      immediateRisk: args.immediateRisk,
      indicators: args.indicators,
      therapistAssigned: therapistId,
      timestamp: new Date().toISOString()
    });

    // Simulate notification systems
    const notificationsSent = await this.sendNotifications(
      therapistId,
      args,
      context
    );

    return {
      escalationId,
      therapistNotified: notificationsSent,
      therapistId,
      estimatedResponseTime: responseTime,
      supportProtocol: protocol,
      emergencyContactsNotified: args.immediateRisk
    };
  }

  private async getOnCallTherapist(severity: string): Promise<string> {
    // In real implementation, check on-call schedule
    // Prioritize by specialty and availability
    const therapistPool = {
      critical: 'therapist_crisis_001',
      high: 'therapist_senior_002',
      moderate: 'therapist_oncall_003'
    };
    
    return therapistPool[severity as keyof typeof therapistPool];
  }

  private getProtocolForSeverity(severity: string): string[] {
    const protocols = {
      critical: [
        'Immediate therapist intervention',
        'Contact emergency services if location known',
        'Lock account to crisis resources only',
        'Deploy crisis AI companion',
        'Notify designated emergency contacts'
      ],
      high: [
        'Priority therapist queue',
        'Activate safety plan',
        'Increase check-in frequency',
        'Provide crisis hotline numbers',
        'Schedule follow-up within 24 hours'
      ],
      moderate: [
        'Schedule urgent session',
        'Provide coping resources',
        'Enable peer support priority',
        'Daily mood check-ins',
        'Review medication compliance'
      ]
    };

    return protocols[severity as keyof typeof protocols] || protocols.moderate;
  }

  private estimateResponseTime(severity: string): number {
    const responseMap = {
      critical: 5,    // 5 minutes
      high: 15,       // 15 minutes
      moderate: 30    // 30 minutes
    };
    
    return responseMap[severity as keyof typeof responseMap] || 30;
  }

  private async sendNotifications(
    therapistId: string,
    args: EscalateCrisisArgs,
    _context: ToolContext
  ): Promise<boolean> {
    // In real implementation:
    // - SMS to therapist
    // - Push notification
    // - Email with full context
    // - Slack/Teams alert to crisis channel
    
    console.log(`Notifications sent to ${therapistId} for crisis ${args.severity}`);
    return true;
  }

  async validate(args: EscalateCrisisArgs, _context: ToolContext): Promise<boolean> {
    // Ensure crisis escalation is justified
    if (args.severity === 'critical' && !args.immediateRisk) {
      throw new Error('Critical severity requires immediate risk flag');
    }

    if (args.indicators.length === 0) {
      throw new Error('At least one indicator must be provided');
    }

    return true;
  }
}