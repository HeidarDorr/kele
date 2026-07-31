import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { CorrelationIdMiddleware } from './platform/observability/correlation-id.middleware.js';
import { JsonLogger } from './platform/observability/json.logger.js';
import { environment } from './platform/config/environment.js';
import { ProblemDetailsFilter } from './modules/catalog/presentation/problem-details.filter.js';

async function bootstrap(): Promise<void> {
  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.setGlobalPrefix('api/v1');
  const correlationMiddleware = new CorrelationIdMiddleware();
  app.use(correlationMiddleware.use.bind(correlationMiddleware));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002'],
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(environment.PORT, '0.0.0.0');
  logger.log(`API listening on port ${String(environment.PORT)}`, 'Bootstrap');
}

void bootstrap();
