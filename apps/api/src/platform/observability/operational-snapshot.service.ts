import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class OperationalSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly timeoutMs = 1_000,
  ) {}

  async collect(): Promise<void> {
    const now = new Date();
    await withTimeout(this.collectDatabase(now), this.timeoutMs);
  }

  private async collectDatabase(now: Date): Promise<void> {
    const [jobs, reconciliations, refunds, expiredReservations] = await Promise.all([
      this.prisma.databaseJob.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.paymentReconciliation.findMany({
        where: { status: 'OPEN' },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.refund.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.inventoryReservation.findMany({
        where: { status: 'ACTIVE', expiresAt: { lt: now } },
        select: { expiresAt: true },
        orderBy: { expiresAt: 'asc' },
      }),
    ]);

    for (const status of ['pending', 'leased', 'completed', 'failed']) {
      this.metrics.gauge('kele_database_jobs', 0, { status });
    }
    for (const row of jobs) {
      this.metrics.gauge('kele_database_jobs', row._count._all, {
        status: row.status.toLowerCase(),
      });
    }
    this.metrics.gauge('kele_payment_reconciliation_open', reconciliations.length);
    this.metrics.gauge(
      'kele_payment_reconciliation_oldest_age_seconds',
      reconciliations[0] === undefined
        ? 0
        : Math.max(0, (now.getTime() - reconciliations[0].createdAt.getTime()) / 1_000),
    );
    for (const status of ['pending_provider', 'confirmed', 'failed']) {
      this.metrics.gauge('kele_refunds', 0, { status });
    }
    for (const row of refunds) {
      this.metrics.gauge('kele_refunds', row._count._all, {
        status: row.status.toLowerCase(),
      });
    }
    this.metrics.gauge('kele_expired_active_reservations', expiredReservations.length);
    this.metrics.gauge(
      'kele_reservation_expiry_lag_seconds',
      expiredReservations[0] === undefined
        ? 0
        : Math.max(0, (now.getTime() - expiredReservations[0].expiresAt.getTime()) / 1_000),
    );
    this.metrics.gauge('kele_database_ready', 1);
  }
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Operational snapshot timed out.'));
        }, timeoutMs);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
