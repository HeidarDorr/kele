import { randomUUID } from 'node:crypto';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CheckoutRepository } from './checkout.repository.js';
import { CheckoutService } from './checkout.service.js';
import type { DatabaseJobRecord } from '../domain/checkout.types.js';
import {
  noOperationalTelemetry,
  type OperationalTelemetry,
} from '../../../shared/operational-telemetry.js';

const LEASE_MS = 60_000;

function payloadId(job: DatabaseJobRecord, key: string): string {
  const value = job.payload[key];
  if (typeof value !== 'string') throw new Error(`Job payload ${key} must be a string.`);
  return value;
}

export class CheckoutJobService {
  constructor(
    private readonly repository: CheckoutRepository,
    private readonly checkouts: CheckoutService,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: () => Date = () => new Date(),
    private readonly telemetry: OperationalTelemetry = noOperationalTelemetry,
  ) {}

  async processDueJobs(workerId: string, limit = 10): Promise<number> {
    const claimed = await this.unitOfWork.run(() => {
      const now = this.clock();
      return this.repository.claimJobs(workerId, now, new Date(now.getTime() + LEASE_MS), limit);
    });
    for (const job of claimed) await this.processJob(workerId, job);
    return claimed.length;
  }

  private async processJob(workerId: string, job: DatabaseJobRecord): Promise<void> {
    try {
      if (job.type === 'expire_checkout') {
        await this.checkouts.expireCheckout(payloadId(job, 'checkoutSessionId'), randomUUID());
      } else {
        await this.recoverPayment(job);
      }
      await this.unitOfWork.run(() => this.repository.completeJob(job.id, workerId, this.clock()));
      this.telemetry.record({ name: 'job_execution', outcome: 'completed' });
    } catch (error: unknown) {
      const now = this.clock();
      const backoff = Math.min(15 * 60_000, 60_000 * 2 ** Math.max(0, job.attemptCount - 1));
      await this.unitOfWork.run(() =>
        this.repository.retryJob({
          job,
          workerId,
          now,
          nextRunAt: new Date(now.getTime() + backoff),
          errorCode: error instanceof ApplicationError ? error.code : 'JOB_HANDLER_FAILED',
          safeError:
            error instanceof ApplicationError
              ? error.message.slice(0, 1000)
              : 'Job handler failed without exposing sensitive details.',
        }),
      );
      this.telemetry.record({
        name: 'job_execution',
        outcome: job.attemptCount >= job.maxAttempts ? 'failed' : 'retry_scheduled',
      });
    }
  }

  private async recoverPayment(job: DatabaseJobRecord): Promise<void> {
    const attempt = await this.repository.getPaymentAttemptForRecovery(
      payloadId(job, 'paymentAttemptId'),
    );
    if (attempt === null || ['verified', 'failed', 'cancelled'].includes(attempt.status)) return;
    const checkout = await this.repository.lockCheckout(attempt.checkoutSessionId);
    if (checkout === null) return;
    const now = this.clock();
    if (checkout.expiresAt <= now) {
      await this.checkouts.expireCheckout(checkout.id, randomUUID());
      if (attempt.status !== 'reconciliation') return;
    }
    throw new ApplicationError(
      'dependency',
      'PAYMENT_RECONCILIATION_PENDING',
      'Payment requires provider reconciliation or a verified callback retry.',
    );
  }
}
