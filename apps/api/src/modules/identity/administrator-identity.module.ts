import { Global, Module } from '@nestjs/common';
import { environment } from '../../platform/config/environment.js';
import { runtimeClock } from '../../shared/deterministic-runtime.js';
import { UNIT_OF_WORK, type UnitOfWork } from '../../shared/unit-of-work.js';
import type { SmsGateway } from '../foundation/application/sms-gateway.port.js';
import { SMS_GATEWAY } from '../foundation/application/provider.tokens.js';
import { FoundationModule } from '../foundation/foundation.module.js';
import {
  ADMINISTRATOR_IDENTITY_REPOSITORY,
  type AdministratorIdentityRepository,
} from './application/administrator-identity.repository.js';
import { AdministratorIdentityService } from './application/administrator-identity.service.js';
import { AdministratorCookieSecurity } from './infrastructure/administrator-cookie-security.js';
import { PrismaAdministratorIdentityRepository } from './infrastructure/prisma-administrator-identity.repository.js';
import { AdministratorIdentityController } from './presentation/administrator-identity.controller.js';
import { PrismaTransactionContext } from '../../infrastructure/prisma/prisma-transaction.context.js';
import { AdminSessionGuard } from '../catalog/presentation/admin-session.guard.js';

@Global()
@Module({
  imports: [FoundationModule],
  controllers: [AdministratorIdentityController],
  providers: [
    AdminSessionGuard,
    {
      provide: ADMINISTRATOR_IDENTITY_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): AdministratorIdentityRepository =>
        new PrismaAdministratorIdentityRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: AdministratorIdentityService,
      useFactory: (
        repository: AdministratorIdentityRepository,
        sms: SmsGateway,
        unitOfWork: UnitOfWork,
      ): AdministratorIdentityService =>
        new AdministratorIdentityService(
          repository,
          sms,
          unitOfWork,
          environment.ADMIN_SESSION_SIGNING_SECRET ?? environment.IDENTITY_SIGNING_SECRET,
          environment.ADMIN_OTP_VERIFIER_PEPPER ?? environment.OTP_VERIFIER_PEPPER,
          environment.SMS_PROVIDER === 'fake' ? () => environment.FAKE_SMS_OTP_CODE : undefined,
          runtimeClock(environment.E2E_FIXED_TIME),
        ),
      inject: [ADMINISTRATOR_IDENTITY_REPOSITORY, SMS_GATEWAY, UNIT_OF_WORK],
    },
    {
      provide: AdministratorCookieSecurity,
      useFactory: (): AdministratorCookieSecurity =>
        new AdministratorCookieSecurity(environment.NODE_ENV === 'production'),
    },
  ],
  exports: [AdministratorIdentityService, AdministratorCookieSecurity],
})
export class AdministratorIdentityModule {}
