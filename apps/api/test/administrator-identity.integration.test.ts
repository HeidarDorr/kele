import { randomUUID } from 'node:crypto';
import { AdministratorRole, PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import type {
  SmsDeliveryStatus,
  SmsDispatch,
  SmsGateway,
} from '../src/modules/foundation/application/sms-gateway.port.js';
import { AdministratorIdentityService } from '../src/modules/identity/application/administrator-identity.service.js';
import { PrismaAdministratorIdentityRepository } from '../src/modules/identity/infrastructure/prisma-administrator-identity.repository.js';

class RecordingSmsGateway implements SmsGateway {
  readonly provider = 'recording';
  readonly messages = new Map<string, string>();

  sendOtp(input: { mobile: string; code: string; correlationId: string }): Promise<SmsDispatch> {
    this.messages.set(input.correlationId, input.code);
    return Promise.resolve({
      provider: this.provider,
      providerMessageId: `recording-${input.correlationId}`,
      accepted: true,
    });
  }

  getDeliveryStatus(providerMessageId: string): Promise<SmsDeliveryStatus> {
    return Promise.resolve({
      provider: this.provider,
      providerMessageId,
      status: 'delivered',
    });
  }
}

const prisma = new PrismaClient();
const transactions = new PrismaTransactionContext(prisma as unknown as PrismaService);
const repository = new PrismaAdministratorIdentityRepository(transactions);
const sms = new RecordingSmsGateway();
let now = new Date('2026-08-07T12:00:00.000Z');
const identity = new AdministratorIdentityService(
  repository,
  sms,
  transactions,
  'integration-admin-signing-secret-with-thirty-two-characters',
  'integration-admin-otp-pepper-with-thirty-two-characters',
  () => '654321',
  () => now,
);
const mobile = '+989121234567';

async function truncateAdministratorIdentity(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "administrator_identity_audit", "administrator_sessions", "administrator_otp_challenges", "administrators" CASCADE',
  );
}

beforeAll(async () => {
  await truncateAdministratorIdentity();
  await prisma.administrator.create({
    data: {
      mobile,
      displayName: 'Milestone 9 Super Administrator',
      role: AdministratorRole.SUPER_ADMIN,
    },
  });
});

afterAll(async () => {
  await truncateAdministratorIdentity();
  await prisma.$disconnect();
});

describe('PostgreSQL-backed administrator identity', () => {
  it('keeps unknown principals generic and never dispatches their OTP', async () => {
    const challenge = await identity.createChallenge({
      mobile: '+989129999999',
      ip: '198.51.100.10',
      correlationId: randomUUID(),
    });

    expect(challenge).toMatchObject({ retryAfterSeconds: 60 });
    expect(sms.messages.has(challenge.challengeId)).toBe(false);
    await expect(
      identity.verify({
        challengeId: challenge.challengeId,
        code: '654321',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_OTP_VERIFICATION_FAILED' });
  });

  it('limits guesses, issues one rotating session, and resolves the persisted role', async () => {
    const first = await identity.createChallenge({
      mobile,
      ip: '198.51.100.11',
      correlationId: randomUUID(),
    });
    expect(sms.messages.get(first.challengeId)).toBe('654321');

    await expect(
      identity.verify({
        challengeId: first.challengeId,
        code: '000000',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_OTP_VERIFICATION_FAILED' });

    const firstSession = await identity.verify({
      challengeId: first.challengeId,
      code: '654321',
      correlationId: randomUUID(),
    });
    await expect(identity.resolveSession(firstSession.sessionToken)).resolves.toMatchObject({
      administrator: { role: 'super_admin', enabled: true },
    });

    now = new Date(now.getTime() + 61_000);
    const second = await identity.createChallenge({
      mobile,
      ip: '198.51.100.11',
      correlationId: randomUUID(),
    });
    const secondSession = await identity.verify({
      challengeId: second.challengeId,
      code: '654321',
      correlationId: randomUUID(),
    });

    await expect(identity.resolveSession(firstSession.sessionToken)).resolves.toBeNull();
    await expect(identity.resolveSession(secondSession.sessionToken)).resolves.toMatchObject({
      administrator: { role: 'super_admin' },
    });

    await identity.logout(secondSession.sessionToken, randomUUID());
    await expect(identity.resolveSession(secondSession.sessionToken)).resolves.toBeNull();
  });

  it('consumes the administrator challenge after five failed guesses', async () => {
    now = new Date(now.getTime() + 61_000);
    const challenge = await identity.createChallenge({
      mobile,
      ip: '198.51.100.13',
      correlationId: randomUUID(),
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        identity.verify({
          challengeId: challenge.challengeId,
          code: String(attempt).padStart(6, '0'),
          correlationId: randomUUID(),
        }),
      ).rejects.toMatchObject({ code: 'ADMIN_OTP_VERIFICATION_FAILED' });
    }
    await expect(
      identity.verify({
        challengeId: challenge.challengeId,
        code: '654321',
        correlationId: randomUUID(),
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_OTP_VERIFICATION_FAILED' });
  });

  it('revokes active sessions in the same transaction when role or enabled state changes', async () => {
    now = new Date(now.getTime() + 61_000);
    const challenge = await identity.createChallenge({
      mobile,
      ip: '198.51.100.12',
      correlationId: randomUUID(),
    });
    const session = await identity.verify({
      challengeId: challenge.challengeId,
      code: '654321',
      correlationId: randomUUID(),
    });
    await prisma.administrator.update({
      where: { mobile },
      data: { role: AdministratorRole.INVENTORY_ADMIN, version: { increment: 1 } },
    });

    await expect(
      prisma.administratorSession.findFirstOrThrow({
        where: { tokenHash: { not: '' } },
        orderBy: { createdAt: 'desc' },
      }),
    ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
    await expect(identity.resolveSession(session.sessionToken)).resolves.toBeNull();

    await prisma.administrator.update({
      where: { mobile },
      data: {
        role: AdministratorRole.SUPER_ADMIN,
        enabled: false,
        version: { increment: 1 },
      },
    });
  });

  it('enforces append-only administrator identity audit records', async () => {
    const audit = await prisma.administratorIdentityAudit.findFirstOrThrow();
    await expect(
      prisma.administratorIdentityAudit.update({
        where: { id: audit.id },
        data: { outcome: 'mutated' },
      }),
    ).rejects.toThrow(/append-only/);
  });
});
