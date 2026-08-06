import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { CorrelationIdMiddleware } from './platform/observability/correlation-id.middleware.js';
import { JsonLogger } from './platform/observability/json.logger.js';
import { environment } from './platform/config/environment.js';
import { ProblemDetailsFilter } from './modules/catalog/presentation/problem-details.filter.js';
import { SecurityHeadersMiddleware } from './platform/security/security-headers.middleware.js';
import { MetricsService } from './platform/observability/metrics.service.js';
import { HttpMetricsMiddleware } from './platform/observability/http-metrics.middleware.js';
import {
  OPERATIONAL_TELEMETRY,
  type OperationalTelemetry,
} from './shared/operational-telemetry.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  const logger = app.get(JsonLogger);
  const metrics = app.get(MetricsService);
  const telemetry = app.get<OperationalTelemetry>(OPERATIONAL_TELEMETRY);
  app.useLogger(logger);

  app.setGlobalPrefix('api/v1');
  app.getHttpAdapter().getInstance().set('trust proxy', environment.TRUST_PROXY_HOPS);
  const correlationMiddleware = new CorrelationIdMiddleware();
  const securityHeaders = new SecurityHeadersMiddleware(environment.NODE_ENV === 'production');
  const httpMetrics = new HttpMetricsMiddleware(metrics);
  app.use(correlationMiddleware.use.bind(correlationMiddleware));
  app.use(securityHeaders.use.bind(securityHeaders));
  app.use(httpMetrics.use.bind(httpMetrics));
  app.use(json({ limit: environment.API_JSON_BODY_LIMIT_BYTES, strict: true }));
  app.use(urlencoded({ extended: false, limit: environment.API_JSON_BODY_LIMIT_BYTES }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter(logger, telemetry));
  app.enableCors({
    origin: [environment.STOREFRONT_ORIGIN, environment.ADMIN_ORIGIN],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'If-Match',
      'X-Correlation-Id',
      'X-CSRF-Token',
      'X-Payment-Signature',
    ],
    exposedHeaders: ['Retry-After', 'X-Correlation-Id'],
    maxAge: 600,
  });
  app.enableShutdownHooks();

  const server = await app.listen(environment.PORT, '0.0.0.0');
  server.requestTimeout = environment.REQUEST_TIMEOUT_MS;
  server.headersTimeout = environment.HEADERS_TIMEOUT_MS;
  server.keepAliveTimeout = environment.KEEP_ALIVE_TIMEOUT_MS;
  logger.log(`API listening on port ${String(environment.PORT)}`, 'Bootstrap');
}

void bootstrap().catch((error: unknown) => {
  const logger = new JsonLogger();
  logger.fatal(error instanceof Error ? error.message : 'API bootstrap failed.', 'Bootstrap');
  process.exitCode = 1;
});
