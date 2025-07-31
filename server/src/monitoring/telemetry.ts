/**
 * OpenTelemetry configuration for PeerBond production monitoring
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { trace, metrics, SpanStatusCode, SpanKind } from '@opentelemetry/api';

/**
 * Initialize OpenTelemetry monitoring
 */
export function initializeTelemetry(): void {
  // Temporarily disabled due to TypeScript compilation issues
  console.log('[Telemetry] Temporarily disabled - server starting without telemetry');
  return;
}

/**
 * Custom telemetry helpers for orchestration system
 */
export class OrchestrationTelemetry {
  private static tracer = trace.getTracer('peerbond-orchestration', '3.0.0');
  private static meter = metrics.getMeter('peerbond-orchestration', '3.0.0');

  // Metrics
  private static sessionCounter = this.meter.createCounter('orchestration_sessions_total', {
    description: 'Total number of orchestration sessions created',
  });

  private static messageCounter = this.meter.createCounter('orchestration_messages_total', {
    description: 'Total number of messages processed',
  });

  private static agentCounter = this.meter.createCounter('orchestration_agent_calls_total', {
    description: 'Total number of agent calls',
  });

  private static crisisCounter = this.meter.createCounter('orchestration_crisis_alerts_total', {
    description: 'Total number of crisis interventions',
  });

  private static responseTimeHistogram = this.meter.createHistogram('orchestration_response_time_seconds', {
    description: 'Response time for orchestration operations',
    unit: 's',
  });

  private static confidenceHistogram = this.meter.createHistogram('orchestration_confidence_score', {
    description: 'Confidence scores for orchestration responses',
  });

  private static activeSessionsGauge = this.meter.createUpDownCounter('orchestration_active_sessions', {
    description: 'Current number of active orchestration sessions',
  });

  /**
   * Record session creation
   */
  public static recordSessionCreated(memberId: string, groupId?: string): void {
    this.sessionCounter.add(1, {
      member_id: memberId,
      has_group: groupId ? 'true' : 'false',
    });
    this.activeSessionsGauge.add(1);
  }

  /**
   * Record session end
   */
  public static recordSessionEnded(sessionId: string, messageCount: number, duration: number): void {
    this.activeSessionsGauge.add(-1);

    // Record session metrics
    this.meter.createHistogram('orchestration_session_duration_seconds').record(duration / 1000, {
      session_id: sessionId,
    });

    this.meter.createHistogram('orchestration_session_message_count').record(messageCount, {
      session_id: sessionId,
    });
  }

  /**
   * Record message processing
   */
  public static recordMessageProcessed(
    agentsUsed: string[],
    confidence: number,
    responseTime: number,
    hasCrisis: boolean = false
  ): void {
    this.messageCounter.add(1, {
      agents_count: agentsUsed.length.toString(),
      has_crisis: hasCrisis.toString(),
    });

    this.responseTimeHistogram.record(responseTime / 1000, {
      agents_used: agentsUsed.join(','),
    });

    this.confidenceHistogram.record(confidence, {
      agents_used: agentsUsed.join(','),
    });

    // Record agent usage
    agentsUsed.forEach(agent => {
      this.agentCounter.add(1, {
        agent_name: agent,
      });
    });

    if (hasCrisis) {
      this.crisisCounter.add(1);
    }
  }

  /**
   * Create a traced span for orchestration operations
   */
  public static async traceOperation<T>(
    operationName: string,
    operation: (span: any) => Promise<T>,
    attributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    return this.tracer.startActiveSpan(
      operationName,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          'component': 'orchestration',
          'service.name': 'peerbond-orchestration',
          ...attributes,
        },
      },
      async (span) => {
        try {
          const result = await operation(span);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Trace session operations
   */
  public static async traceSessionOperation<T>(
    operationName: string,
    sessionId: string,
    memberId: string,
    operation: (span: any) => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      `session.${operationName}`,
      operation,
      {
        'session.id': sessionId,
        'member.id': memberId,
        'operation.type': operationName,
      }
    );
  }

  /**
   * Trace agent operations
   */
  public static async traceAgentOperation<T>(
    agentName: string,
    operation: (span: any) => Promise<T>,
    additionalAttributes: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    return this.traceOperation(
      `agent.${agentName}`,
      operation,
      {
        'agent.name': agentName,
        'agent.type': 'orchestration',
        ...additionalAttributes,
      }
    );
  }

  /**
   * Record error metrics
   */
  public static recordError(
    operation: string,
    errorType: string,
    errorMessage: string
  ): void {
    this.meter.createCounter('orchestration_errors_total', {
      description: 'Total number of orchestration errors',
    }).add(1, {
      operation,
      error_type: errorType,
      error_message: errorMessage.substring(0, 100), // Limit message length
    });
  }

  /**
   * Get current telemetry status
   */
  public static getTelemetryStatus(): {
    enabled: boolean;
    tracingEnabled: boolean;
    metricsEnabled: boolean;
    jaegerEndpoint?: string;
    prometheusPort?: string;
  } {
    return {
      enabled: process.env.NODE_ENV !== 'test',
      tracingEnabled: !!process.env.JAEGER_ENDPOINT || process.env.NODE_ENV === 'development',
      metricsEnabled: true,
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      prometheusPort: process.env.PROMETHEUS_PORT || '9464',
    };
  }
}

/**
 * Middleware for automatic request tracing
 */
export function createTelemetryMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Add telemetry context to request
    req.telemetry = {
      startTime,
      recordMetric: (name: string, value: number, attributes: Record<string, string> = {}) => {
        OrchestrationTelemetry['meter'].createHistogram(name).record(value, attributes);
      },
    };

    // Record request metrics on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      OrchestrationTelemetry['meter'].createHistogram('http_request_duration_ms').record(duration, {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: statusCode.toString(),
        status_class: `${Math.floor(statusCode / 100)}xx`,
      });
    });

    next();
  };
}