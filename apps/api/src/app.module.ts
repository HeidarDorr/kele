import { Module } from '@nestjs/common';
import { HealthModule } from './platform/health/health.module.js';
import { PrismaModule } from './infrastructure/prisma/prisma.module.js';
import { CustomerCommerceModule } from './modules/customer-commerce.module.js';
import { EditorialModule } from './modules/editorial/editorial.module.js';
import { ObservabilityModule } from './platform/observability/observability.module.js';
import { SecurityModule } from './platform/security/security.module.js';
import { AdministratorIdentityModule } from './modules/identity/administrator-identity.module.js';

@Module({
  imports: [
    PrismaModule,
    AdministratorIdentityModule,
    ObservabilityModule,
    SecurityModule,
    HealthModule,
    CustomerCommerceModule,
    EditorialModule,
  ],
})
export class AppModule {}
