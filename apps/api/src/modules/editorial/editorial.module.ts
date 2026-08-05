import { Module } from '@nestjs/common';
import { PrismaTransactionContext } from '../../infrastructure/prisma/prisma-transaction.context.js';
import { AdminSessionGuard } from '../catalog/presentation/admin-session.guard.js';
import {
  EDITORIAL_REPOSITORY,
  type EditorialRepository,
} from './application/editorial.repository.js';
import { EditorialService } from './application/editorial.service.js';
import { PrismaEditorialRepository } from './infrastructure/prisma-editorial.repository.js';
import {
  AdminEditorialController,
  PublicEditorialController,
} from './presentation/editorial.controller.js';

@Module({
  controllers: [PublicEditorialController, AdminEditorialController],
  providers: [
    AdminSessionGuard,
    {
      provide: EDITORIAL_REPOSITORY,
      useFactory: (transactions: PrismaTransactionContext): EditorialRepository =>
        new PrismaEditorialRepository(transactions),
      inject: [PrismaTransactionContext],
    },
    {
      provide: EditorialService,
      useFactory: (repository: EditorialRepository): EditorialService =>
        new EditorialService(repository),
      inject: [EDITORIAL_REPOSITORY],
    },
  ],
})
export class EditorialModule {}
