import { Module } from '@nestjs/common';
import { HealthModule } from './platform/health/health.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { CustomerCommerceModule } from './modules/customer-commerce.module.js';
import { EditorialModule } from './modules/editorial/editorial.module.js';

@Module({
  imports: [PrismaModule, HealthModule, CustomerCommerceModule, EditorialModule],
})
export class AppModule {}
