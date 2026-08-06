import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CheckoutJobService } from '../application/checkout-job.service.js';
import {
  OPERATIONAL_TELEMETRY,
  type OperationalTelemetry,
} from '../../../shared/operational-telemetry.js';
import { JsonLogger } from '../../../platform/observability/json.logger.js';

@Injectable()
export class CheckoutJobScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly workerId = `api-${randomUUID()}`;

  constructor(
    private readonly jobs: CheckoutJobService,
    @Inject(OPERATIONAL_TELEMETRY) private readonly telemetry: OperationalTelemetry,
    private readonly logger: JsonLogger,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.tick(), 15_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.jobs.processDueJobs(this.workerId);
    } catch {
      this.telemetry.record({ name: 'job_execution', outcome: 'claim_failed' });
      this.logger.warn(
        { event: 'job_poll_failed', outcome: 'claim_failed' },
        'CheckoutJobScheduler',
      );
    } finally {
      this.running = false;
    }
  }
}
