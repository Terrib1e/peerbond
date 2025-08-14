/**
 * Group Orchestration Hook - Manages AI orchestration state for group chats
 */

import { useState, useEffect, useCallback } from 'react';
import { wsService } from '@/lib/websocket';
import { api } from '@/lib/api';
import { AIAgentStatus, GroupContext } from '@/components/ai/AIAgentIndicator';

export interface GroupOrchestrationState {
  sessionId: string | null;
  agentStatus: AIAgentStatus;
  groupContext: GroupContext;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastInsights: GroupInsight[];
  crisisDetected: boolean;
}

export interface GroupInsight {
  type: 'participation' | 'mood' | 'progress' | 'risk' | 'connection';
  summary: string;
  confidence: number;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

interface CrisisAlert {
  groupId: string;
  messageId: string;
  severity: 'mild' | 'moderate' | 'severe';
  resources: any[];
}

interface AITypingState {
  groupId: string;
  agentId: string;
  isTyping: boolean;
}

export function useGroupOrchestration(groupId: string, memberId: string) {
  console.log('🤖 [ORCHESTRATION-HOOK] useGroupOrchestration called with:', { groupId, memberId });

  const [state, setState] = useState<GroupOrchestrationState>({
    sessionId: null,
    agentStatus: {
      facilitator: false,
      sentiment: false,
      crisis: false,
      insight: false,
      matching: false
    },
    groupContext: {},
    isConnected: false,
    isLoading: false,
    error: null,
    lastInsights: [],
    crisisDetected: false
  });

  console.log('🤖 [ORCHESTRATION-HOOK] Initial state:', state);

  const [aiTyping, setAITyping] = useState<AITypingState | null>(null);

  // Initialize AI session for the group
  const startAISession = useCallback(async (memberProfile?: any) => {
    if (!groupId || !memberId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🤖 [ORCHESTRATION-HOOK] Starting AI session:', { groupId, memberId });

      // Start orchestration session via API
      const sessionResult = await api.startOrchestrationSession('production', {
        groupId,
        memberProfile
      });

      console.log('🤖 [ORCHESTRATION-HOOK] Session started:', sessionResult);

      setState(prev => ({
        ...prev,
        sessionId: sessionResult.sessionId,
        isConnected: true,
        isLoading: false,
        error: null,
        agentStatus: {
          facilitator: true,
          sentiment: true,
          crisis: true,
          insight: true,
          matching: true
        }
      }));

      console.log('🤖 [ORCHESTRATION-HOOK] Agent status updated:', {
        facilitator: true,
        sentiment: true,
        crisis: true,
        insight: true,
        matching: true
      });

      // Also emit via WebSocket for real-time coordination
      wsService.emit('ai:start_session', {
        groupId,
        memberProfile
      });
    } catch (error) {
      console.error('🤖 [ORCHESTRATION-HOOK] Error starting session:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start AI session'
      }));
    }
  }, [groupId, memberId]);

  // Call specific AI agent
  const callAgent = useCallback(async (agentId: string, message: string) => {
    if (!state.sessionId) {
      throw new Error('No active AI session');
    }

    wsService.emit('ai:agent_call', {
      groupId,
      agentId,
      message,
      sessionId: state.sessionId
    });
  }, [groupId, state.sessionId]);

  // Request group insights
  const requestInsights = useCallback(() => {
    if (!groupId) return;

    wsService.emit('ai:request_insights', { groupId });
  }, [groupId]);

  // Trigger crisis intervention
  const triggerCrisisIntervention = useCallback((messageId: string, severity: 'mild' | 'moderate' | 'severe') => {
    if (!groupId) return;

    wsService.emit('ai:crisis_intervention', {
      groupId,
      messageId,
      severity
    });
  }, [groupId]);

  // WebSocket event handlers
  useEffect(() => {
    if (!groupId) return;

    // Initialize WebSocket connection if not already connected
    const initializeWebSocket = async () => {
      try {
        if (!wsService.isConnected()) {
          console.log('🤖 [ORCHESTRATION-HOOK] Connecting to WebSocket...');
          await wsService.connect();
        }
      } catch (error) {
        console.error('🤖 [ORCHESTRATION-HOOK] WebSocket connection failed:', error);
        // Continue without WebSocket - use HTTP-only mode
        return;
      }
    };

    initializeWebSocket();

    // Don't set up listeners if WebSocket isn't ready
    if (!wsService.isConnected()) {
      console.log('🤖 [ORCHESTRATION-HOOK] WebSocket not ready, skipping event setup');
      return;
    }

    // AI session started
    const handleSessionStarted = (data: any) => {
      if (data.groupId === groupId) {
        setState(prev => ({
          ...prev,
          sessionId: data.sessionId,
          agentStatus: data.agentStatus || prev.agentStatus,
          isConnected: true,
          isLoading: false,
          error: null
        }));
      }
    };

    // Agent status updates
    const handleAgentStatusUpdate = (data: any) => {
      if (data.groupId === groupId) {
        setState(prev => ({
          ...prev,
          agentStatus: data.agentStatus || prev.agentStatus,
          groupContext: {
            ...prev.groupContext,
            ...data.groupContext
          }
        }));
      }
    };

    // AI insights received
    const handleInsightsUpdate = (data: any) => {
      if (data.groupId === groupId) {
        setState(prev => ({
          ...prev,
          lastInsights: data.insights || []
        }));
      }
    };

    // Crisis detection
    const handleCrisisDetected = (data: CrisisAlert) => {
      if (data.groupId === groupId) {
        setState(prev => ({
          ...prev,
          crisisDetected: true,
          agentStatus: {
            ...prev.agentStatus,
            crisis: true
          }
        }));

        // Auto-clear crisis state after 30 seconds
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            crisisDetected: false
          }));
        }, 30000);
      }
    };

    // AI typing indicators
    const handleAITyping = (data: AITypingState) => {
      if (data.groupId === groupId) {
        setAITyping(data.isTyping ? data : null);
      }
    };

    // AI errors
    const handleAIError = (data: any) => {
      setState(prev => ({
        ...prev,
        error: data.message,
        isLoading: false
      }));
    };

    // Register event listeners
    wsService.on('ai:session_started', handleSessionStarted);
    wsService.on('ai:agent_status_update', handleAgentStatusUpdate);
    wsService.on('ai:insights_update', handleInsightsUpdate);
    wsService.on('ai:crisis_detected', handleCrisisDetected);
    wsService.on('ai:typing', handleAITyping);
    wsService.on('ai:error', handleAIError);

    // Cleanup
    return () => {
      wsService.off('ai:session_started', handleSessionStarted);
      wsService.off('ai:agent_status_update', handleAgentStatusUpdate);
      wsService.off('ai:insights_update', handleInsightsUpdate);
      wsService.off('ai:crisis_detected', handleCrisisDetected);
      wsService.off('ai:typing', handleAITyping);
      wsService.off('ai:error', handleAIError);
    };
  }, [groupId]);

  // Monitor WebSocket connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      const isConnected = wsService.isConnected();
      console.log('🤖 [ORCHESTRATION-HOOK] WebSocket connection status:', isConnected);
      setState(prev => ({
        ...prev,
        isConnected
      }));
    };

    // Try to set up connection monitoring only if WebSocket is available
    try {
      wsService.on('connect', updateConnectionStatus);
      wsService.on('disconnect', updateConnectionStatus);

      // Initial status
      updateConnectionStatus();
    } catch (error) {
      console.warn('🤖 [ORCHESTRATION-HOOK] Could not set up WebSocket monitoring:', error);
      // Set disconnected state if WebSocket setup fails
      setState(prev => ({ ...prev, isConnected: false }));
    }

    return () => {
      try {
        wsService.off('connect', updateConnectionStatus);
        wsService.off('disconnect', updateConnectionStatus);
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Auto-start AI session when component mounts (don't wait for WebSocket)
  useEffect(() => {
    if (!state.sessionId && !state.isLoading && groupId && memberId) {
      console.log('🤖 [ORCHESTRATION-HOOK] Auto-starting AI session...');
      startAISession();
    }
  }, [groupId, memberId, state.sessionId, state.isLoading, startAISession]);

  const returnValue = {
    ...state,
    aiTyping: aiTyping?.isTyping || false,
    actions: {
      startSession: startAISession,
      callAgent,
      requestInsights,
      triggerCrisisIntervention
    },
    // Helper function to wait for session to be ready
    waitForSession: async () => {
      let retries = 0;
      while (!state.sessionId && retries < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      return state.sessionId;
    }
  };

  console.log('🤖 [ORCHESTRATION-HOOK] Returning state:', {
    sessionId: returnValue.sessionId,
    agentStatus: returnValue.agentStatus,
    isConnected: returnValue.isConnected,
    isLoading: returnValue.isLoading,
    error: returnValue.error
  });

  return returnValue;
}