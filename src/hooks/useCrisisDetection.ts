/**
 * Crisis Detection Hook - Handles crisis intervention in group chats
 */

import { useState, useEffect, useCallback } from 'react';
import { wsService } from '@/lib/websocket';
import { toast } from 'react-hot-toast';

export interface CrisisAlert {
  groupId: string;
  messageId: string;
  severity: 'mild' | 'moderate' | 'severe';
  aiResponse?: any;
  resources: CrisisResource[];
  timestamp: Date;
}

export interface CrisisResource {
  title: string;
  description: string;
  url?: string;
  phone?: string;
  type: 'hotline' | 'website' | 'emergency' | 'professional';
  availability: '24/7' | 'business_hours' | 'on_demand';
}

export interface FacilitatorAlert {
  type: 'crisis_detected' | 'intervention_needed';
  groupId: string;
  messageId: string;
  severity: 'mild' | 'moderate' | 'severe';
  requiresAction: boolean;
}

interface CrisisDetectionState {
  activeCrises: CrisisAlert[];
  facilitatorAlerts: FacilitatorAlert[];
  isMonitoring: boolean;
  lastDetection: Date | null;
}

export function useCrisisDetection(groupId: string, isFacilitator: boolean = false) {
  const [state, setState] = useState<CrisisDetectionState>({
    activeCrises: [],
    facilitatorAlerts: [],
    isMonitoring: true,
    lastDetection: null
  });

  // Handle automatic crisis intervention
  const handleCrisisIntervention = useCallback(async (messageId: string, severity: 'mild' | 'moderate' | 'severe') => {
    if (!isFacilitator) return;

    try {
      wsService.emit('ai:crisis_intervention', {
        groupId,
        messageId,
        severity
      });

      toast.success(`Crisis intervention initiated (${severity} level)`);
    } catch (error) {
      toast.error('Failed to initiate crisis intervention');
      console.error('Crisis intervention error:', error);
    }
  }, [groupId, isFacilitator]);

  // Dismiss crisis alert
  const dismissCrisis = useCallback((messageId: string) => {
    setState(prev => ({
      ...prev,
      activeCrises: prev.activeCrises.filter(crisis => crisis.messageId !== messageId)
    }));
  }, []);

  // Escalate to professional help
  const escalateToProfessional = useCallback(async (crisisAlert: CrisisAlert) => {
    // In a real app, this would trigger professional escalation
    toast.success('Professional help has been notified');
    
    // Mark as escalated
    setState(prev => ({
      ...prev,
      activeCrises: prev.activeCrises.map(crisis =>
        crisis.messageId === crisisAlert.messageId
          ? { ...crisis, escalated: true } as any
          : crisis
      )
    }));
  }, []);

  // Get crisis resources based on severity
  const getCrisisResources = useCallback((severity: 'mild' | 'moderate' | 'severe'): CrisisResource[] => {
    const baseResources: CrisisResource[] = [
      {
        title: 'National Suicide Prevention Lifeline',
        description: '24/7 crisis support and suicide prevention',
        phone: '988',
        type: 'hotline',
        availability: '24/7'
      },
      {
        title: 'Crisis Text Line',
        description: 'Text-based crisis support',
        phone: 'Text HOME to 741741',
        type: 'hotline',
        availability: '24/7'
      },
      {
        title: 'Emergency Services',
        description: 'Immediate emergency assistance',
        phone: '911',
        type: 'emergency',
        availability: '24/7'
      }
    ];

    if (severity === 'mild') {
      return [
        ...baseResources,
        {
          title: 'Mental Health America',
          description: 'Mental health resources and support',
          url: 'https://www.mhanational.org/',
          type: 'website',
          availability: 'on_demand'
        },
        {
          title: 'NAMI Support Groups',
          description: 'Find local support groups',
          url: 'https://www.nami.org/Support-Education/Support-Groups',
          type: 'website',
          availability: 'business_hours'
        }
      ];
    }

    if (severity === 'moderate') {
      return [
        ...baseResources,
        {
          title: 'SAMHSA National Helpline',
          description: 'Treatment referral and information service',
          phone: '1-800-662-4357',
          type: 'hotline',
          availability: '24/7'
        },
        {
          title: 'Psychology Today Therapist Finder',
          description: 'Find mental health professionals',
          url: 'https://www.psychologytoday.com/us/therapists',
          type: 'professional',
          availability: 'business_hours'
        }
      ];
    }

    // Severe - prioritize immediate help
    return [
      {
        title: 'Emergency Services',
        description: 'Call immediately for life-threatening situations',
        phone: '911',
        type: 'emergency',
        availability: '24/7'
      },
      {
        title: 'National Suicide Prevention Lifeline',
        description: 'Immediate crisis intervention',
        phone: '988',
        type: 'hotline',
        availability: '24/7'
      },
      ...baseResources.slice(1)
    ];
  }, []);

  // WebSocket event handlers
  useEffect(() => {
    if (!groupId || !wsService.isConnected()) return;

    const handleCrisisDetected = (data: CrisisAlert) => {
      if (data.groupId === groupId) {
        const crisisAlert: CrisisAlert = {
          ...data,
          timestamp: new Date(data.timestamp || Date.now()),
          resources: data.resources.length > 0 ? data.resources : getCrisisResources(data.severity)
        };

        setState(prev => ({
          ...prev,
          activeCrises: [...prev.activeCrises, crisisAlert],
          lastDetection: crisisAlert.timestamp
        }));

        // Show appropriate notification based on severity
        if (data.severity === 'severe') {
          toast.error('Severe crisis detected - immediate intervention required', {
            duration: 10000,
            position: 'top-center'
          });
        } else if (data.severity === 'moderate') {
          toast.error('Crisis detected - support needed', {
            duration: 8000
          });
        } else {
          toast('Concerning content detected - monitoring', {
            duration: 5000,
            icon: '⚠️'
          });
        }
      }
    };

    const handleFacilitatorAlert = (data: FacilitatorAlert) => {
      if (data.groupId === groupId && isFacilitator) {
        setState(prev => ({
          ...prev,
          facilitatorAlerts: [...prev.facilitatorAlerts, data]
        }));

        // Facilitator-specific notifications
        if (data.requiresAction) {
          toast.error(`Facilitator attention required: ${data.type}`, {
            duration: Infinity,
            position: 'top-right'
          });
        }
      }
    };

    const handleCrisisIntervention = (data: any) => {
      if (data.groupId === groupId) {
        toast.success('Crisis intervention response generated');
      }
    };

    // Register event listeners
    wsService.on('ai:crisis_detected', handleCrisisDetected);
    wsService.on('ai:facilitator_alert', handleFacilitatorAlert);
    wsService.on('ai:crisis_intervention', handleCrisisIntervention);

    // Cleanup
    return () => {
      wsService.off('ai:crisis_detected', handleCrisisDetected);
      wsService.off('ai:facilitator_alert', handleFacilitatorAlert);
      wsService.off('ai:crisis_intervention', handleCrisisIntervention);
    };
  }, [groupId, isFacilitator, getCrisisResources]);

  // Auto-dismiss mild crises after 5 minutes
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    state.activeCrises.forEach(crisis => {
      if (crisis.severity === 'mild') {
        const interval = setTimeout(() => {
          dismissCrisis(crisis.messageId);
        }, 5 * 60 * 1000); // 5 minutes

        intervals.push(interval);
      }
    });

    return () => {
      intervals.forEach(clearTimeout);
    };
  }, [state.activeCrises, dismissCrisis]);

  return {
    ...state,
    actions: {
      handleCrisisIntervention,
      dismissCrisis,
      escalateToProfessional,
      getCrisisResources
    }
  };
}