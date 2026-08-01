import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { UnitOfWork } from '../../shared/unit-of-work.js';
import { PrismaService } from './prisma.service.js';

export type DatabaseClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaTransactionContext implements UnitOfWork {
  private readonly storage = new AsyncLocalStorage<Prisma.TransactionClient>();

  constructor(private readonly prisma: PrismaService) {}

  client(): DatabaseClient {
    return this.storage.getStore() ?? this.prisma;
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    if (this.storage.getStore() !== undefined) return work();
    return this.prisma.$transaction((transaction) => this.storage.run(transaction, work));
  }
}
