import { Global, Module } from '@nestjs/common';
import { OPERATIONAL_TELEMETRY } from '../../shared/operational-telemetry.js';
import { JsonLogger } from './json.logger.js';
import { METRICS_AUTH_TOKEN, MetricsAuthGuard } from './metrics-auth.guard.js';
import { MetricsController } from './metrics.controller.js';
import { MetricsService } from './metrics.service.js';
import { OperationalSnapshotService } from './operational-snapshot.service.js';
import { OperationalTelemetryService } from './operational-telemetry.service.js';
import { environment } from '../config/environment.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    JsonLogger,
    MetricsService,
    { provide: METRICS_AUTH_TOKEN, useValue: environment.METRICS_BEARER_TOKEN },
    MetricsAuthGuard,
    {
      provide: OperationalSnapshotService,
      useFactory: (prisma: PrismaService, metrics: MetricsService) =>
        new OperationalSnapshotService(prisma, metrics, environment.READINESS_TIMEOUT_MS),
      inject: [PrismaService, MetricsService],
    },
    OperationalTelemetryService,
    { provide: OPERATIONAL_TELEMETRY, useExisting: OperationalTelemetryService },
  ],
  exports: [JsonLogger, MetricsService, OPERATIONAL_TELEMETRY],
})
export class ObservabilityModule {}
