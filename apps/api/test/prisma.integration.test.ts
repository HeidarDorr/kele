import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();

afterAll(() => prisma.$disconnect());

describe('PostgreSQL integration harness', () => {
  it('uses PostgreSQL and persists an idempotent deterministic seed ledger entry', async () => {
    const database = await prisma.$queryRaw<
      Array<{ database: string }>
    >`SELECT current_database() AS database`;
    expect(database).toHaveLength(1);

    await prisma.seedLedger.upsert({
      where: { key: 'integration-harness' },
      create: { key: 'integration-harness' },
      update: {},
    });
    await prisma.seedLedger.upsert({
      where: { key: 'integration-harness' },
      create: { key: 'integration-harness' },
      update: {},
    });

    expect(await prisma.seedLedger.count({ where: { key: 'integration-harness' } })).toBe(1);
  });
});
