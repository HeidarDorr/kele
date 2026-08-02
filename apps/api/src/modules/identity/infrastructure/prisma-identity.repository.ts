import { Prisma } from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  CreateChallengeInput,
  IdentityRepository,
} from '../application/identity.repository.js';
import type {
  AddressInput,
  AddressValue,
  CustomerSessionValue,
  CustomerValue,
  OtpChallengeValue,
} from '../domain/identity.types.js';

const OTP_COOLDOWN_MS = 60_000;
const MOBILE_DAY_LIMIT = 5;
const DEVICE_HOUR_LIMIT = 5;
const IP_HOUR_LIMIT = 20;

function mapCustomer(customer: {
  id: string;
  mobile: string;
  firstName: string | null;
  lastName: string | null;
}): CustomerValue {
  return customer;
}

function mapChallenge(challenge: {
  id: string;
  mobile: string;
  codeSalt: string;
  codeVerifier: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}): OtpChallengeValue {
  return challenge;
}

function mapAddress(address: {
  id: string;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}): AddressValue {
  return address;
}

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async createChallenge(input: CreateChallengeInput): Promise<OtpChallengeValue> {
    const client = this.transactions.client();
    for (const key of [input.mobileHash, input.ipHash, input.deviceHash].sort()) {
      await client.$queryRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0)) IS NULL AS locked`,
      );
    }
    const hourAgo = new Date(input.now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(input.now.getTime() - 24 * 60 * 60 * 1000);
    const [latest, mobileCount, deviceCount, ipCount] = await Promise.all([
      client.otpChallenge.findFirst({
        where: { mobileHash: input.mobileHash },
        orderBy: { createdAt: 'desc' },
      }),
      client.otpChallenge.count({
        where: { mobileHash: input.mobileHash, createdAt: { gte: dayAgo } },
      }),
      client.otpChallenge.count({
        where: { deviceHash: input.deviceHash, createdAt: { gte: hourAgo } },
      }),
      client.otpChallenge.count({
        where: { ipHash: input.ipHash, createdAt: { gte: hourAgo } },
      }),
    ]);
    if (latest !== null && input.now.getTime() - latest.createdAt.getTime() < OTP_COOLDOWN_MS) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((OTP_COOLDOWN_MS - (input.now.getTime() - latest.createdAt.getTime())) / 1000),
      );
      throw new ApplicationError(
        'rate_limited',
        'OTP_RATE_LIMITED',
        'OTP request rate limit exceeded.',
        [],
        retryAfterSeconds,
      );
    }
    if (
      mobileCount >= MOBILE_DAY_LIMIT ||
      deviceCount >= DEVICE_HOUR_LIMIT ||
      ipCount >= IP_HOUR_LIMIT
    ) {
      throw new ApplicationError(
        'rate_limited',
        'OTP_RATE_LIMITED',
        'OTP request rate limit exceeded.',
        [],
        3600,
      );
    }
    return mapChallenge(
      await client.otpChallenge.create({
        data: {
          mobile: input.mobile,
          mobileHash: input.mobileHash,
          ipHash: input.ipHash,
          deviceHash: input.deviceHash,
          codeSalt: input.codeSalt,
          codeVerifier: input.codeVerifier,
          expiresAt: input.expiresAt,
          createdAt: input.now,
        },
      }),
    );
  }

  async markChallengeUndeliverable(id: string, now: Date): Promise<void> {
    await this.transactions.client().otpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
  }

  async lockChallenge(id: string): Promise<OtpChallengeValue | null> {
    const client = this.transactions.client();
    await client.$queryRaw(
      Prisma.sql`SELECT id FROM "otp_challenges" WHERE id = ${id}::uuid FOR UPDATE`,
    );
    const challenge = await client.otpChallenge.findUnique({ where: { id } });
    return challenge === null ? null : mapChallenge(challenge);
  }

  async recordFailedAttempt(id: string): Promise<void> {
    await this.transactions.client().otpChallenge.update({
      where: { id },
      data: { failedAttempts: { increment: 1 } },
    });
  }

  async consumeChallenge(id: string, now: Date): Promise<void> {
    const result = await this.transactions.client().otpChallenge.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (result.count !== 1) {
      throw new ApplicationError(
        'validation',
        'OTP_VERIFICATION_FAILED',
        'OTP challenge could not be verified.',
      );
    }
  }

  async upsertCustomer(mobile: string): Promise<CustomerValue> {
    return mapCustomer(
      await this.transactions.client().customer.upsert({
        where: { mobile },
        create: { mobile },
        update: {},
      }),
    );
  }

  async rotateSession(input: {
    customerId: string;
    previousTokenHash: string | null;
    tokenHash: string;
    csrfHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    now: Date;
  }): Promise<void> {
    const client = this.transactions.client();
    if (input.previousTokenHash !== null) {
      await client.customerSession.updateMany({
        where: { tokenHash: input.previousTokenHash, revokedAt: null },
        data: { revokedAt: input.now },
      });
    }
    await client.customerSession.create({
      data: {
        customerId: input.customerId,
        tokenHash: input.tokenHash,
        csrfHash: input.csrfHash,
        idleExpiresAt: input.idleExpiresAt,
        absoluteExpiresAt: input.absoluteExpiresAt,
        createdAt: input.now,
        lastSeenAt: input.now,
      },
    });
  }

  async resolveSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiry: Date,
  ): Promise<CustomerSessionValue | null> {
    const client = this.transactions.client();
    const session = await client.customerSession.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });
    if (
      session === null ||
      session.revokedAt !== null ||
      session.idleExpiresAt <= now ||
      session.absoluteExpiresAt <= now
    ) {
      if (session !== null && session.revokedAt === null) {
        await client.customerSession.update({
          where: { id: session.id },
          data: { revokedAt: now },
        });
      }
      return null;
    }
    const idleExpiresAt = new Date(
      Math.min(nextIdleExpiry.getTime(), session.absoluteExpiresAt.getTime()),
    );
    await client.customerSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now, idleExpiresAt },
    });
    return {
      id: session.id,
      customer: mapCustomer(session.customer),
      csrfHash: session.csrfHash,
      idleExpiresAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
    };
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.transactions.client().customerSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async getCustomer(customerId: string): Promise<CustomerValue> {
    const customer = await this.transactions.client().customer.findUnique({
      where: { id: customerId },
    });
    if (customer === null) {
      throw new ApplicationError('not_found', 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
    }
    return mapCustomer(customer);
  }

  async updateCustomer(
    customerId: string,
    input: { firstName?: string; lastName?: string },
  ): Promise<CustomerValue> {
    const updated = await this.transactions.client().customer.updateMany({
      where: { id: customerId },
      data: input,
    });
    if (updated.count !== 1) {
      throw new ApplicationError('not_found', 'CUSTOMER_NOT_FOUND', 'Customer was not found.');
    }
    return this.getCustomer(customerId);
  }

  async listAddresses(customerId: string): Promise<AddressValue[]> {
    const addresses = await this.transactions.client().address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return addresses.map(mapAddress);
  }

  async createAddress(customerId: string, input: AddressInput): Promise<AddressValue> {
    const client = this.transactions.client();
    if (input.isDefault) {
      await client.address.updateMany({ where: { customerId }, data: { isDefault: false } });
    }
    return mapAddress(await client.address.create({ data: { customerId, ...input } }));
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    input: AddressInput,
  ): Promise<AddressValue> {
    const client = this.transactions.client();
    const owned = await client.address.findFirst({ where: { id: addressId, customerId } });
    if (owned === null) {
      throw new ApplicationError('not_found', 'ADDRESS_NOT_FOUND', 'Address was not found.');
    }
    if (input.isDefault) {
      await client.address.updateMany({
        where: { customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }
    return mapAddress(await client.address.update({ where: { id: addressId }, data: input }));
  }

  async deleteAddress(customerId: string, addressId: string): Promise<boolean> {
    const result = await this.transactions.client().address.deleteMany({
      where: { id: addressId, customerId },
    });
    return result.count === 1;
  }
}
