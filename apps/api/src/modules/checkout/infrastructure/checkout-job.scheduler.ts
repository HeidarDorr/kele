import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CheckoutJobService } from '../application/checkout-job.service.js';

@Injectable()
export class CheckoutJobScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly workerId = `api-${randomUUID()}`;

  constructor(private readonly jobs: CheckoutJobService) {}

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
    } finally {
      this.running = false;
    }
  }
}
