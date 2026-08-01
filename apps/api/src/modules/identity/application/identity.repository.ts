import type {
  AddressInput,
  AddressValue,
  CustomerSessionValue,
  CustomerValue,
  OtpChallengeValue,
} from '../domain/identity.types.js';

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY');

export type CreateChallengeInput = Readonly<{
  mobile: string;
  mobileHash: string;
  ipHash: string;
  deviceHash: string;
  codeSalt: string;
  codeVerifier: string;
  expiresAt: Date;
  now: Date;
}>;

export interface IdentityRepository {
  createChallenge(input: CreateChallengeInput): Promise<OtpChallengeValue>;
  markChallengeUndeliverable(id: string, now: Date): Promise<void>;
  lockChallenge(id: string): Promise<OtpChallengeValue | null>;
  recordFailedAttempt(id: string): Promise<void>;
  consumeChallenge(id: string, now: Date): Promise<void>;
  upsertCustomer(mobile: string): Promise<CustomerValue>;
  rotateSession(input: {
    customerId: string;
    previousTokenHash: string | null;
    tokenHash: string;
    csrfHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
  }): Promise<void>;
  resolveSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiry: Date,
  ): Promise<CustomerSessionValue | null>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  getCustomer(customerId: string): Promise<CustomerValue>;
  updateCustomer(
    customerId: string,
    input: { firstName?: string; lastName?: string },
  ): Promise<CustomerValue>;
  listAddresses(customerId: string): Promise<AddressValue[]>;
  createAddress(customerId: string, input: AddressInput): Promise<AddressValue>;
  updateAddress(customerId: string, addressId: string, input: AddressInput): Promise<AddressValue>;
  deleteAddress(customerId: string, addressId: string): Promise<boolean>;
}
