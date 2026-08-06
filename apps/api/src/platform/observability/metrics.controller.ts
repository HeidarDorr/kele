import { Controller, Get, Header, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { MetricsAuthGuard } from './metrics-auth.guard.js';
import { MetricsService } from './metrics.service.js';
import { OperationalSnapshotService } from './operational-snapshot.service.js';

@Controller('metrics')
@UseGuards(MetricsAuthGuard)
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly snapshot: OperationalSnapshotService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async read(): Promise<string> {
    try {
      await this.snapshot.collect();
    } catch {
      this.metrics.gauge('kele_database_ready', 0);
      throw new ServiceUnavailableException('Operational metrics dependency is unavailable.');
    }
    return this.metrics.render();
  }
}
