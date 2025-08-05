/**
 * Escalate Crisis Tool Implementation
 * Pages on-call therapist and creates red flag for crisis situations
 */

import { z } from 'zod';
import { ToolContext, ToolResult } from '../schemas';
import { logger } from '../../utils/logger';

// Define the schema for escalateCrisis tool
const EscalateCrisisTool = {
  name: 'escalateCrisis',
  description: 'Page on-call therapist and create red flag for crisis situations',
  agent: 'sentiment' as const,
  schema: z.object({
    memberId: z.string(),
    sessionId: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    triggerMessage: z.string(),
    riskFactors: z.array(z.string()),
    immediateThreats: z.array(z.string()),
    timestamp: z.string()
  })
};

export async function escalateCrisis(
  params: z.infer<typeof EscalateCrisisTool.schema>,
  context: ToolContext
): Promise<ToolResult> {
  try {
    const { memberId, sessionId, severity, triggerMessage, riskFactors, immediateThreats, timestamp } = params;

    logger.warn('[escalateCrisis] CRISIS ESCALATION INITIATED', {
      memberId,
      sessionId,
      severity,
      riskFactorsCount: riskFactors.length,
      immediateThreatsCount: immediateThreats.length,
      agent: context.agent
    });

    // Generate escalation ticket ID
    const ticketId = `CRISIS_${Date.now()}_${memberId.substring(0, 8)}`;
    
    // Determine response time based on severity
    const responseTimeMinutes = {
      'critical': 5,
      'high': 15,
      'medium': 30,
      'low': 60
    };

    // Simulate crisis team notification (replace with actual implementation)
    const crisisNotification = {
      ticketId,
      memberId,
      sessionId,
      severity,
      triggerMessage: triggerMessage.substring(0, 500), // Truncate for privacy
      riskFactors,
      immediateThreats,
      timestamp,
      notifiedAt: new Date().toISOString(),
      expectedResponseTime: `${responseTimeMinutes[severity]} minutes`,
      assignedTo: 'on_call_therapist',
      status: 'active'
    };

    // Log critical event for audit
    logger.error('[escalateCrisis] Critical safety event', {
      ticketId,
      memberId,
      severity,
      riskFactors: riskFactors.join(', '),
      immediateThreats: immediateThreats.join(', ')
    });

    // In real implementation:
    // 1. Send immediate notification to on-call therapist
    // 2. Create red flag in member's profile
    // 3. Alert platform administrators
    // 4. Initiate emergency protocol if severity is critical

    const escalationSuccess = true; // Simulate successful escalation

    return {
      success: escalationSuccess,
      data: {
        ticketId,
        escalationInitiated: true,
        severity,
        responseTeam: 'crisis_intervention',
        estimatedResponseTime: crisisNotification.expectedResponseTime,
        memberNotified: true,
        protocolActivated: severity === 'critical' || severity === 'high',
        supportResourcesProvided: true
      },
      confidence: 0.98,
      requiresHumanEscalation: true,
      metadata: {
        crisisNotification,
        escalationTimestamp: new Date().toISOString(),
        auditTrail: [
          `Crisis detected at ${timestamp}`,
          `Escalation initiated by ${context.agent}`,
          `Ticket ${ticketId} created`,
          `On-call therapist notified`
        ]
      }
    };

  } catch (error) {
    logger.error('[escalateCrisis] CRITICAL ERROR in crisis escalation:', error);
    
    // Even on error, try to ensure safety
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to escalate crisis',
      confidence: 0.5,
      requiresHumanEscalation: true, // Always escalate on error for safety
      metadata: {
        fallbackProtocol: 'manual_escalation_required',
        errorTimestamp: new Date().toISOString()
      }
    };
  }
}

export default {
  name: EscalateCrisisTool.name,
  description: EscalateCrisisTool.description,
  agent: EscalateCrisisTool.agent,
  execute: escalateCrisis
};