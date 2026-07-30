import { PrismaClient } from '@prisma/client';

const seedVersion = 'milestone-1-foundation';
const prisma = new PrismaClient();

async function seed(): Promise<void> {
  await prisma.seedLedger.upsert({
    where: { key: seedVersion },
    create: { key: seedVersion },
    update: {},
  });
}

void seed()
  .then(() => process.stdout.write(`Applied deterministic seed: ${seedVersion}\n`))
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
