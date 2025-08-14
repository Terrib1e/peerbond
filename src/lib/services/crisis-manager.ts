import { EventEmitter } from 'events';
import { auditService } from '../security/audit';

export interface CrisisEvent {
  id: string;
  memberId: string;
  severity: 'moderate' | 'high' | 'critical';
  indicators: string[];
  timestamp: Date;
  sessionId: string;
  agentId: string;
  memberMessage: string;
  escalationPath: string[];
}

export interface TherapistNotification {
  therapistId: string;
  notificationType: 'sms' | 'email' | 'push' | 'pager';
  status: 'sent' | 'delivered' | 'failed';
  timestamp: Date;
}

export class CrisisManager extends EventEmitter {
  private activeCrises: Map<string, CrisisEvent> = new Map();
  private escalationQueue: CrisisEvent[] = [];
  private therapistAvailability: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Trigger crisis escalation
   */
  async escalateCrisis(params: {
    memberId: string;
    severity: 'moderate' | 'high' | 'critical';
    indicators: string[];
    sessionId: string;
    agentId: string;
    memberMessage: string;
  }): Promise<{
    crisisId: string;
    therapistAssigned: string;
    estimatedResponseTime: number;
    immediateActions: string[];
  }> {
    const crisisId = `crisis_${Date.now()}_${params.memberId}`;

    const crisis: CrisisEvent = {
      id: crisisId,
      ...params,
      timestamp: new Date(),
      escalationPath: []
    };

    // Store active crisis
    this.activeCrises.set(crisisId, crisis);
    this.escalationQueue.push(crisis);

    // Emit crisis event for real-time handling
    this.emit('crisis:detected', crisis);

    // Get available therapist based on severity
    const therapist = await this.assignTherapist(crisis);

    // Send notifications
    await this.sendNotifications(crisis, therapist);

    // Log to audit trail
    await auditService.log({
      memberId: params.memberId,
      agentId: params.agentId,
      action: 'crisis:escalate',
      resource: `crisis:${crisisId}`,
      result: 'success',
      metadata: {
        severity: params.severity,
        therapistAssigned: therapist.id,
        indicators: params.indicators
      }
    });

    // Determine immediate actions
    const immediateActions = this.getImmediateActions(params.severity);

    return {
      crisisId,
      therapistAssigned: therapist.id,
      estimatedResponseTime: this.getResponseTime(params.severity),
      immediateActions
    };
  }

  /**
   * Assign therapist based on severity and availability
   */
  private async assignTherapist(crisis: CrisisEvent): Promise<{
    id: string;
    name: string;
    specialty: string;
  }> {
    // In production, this would check real therapist availability
    const therapistPool = {
      critical: {
        id: 'ther_crisis_001',
        name: 'Dr. Emergency Response',
        specialty: 'Crisis Intervention'
      },
      high: {
        id: 'ther_senior_002',
        name: 'Dr. Sarah Mitchell',
        specialty: 'Trauma & Crisis'
      },
      moderate: {
        id: 'ther_oncall_003',
        name: 'Dr. James Wilson',
        specialty: 'General Mental Health'
      }
    };

    const therapist = therapistPool[crisis.severity];

    // Mark therapist as busy
    this.therapistAvailability.set(therapist.id, false);

    // Add to escalation path
    crisis.escalationPath.push(`Assigned to ${therapist.name}`);

    return therapist;
  }

  /**
   * Send multi-channel notifications
   */
  private async sendNotifications(
    crisis: CrisisEvent,
    therapist: any
  ): Promise<TherapistNotification[]> {
    const notifications: TherapistNotification[] = [];

    // Critical: Use all channels
    if (crisis.severity === 'critical') {
      notifications.push(
        await this.sendSMS(therapist.id, crisis),
        await this.sendPushNotification(therapist.id, crisis),
        await this.sendPager(therapist.id, crisis)
      );
    }
    // High: SMS and Push
    else if (crisis.severity === 'high') {
      notifications.push(
        await this.sendSMS(therapist.id, crisis),
        await this.sendPushNotification(therapist.id, crisis)
      );
    }
    // Moderate: Push notification
    else {
      notifications.push(
        await this.sendPushNotification(therapist.id, crisis)
      );
    }

    return notifications;
  }

  private async sendSMS(therapistId: string, crisis: CrisisEvent): Promise<TherapistNotification> {
    // In production, integrate with Twilio or similar
    console.log(`[CrisisManager] Sending SMS to ${therapistId} for crisis ${crisis.id}`);

    return {
      therapistId,
      notificationType: 'sms',
      status: 'sent',
      timestamp: new Date()
    };
  }

  private async sendPushNotification(therapistId: string, _crisis: CrisisEvent): Promise<TherapistNotification> {
    // In production, use Firebase or similar
    console.log(`[CrisisManager] Sending push notification to ${therapistId}`);

    return {
      therapistId,
      notificationType: 'push',
      status: 'sent',
      timestamp: new Date()
    };
  }

  private async sendPager(therapistId: string, _crisis: CrisisEvent): Promise<TherapistNotification> {
    // For critical situations
    console.log(`[CrisisManager] Paging ${therapistId} - CRITICAL`);

    return {
      therapistId,
      notificationType: 'pager',
      status: 'sent',
      timestamp: new Date()
    };
  }

  private getResponseTime(severity: string): number {
    const times = {
      critical: 5,    // 5 minutes
      high: 15,       // 15 minutes
      moderate: 30    // 30 minutes
    };
    return times[severity as keyof typeof times] || 30;
  }

  private getImmediateActions(severity: string): string[] {
    const actions = {
      critical: [
        'Therapist notified via all channels',
        'Crisis resources displayed to member',
        'Session locked to crisis mode',
        'Emergency contacts notified',
        '911 reminder provided'
      ],
      high: [
        'Therapist notified urgently',
        'Safety plan activated',
        'Crisis hotlines provided',
        'Check-in scheduled'
      ],
      moderate: [
        'Therapist notified',
        'Coping resources provided',
        'Follow-up scheduled within 24 hours'
      ]
    };

    return actions[severity as keyof typeof actions] || actions.moderate;
  }

  /**
   * Monitor active crises
   */
  getActiveCrises(): CrisisEvent[] {
    return Array.from(this.activeCrises.values());
  }

  /**
   * Resolve a crisis
   */
  async resolveCrisis(crisisId: string, resolution: {
    therapistId: string;
    notes: string;
    followUpRequired: boolean;
  }): Promise<void> {
    const crisis = this.activeCrises.get(crisisId);
    if (!crisis) {
      throw new Error(`Crisis ${crisisId} not found`);
    }

    // Remove from active crises
    this.activeCrises.delete(crisisId);

    // Free up therapist
    this.therapistAvailability.set(resolution.therapistId, true);

    // Emit resolution event
    this.emit('crisis:resolved', {
      crisis,
      resolution,
      duration: Date.now() - crisis.timestamp.getTime()
    });

    // Audit log
    await auditService.log({
      memberId: crisis.memberId,
      agentId: 'crisis-manager',
      action: 'crisis:resolve',
      resource: `crisis:${crisisId}`,
      result: 'success',
      metadata: resolution
    });
  }

  private setupEventHandlers() {
    // Handle crisis detection
    this.on('crisis:detected', (crisis: CrisisEvent) => {
      console.log(`[CrisisManager] Crisis detected: ${crisis.id} - Severity: ${crisis.severity}`);
    });

    // Handle crisis resolution
    this.on('crisis:resolved', (data) => {
      console.log(`[CrisisManager] Crisis resolved: ${data.crisis.id} - Duration: ${data.duration}ms`);
    });
  }
}

// Singleton instance
export const crisisManager = new CrisisManager();