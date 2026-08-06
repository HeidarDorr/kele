import { Injectable } from '@nestjs/common';
import type { OperationalEvent, OperationalTelemetry } from '../../shared/operational-telemetry.js';
import { correlationId } from './correlation-context.js';
import { JsonLogger } from './json.logger.js';
import { MetricsService } from './metrics.service.js';

const safeOutcome = /^[a-z][a-z0-9_]{0,63}$/;
const safeProvider = /^[a-z][a-z0-9_-]{0,39}$/;

@Injectable()
export class OperationalTelemetryService implements OperationalTelemetry {
  constructor(
    private readonly metrics: MetricsService,
    private readonly logger: JsonLogger,
  ) {}

  record(event: OperationalEvent): void {
    const outcome = safeOutcome.test(event.outcome) ? event.outcome : 'invalid_outcome';
    const provider =
      event.provider !== undefined && safeProvider.test(event.provider) ? event.provider : 'none';
    this.metrics.increment('kele_operational_events_total', {
      event: event.name,
      outcome,
      provider,
    });
    this.logger.log(
      {
        event: event.name,
        outcome,
        provider,
        ...(correlationId() === undefined ? {} : { correlationId: correlationId() }),
      },
      'OperationalEvent',
    );
  }
}
