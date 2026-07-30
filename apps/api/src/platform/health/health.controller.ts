import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { correlationId } from '../observability/correlation-context.js';
import { HealthService } from './health.service.js';

type HealthResponse = {
  status: 'ok' | 'unavailable';
  correlationId: string;
};

type HealthReadiness = {
  isReady(): Promise<boolean>;
};

@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthReadiness) {}

  @Get('live')
  live(): HealthResponse {
    return { status: 'ok', correlationId: correlationId() ?? randomUUID() };
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    const isReady = await this.healthService.isReady();
    if (!isReady) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        correlationId: correlationId() ?? randomUUID(),
      });
    }

    return { status: 'ok', correlationId: correlationId() ?? randomUUID() };
  }
}
