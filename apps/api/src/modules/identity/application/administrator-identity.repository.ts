import type {
  AdministratorChallengeValue,
  AdministratorSessionValue,
  AdministratorValue,
} from '../domain/administrator-identity.types.js';

export const ADMINISTRATOR_IDENTITY_REPOSITORY = Symbol('ADMINISTRATOR_IDENTITY_REPOSITORY');

export interface AdministratorIdentityRepository {
  findEnabledByMobile(mobile: string): Promise<AdministratorValue | null>;
  createChallenge(input: {
    administratorId: string | null;
    mobileHash: string;
    ipHash: string;
    codeSalt: string;
    codeVerifier: string;
    expiresAt: Date;
    now: Date;
    correlationId: string;
  }): Promise<AdministratorChallengeValue>;
  markChallengeUndeliverable(id: string, now: Date, correlationId: string): Promise<void>;
  lockChallenge(id: string): Promise<AdministratorChallengeValue | null>;
  recordFailedAttempt(id: string, correlationId: string): Promise<void>;
  consumeChallenge(id: string, now: Date): Promise<void>;
  rotateSession(input: {
    administratorId: string;
    tokenHash: string;
    csrfHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
    now: Date;
    correlationId: string;
  }): Promise<void>;
  resolveSession(
    tokenHash: string,
    now: Date,
    nextIdleExpiry: Date,
  ): Promise<AdministratorSessionValue | null>;
  revokeSession(tokenHash: string, now: Date, correlationId: string): Promise<void>;
}
