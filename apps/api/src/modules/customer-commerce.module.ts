import { Module } from '@nestjs/common';
import type { SmsGateway } from './foundation/application/sms-gateway.port.js';
import { SMS_GATEWAY } from './foundation/application/provider.tokens.js';
import { FoundationModule } from './foundation/foundation.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import {
  CART_CATALOG_READER,
  type CartCatalogReader,
} from './catalog/application/cart-catalog.contract.js';
import { PrismaTransactionContext } from '../infrastructure/prisma/prisma-transaction.context.js';
import { UNIT_OF_WORK, type UnitOfWork } from '../shared/unit-of-work.js';
import { environment } from '../platform/config/environment.js';
import { CART_REPOSITORY, type CartRepository } from './cart/application/cart.repository.js';
import { PrismaCartRepository } from './cart/infrastructure/prisma-cart.repository.js';
import { CartService } from './cart/application/cart.service.js';
import {
  MilestoneThreeOutfitCartReader,
  OUTFIT_CART_READER,
  type OutfitCartReader,
} from './cart/application/outfit-cart.contract.js';
import { CartAccessResolver } from './cart/presentation/cart-access.js';
import { CartController } from './cart/presentation/cart.controller.js';
import {
  IDENTITY_REPOSITORY,
  type IdentityRepository,
} from './identity/application/identity.repository.js';
import { PrismaIdentityRepository } from './identity/infrastructure/prisma-identity.repository.js';
import { IdentityService } from './identity/application/identity.service.js';
import { CustomerService } from './identity/application/customer.service.js';
import { CookieSecurity } from './identity/infrastructure/cookie-security.js';
import {
  CustomerCsrfGuard,
  CustomerSessionGuard,
} from './identity/presentation/customer-session.guard.js';
import {
  CustomerController,
  IdentityController,
} from './identity/presentation/identity.controller.js';

@Module({
  imports: [FoundationModule, CatalogModule],
  controllers: [IdentityController, CustomerController, CartController],
  providers: [
    CustomerSessionGuard,
    CustomerCsrfGuard,
    CartAccessResolver,
    MilestoneThreeOutfitCartReader,
    { provide: OUTFIT_CART_READER, useExisting: MilestoneThreeOutfitCartReader },
    {
      provide: CART_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): CartRepository =>
        new PrismaCartRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CartService,
      useFactory: (
        repository: CartRepository,
        catalog: CartCatalogReader,
        outfits: OutfitCartReader,
        unitOfWork: UnitOfWork,
      ): CartService => new CartService(repository, catalog, outfits, unitOfWork),
      inject: [CART_REPOSITORY, CART_CATALOG_READER, OUTFIT_CART_READER, UNIT_OF_WORK],
    },
    {
      provide: IDENTITY_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): IdentityRepository =>
        new PrismaIdentityRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: IdentityService,
      useFactory: (
        repository: IdentityRepository,
        carts: CartService,
        sms: SmsGateway,
        unitOfWork: UnitOfWork,
      ): IdentityService =>
        new IdentityService(
          repository,
          carts,
          sms,
          unitOfWork,
          environment.IDENTITY_SIGNING_SECRET,
          environment.OTP_VERIFIER_PEPPER,
          () => environment.FAKE_SMS_OTP_CODE,
        ),
      inject: [IDENTITY_REPOSITORY, CartService, SMS_GATEWAY, UNIT_OF_WORK],
    },
    {
      provide: CustomerService,
      useFactory: (repository: IdentityRepository, unitOfWork: UnitOfWork): CustomerService =>
        new CustomerService(repository, unitOfWork),
      inject: [IDENTITY_REPOSITORY, UNIT_OF_WORK],
    },
    {
      provide: CookieSecurity,
      useFactory: (): CookieSecurity =>
        new CookieSecurity(
          environment.IDENTITY_SIGNING_SECRET,
          environment.NODE_ENV === 'production',
        ),
    },
  ],
})
export class CustomerCommerceModule {}
