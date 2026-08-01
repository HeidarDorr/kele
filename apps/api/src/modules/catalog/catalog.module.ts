import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { CATALOG_REPOSITORY, type CatalogRepository } from './application/catalog.repository.js';
import { CatalogService } from './application/catalog.service.js';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository.js';
import { AdminSessionGuard } from './presentation/admin-session.guard.js';
import {
  AdminCatalogController,
  PublicCatalogController,
} from './presentation/catalog.controller.js';
import {
  CART_CATALOG_READER,
  type CartCatalogReader,
} from './application/cart-catalog.contract.js';
import { PrismaTransactionContext } from '../../infrastructure/prisma/prisma-transaction.context.js';
import { PrismaCartCatalogReader } from './infrastructure/prisma-cart-catalog.reader.js';

@Module({
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [
    AdminSessionGuard,
    {
      provide: CATALOG_REPOSITORY,
      useFactory: (prisma: PrismaService): CatalogRepository => new PrismaCatalogRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CatalogService,
      useFactory: (repository: CatalogRepository): CatalogService => new CatalogService(repository),
      inject: [CATALOG_REPOSITORY],
    },
    {
      provide: CART_CATALOG_READER,
      useFactory: (transactions: PrismaTransactionContext): CartCatalogReader =>
        new PrismaCartCatalogReader(transactions),
      inject: [PrismaTransactionContext],
    },
  ],
  exports: [CART_CATALOG_READER],
})
export class CatalogModule {}
