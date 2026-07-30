import { Test } from '@nestjs/testing';
import type { components, operations } from '@kele/api-contract';
import { afterEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { HealthModule } from '../src/platform/health/health.module.js';
import { HealthService } from '../src/platform/health/health.service.js';
import { CorrelationIdMiddleware } from '../src/platform/observability/correlation-id.middleware.js';

type ReadyOperation = operations['getReadiness'];
type ReadyOk = ReadyOperation['responses'][200]['content']['application/json'];
type ReadyUnavailable = ReadyOperation['responses'][503]['content']['application/json'];
type CorrelationId = components['headers']['CorrelationId'];

const applications: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function startHealthApplication(healthService: HealthService) {
  const module = await Test.createTestingModule({ imports: [HealthModule] })
    .overrideProvider(HealthService)
    .useValue(healthService)
    .compile();
  const application = module.createNestApplication();
  const correlationMiddleware = new CorrelationIdMiddleware();
  application.use(correlationMiddleware.use.bind(correlationMiddleware));
  applications.push(application);
  await application.listen(0, '127.0.0.1');

  const address = application.getHttpServer().address();
  if (address === null || typeof address === 'string')
    throw new Error('Expected a TCP health test server.');
  return `http://127.0.0.1:${String(address.port)}`;
}

describe('health transport contract', () => {
  it('maps HTTP 200 readiness and X-Correlation-Id to generated contract types', async () => {
    const prismaSuccess = { $queryRaw: () => Promise.resolve([]) } as unknown as PrismaService;
    const baseUrl = await startHealthApplication(new HealthService(prismaSuccess));
    const correlationId: CorrelationId = '00000000-0000-4000-8000-000000000001';
    const response = await fetch(`${baseUrl}/health/ready`, {
      headers: { 'x-correlation-id': correlationId },
    });
    const body = (await response.json()) as ReadyOk;

    expect(response.status).toBe(200);
    expect(response.headers.get('x-correlation-id')).toBe(correlationId);
    expect(body).toEqual({ status: 'ok', correlationId });
  });

  it('maps a real Prisma query failure to HTTP 503, HealthUnavailable, and X-Correlation-Id', async () => {
    const prismaFailure = new PrismaService() as unknown as { $queryRaw: () => Promise<never> };
    prismaFailure.$queryRaw = () => Promise.reject(new Error('database connection refused'));
    const healthService = new HealthService(prismaFailure as unknown as PrismaService);

    await expect(healthService.isReady()).resolves.toBe(false);

    const baseUrl = await startHealthApplication(healthService);

    const correlationId: CorrelationId = '00000000-0000-4000-8000-000000000002';
    const response = await fetch(`${baseUrl}/health/ready`, {
      headers: { 'x-correlation-id': correlationId },
    });
    const body = (await response.json()) as ReadyUnavailable;

    expect(response.status).toBe(503);
    expect(body).toEqual({ status: 'unavailable', correlationId });
    expect(response.headers.get('x-correlation-id')).toBe(correlationId);
  });
});
