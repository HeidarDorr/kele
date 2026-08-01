import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PrismaTransactionContext } from './prisma-transaction.context.js';
import { UNIT_OF_WORK } from '../../shared/unit-of-work.js';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionContext,
    { provide: UNIT_OF_WORK, useExisting: PrismaTransactionContext },
  ],
  exports: [PrismaService, PrismaTransactionContext, UNIT_OF_WORK],
})
export class PrismaModule {}
