import { randomUUID } from 'node:crypto';
import { AdministratorRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function validateUatSeedEnvironment(environment: NodeJS.ProcessEnv): string {
  if (environment.NODE_ENV !== 'production' || environment.KELE_DEPLOYMENT_TIER !== 'uat') {
    throw new Error('The synthetic administrator seed is restricted to the UAT deployment tier.');
  }
  if (environment.KELE_UAT_BOOTSTRAP !== 'synthetic-only') {
    throw new Error('KELE_UAT_BOOTSTRAP=synthetic-only is required for the UAT seed.');
  }
  const mobile = environment.KELE_UAT_ADMIN_MOBILE;
  if (mobile === undefined || !/^\+98[0-9]{10}$/.test(mobile)) {
    throw new Error('KELE_UAT_ADMIN_MOBILE must use the +98 followed by 10 digits format.');
  }
  return mobile;
}

async function seedUatAdministrator(): Promise<void> {
  const mobile = validateUatSeedEnvironment(process.env);
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.administrator.findUnique({ where: { mobile } });
    const changed =
      current === null ||
      current.displayName !== 'KELE Synthetic UAT Administrator' ||
      current.role !== AdministratorRole.SUPER_ADMIN ||
      !current.enabled;
    if (!changed) return;

    const administrator = await transaction.administrator.upsert({
      where: { mobile },
      create: {
        mobile,
        displayName: 'KELE Synthetic UAT Administrator',
        role: AdministratorRole.SUPER_ADMIN,
      },
      update: {
        displayName: 'KELE Synthetic UAT Administrator',
        role: AdministratorRole.SUPER_ADMIN,
        enabled: true,
        version: { increment: 1 },
      },
    });
    await transaction.administratorIdentityAudit.create({
      data: {
        administratorId: administrator.id,
        action: 'uat_synthetic_bootstrap',
        outcome: current === null ? 'created' : 'reconciled',
        correlationId: randomUUID(),
      },
    });
  });
}

const executedDirectly = process.argv[1]?.endsWith('uat-seed.js') ?? false;
if (executedDirectly) {
  void seedUatAdministrator()
    .then(() => process.stdout.write('Reconciled the synthetic UAT administrator.\n'))
    .catch((error: unknown) => {
      process.stderr.write(
        `Synthetic UAT administrator seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
