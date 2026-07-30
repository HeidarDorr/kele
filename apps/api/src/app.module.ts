import { Module } from '@nestjs/common';
import { FoundationModule } from './modules/foundation/foundation.module.js';
import { HealthModule } from './platform/health/health.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule, FoundationModule],
})
export class AppModule {}
