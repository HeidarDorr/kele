import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { CorrelationIdMiddleware } from './platform/observability/correlation-id.middleware.js';
import { JsonLogger } from './platform/observability/json.logger.js';
import { environment } from './platform/config/environment.js';

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
  app.enableShutdownHooks();

  await app.listen(environment.PORT, '0.0.0.0');
  logger.log(`API listening on port ${String(environment.PORT)}`, 'Bootstrap');
}

void bootstrap();
