import { AdministratorRole, Prisma } from '@prisma/client';
import { ApplicationError } from '../../../shared/application-error.js';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import type { AdministratorIdentityRepository } from '../application/administrator-identity.repository.js';
import type {
  AdministratorChallengeValue,
  AdministratorRoleValue,
  AdministratorSessionValue,
  AdministratorValue,
} from '../domain/administrator-identity.types.js';

const OTP_COOLDOWN_MS = 60_000;
const MOBILE_DAY_LIMIT = 5;
const IP_HOUR_LIMIT = 20;

function roleValue(role: AdministratorRole): AdministratorRoleValue {
  if (role === AdministratorRole.SUPER_ADMIN) return 'super_admin';
  if (role === AdministratorRole.INVENTORY_ADMIN) return 'inventory_admin';
  return 'instagram_admin';
}

function principal(value: {
  id: string;
  displayName: string;
  role: AdministratorRole;
  enabled: boolean;
  version: number;
}): AdministratorValue {
  return { ...value, role: roleValue(value.role) };
}

function challenge(value: {
  id: string;
  codeSalt: string;
  codeVerifier: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  administrator: {
    id: string;
    displayName: string;
    role: AdministratorRole;
    enabled: boolean;
    version: number;
  } | null;
}): AdministratorChallengeValue {
  return {
    ...value,
    administrator: value.administrator === null ? null : principal(value.administrator),
  };
}

export class PrismaAdministratorIdentityRepository implements AdministratorIdentityRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async findEnabledByMobile(mobile: string): Promise<AdministratorValue | null> {
    const found = await this.transactions.client().administrator.findFirst({
      where: { mobile, enabled: true },
    });
    return found === null ? null : principal(found);
  }

  async createChallenge(input: {
    administratorId: string | null;
    mobileHash: string;
    ipHash: string;
    codeSalt: string;
    codeVerifier: string;
    expiresAt: Date;
    now: Date;
    correlationId: string;
  }): Promise<AdministratorChallengeValue> {
    const client = this.transactions.client();
    for (const key of [input.mobileHash, input.ipHash].sort()) {
      await client.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0)) IS NULL AS locked`,
      );
    }
    const hourAgo = new Date(input.now.getTime() - 60 * 60 * 1_000);
    const dayAgo = new Date(input.now.getTime() - 24 * 60 * 60 * 1_000);
    const [latest, mobileCount, ipCount] = await Promise.all([
      client.administratorOtpChallenge.findFirst({
        where: { mobileHash: input.mobileHash },
        orderBy: { createdAt: 'desc' },
      }),
      client.administratorOtpChallenge.count({
        where: { mobileHash: input.mobileHash, createdAt: { gte: dayAgo } },
      }),
      client.administratorOtpChallenge.count({
        where: { ipHash: input.ipHash, createdAt: { gte: hourAgo } },
      }),
    ]);
    if (latest !== null && input.now.getTime() - latest.createdAt.getTime() < OTP_COOLDOWN_MS) {
      throw new ApplicationError(
        'rate_limited',
        'ADMIN_OTP_RATE_LIMITED',
        'Administrator OTP request rate limit exceeded.',
        [],
        60,
      );
    }
    if (mobileCount >= MOBILE_DAY_LIMIT || ipCount >= IP_HOUR_LIMIT) {
      throw new ApplicationError(
        'rate_limited',
        'ADMIN_OTP_RATE_LIMITED',
        'Administrator OTP request rate limit exceeded.',
        [],
        3600,
      );
    }
    const created = await client.administratorOtpChallenge.create({
      data: {
        administratorId: input.administratorId,
        mobileHash: input.mobileHash,
        ipHash: input.ipHash,
        codeSalt: input.codeSalt,
        codeVerifier: input.codeVerifier,
        expiresAt: input.expiresAt,
        createdAt: input.now,
      },
      include: { administrator: true },
    });
    await client.administratorIdentityAudit.create({
      data: {
        administratorId: input.administratorId,
        action: 'otp_challenge',
        outcome: input.administratorId === null ? 'unknown_principal' : 'created',
        correlationId: input.correlationId,
        occurredAt: input.now,
      },
    });
    return challenge(created);
  }

  async markChallengeUndeliverable(id: string, now: Date, correlationId: string): Promise<void> {
    const client = this.transactions.client();
    const found = await client.administratorOtpChallenge.findUnique({ where: { id } });
    await client.administratorOtpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
    await client.administratorIdentityAudit.create({
      data: {
        administratorId: found?.administratorId ?? null,
        action: 'otp_dispatch',
        outcome: 'failed',
        correlationId,
        occurredAt: now,
      },
    });
  }

  async lockChallenge(id: string): Promise<AdministratorChallengeValue | null> {
    const client = this.transactions.client();
    await client.$queryRaw(
      Prisma.sql`SELECT id FROM "administrator_otp_challenges" WHERE id = ${id}::uuid FOR UPDATE`,
    );
    const found = await client.administratorOtpChallenge.findUnique({
      where: { id },
      include: { administrator: true },
    });
    return found === null ? null : challenge(found);
  }

  async recordFailedAttempt(id: string, correlationId: string): Promise<void> {
    const client = this.transactions.client();
    const updated = await client.administratorOtpChallenge.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
    });
    await client.administratorIdentityAudit.create({
      data: {
        administratorId: updated.administratorId,
        action: 'otp_verification',
        outcome: 'failed',
        correlationId,
      },
    });
  }

  async consumeChallenge(id: string, now: Date): Promise<void> {
    const result = await this.transactions.client().administratorOtpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (result.count !== 1) {
      throw new ApplicationError(
        'bad_request',
        'ADMIN_OTP_VERIFICATION_FAILED',
        'Administrator OTP challenge could not be verified.',
      );
    }
  }

  async rotateSession(input: {
    administratorId: string;
    tokenHash: string;
    csrfHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    now: Date;
    correlationId: string;
  }): Promise<void> {
    const client = this.transactions.client();
    await client.administratorSession.updateMany({
      where: { administratorId: input.administratorId, revokedAt: null },
      data: { revokedAt: input.now },
    });
    await client.administratorSession.create({
      data: {
        administratorId: input.administratorId,
        tokenHash: input.tokenHash,
        csrfHash: input.csrfHash,
        idleExpiresAt: input.idleExpiresAt,
        absoluteExpiresAt: input.absoluteExpiresAt,
        lastSeenAt: input.now,
        createdAt: input.now,
      },
    });
    await client.administratorIdentityAudit.create({
      data: {
        administratorId: input.administratorId,
        action: 'session_issuance',
        outcome: 'issued',
        correlationId: input.correlationId,
        occurredAt: input.now,
      },
    });
  }

  async resolveSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiry: Date,
  ): Promise<AdministratorSessionValue | null> {
    const client = this.transactions.client();
    const session = await client.administratorSession.findUnique({
      where: { tokenHash },
      include: { administrator: true },
    });
    if (
      session === null ||
      session.revokedAt !== null ||
      !session.administrator.enabled ||
      session.idleExpiresAt <= now ||
      session.absoluteExpiresAt <= now
    ) {
      if (session !== null && session.revokedAt === null) {
        await client.administratorSession.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });
      }
      return null;
    }
    const idleExpiresAt = new Date(
      Math.min(nextIdleExpiry.getTime(), session.absoluteExpiresAt.getTime()),
    );
    await client.administratorSession.update({
      where: { id: session.id },
      data: { idleExpiresAt, lastSeenAt: now },
    });
    return {
      id: session.id,
      administrator: principal(session.administrator),
      csrfHash: session.csrfHash,
      idleExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
    };
  }

  async revokeSession(tokenHash: string, now: Date, correlationId: string): Promise<void> {
    const client = this.transactions.client();
    const session = await client.administratorSession.findUnique({ where: { tokenHash } });
    await client.administratorSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
    await client.administratorIdentityAudit.create({
      data: {
        administratorId: session?.administratorId ?? null,
        action: 'session_revocation',
        outcome: session === null ? 'not_found' : 'revoked',
        correlationId,
        occurredAt: now,
      },
    });
  }
}
