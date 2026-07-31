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
  ],
})
export class CatalogModule {}
