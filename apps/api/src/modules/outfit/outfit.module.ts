import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import {
  OUTFIT_CATALOG_PORT,
  type OutfitCatalogPort,
} from '../catalog/application/outfit-catalog.contract.js';
import { PrismaTransactionContext } from '../../infrastructure/prisma/prisma-transaction.context.js';
import { UNIT_OF_WORK, type UnitOfWork } from '../../shared/unit-of-work.js';
import { OUTFIT_REPOSITORY, type OutfitRepository } from './application/outfit.repository.js';
import { OutfitService } from './application/outfit.service.js';
import { PrismaOutfitRepository } from './infrastructure/prisma-outfit.repository.js';
import { AdminOutfitController, PublicOutfitController } from './presentation/outfit.controller.js';
import { AdminSessionGuard } from '../catalog/presentation/admin-session.guard.js';

@Module({
  imports: [CatalogModule],
  controllers: [PublicOutfitController, AdminOutfitController],
  providers: [
    AdminSessionGuard,
    {
      provide: OUTFIT_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): OutfitRepository =>
        new PrismaOutfitRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: OutfitService,
      useFactory: (
        repository: OutfitRepository,
        catalog: OutfitCatalogPort,
        unitOfWork: UnitOfWork,
      ): OutfitService => new OutfitService(repository, catalog, unitOfWork),
      inject: [OUTFIT_REPOSITORY, OUTFIT_CATALOG_PORT, UNIT_OF_WORK],
    },
  ],
  exports: [OutfitService],
})
export class OutfitModule {}
