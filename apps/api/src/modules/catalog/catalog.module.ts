import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CATALOG_REPOSITORY, type CatalogRepository } from './application/catalog.repository.js';
import { CatalogService } from './application/catalog.service.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository.js';
import { AdminSessionGuard } from './presentation/admin-session.guard.js';
import {
  AdminCatalogController,
  PublicCatalogController,
  PublicDiscoveryController,
} from './presentation/catalog.controller.js';
import {
  CART_CATALOG_READER,
  type CartCatalogReader,
} from './application/cart-catalog.contract.js';
import { PrismaTransactionContext } from '../../infrastructure/prisma/prisma-transaction.context.js';
import { PrismaCartCatalogReader } from './infrastructure/prisma-cart-catalog.reader.js';
import {
  CHECKOUT_CATALOG_PORT,
  type CheckoutCatalogPort,
} from './application/checkout-catalog.contract.js';
import { PrismaCheckoutCatalogAdapter } from './infrastructure/prisma-checkout-catalog.adapter.js';
import {
  OUTFIT_CATALOG_PORT,
  type OutfitCatalogPort,
} from './application/outfit-catalog.contract.js';
import { PrismaOutfitCatalogAdapter } from './infrastructure/prisma-outfit-catalog.adapter.js';
import { FoundationModule } from '../foundation/foundation.module.js';
import { OBJECT_STORAGE } from '../foundation/application/provider.tokens.js';
import type { ObjectStorage } from '../foundation/application/object-storage.port.js';
import { environment } from '../../platform/config/environment.js';

@Module({
  imports: [FoundationModule],
  controllers: [PublicCatalogController, PublicDiscoveryController, AdminCatalogController],
  providers: [
    AdminSessionGuard,
    {
      provide: CATALOG_REPOSITORY,
      useFactory: (prisma: PrismaService): CatalogRepository => new PrismaCatalogRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CatalogService,
      useFactory: (repository: CatalogRepository, storage: ObjectStorage): CatalogService =>
        new CatalogService(
          repository,
          storage,
          environment.NODE_ENV !== 'production' || environment.KELE_DEPLOYMENT_TIER === 'uat',
        ),
      inject: [CATALOG_REPOSITORY, OBJECT_STORAGE],
    },
    {
      provide: CART_CATALOG_READER,
      useFactory: (transactions: PrismaTransactionContext): CartCatalogReader =>
        new PrismaCartCatalogReader(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: CHECKOUT_CATALOG_PORT,
      useFactory: (transactions: PrismaTransactionContext): CheckoutCatalogPort =>
        new PrismaCheckoutCatalogAdapter(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: OUTFIT_CATALOG_PORT,
      useFactory: (transactions: PrismaTransactionContext): OutfitCatalogPort =>
        new PrismaOutfitCatalogAdapter(transactions),
      inject: [PrismaTransactionContext],
    },
  ],
  exports: [CART_CATALOG_READER, CHECKOUT_CATALOG_PORT, OUTFIT_CATALOG_PORT],
})
export class CatalogModule {}
