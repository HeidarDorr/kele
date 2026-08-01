import { Module } from '@nestjs/common';
import { HealthModule } from './platform/health/health.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { CustomerCommerceModule } from './modules/customer-commerce.module.js';

@Module({
  imports: [PrismaModule, HealthModule, CustomerCommerceModule],
})
export class AppModule {}
