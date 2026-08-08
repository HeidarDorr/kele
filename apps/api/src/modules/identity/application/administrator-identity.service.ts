import { ApplicationError } from '../../../shared/application-error.js';
import type { Clock } from '../../../shared/deterministic-runtime.js';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import type { SmsGateway } from '../../foundation/application/sms-gateway.port.js';
import type { AdministratorSessionValue } from '../domain/administrator-identity.types.js';
import {
  createOtpVerifier,
  otpMatches,
  privacyHash,
  randomHex,
  randomOtp,
  randomToken,
  sha256,
} from './identity-crypto.js';
import type { AdministratorIdentityRepository } from './administrator-identity.repository.js';

const OTP_EXPIRY_MS = 5 * 60 * 1_000;
const SESSION_IDLE_MS = 30 * 60 * 1_000;
const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1_000;

export class AdministratorIdentityService {
  constructor(
    private readonly repository: AdministratorIdentityRepository,
    private readonly sms: SmsGateway,
    private readonly unitOfWork: UnitOfWork,
    private readonly signingSecret: string,
    private readonly otpPepper: string,
    private readonly otpCode: () => string = randomOtp,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async createChallenge(input: {
    mobile: string;
    ip: string;
    correlationId: string;
  }): Promise<{ challengeId: string; retryAfterSeconds: number; expiresAt: string }> {
    const now = this.clock();
    const administrator = await this.repository.findEnabledByMobile(input.mobile);
    const code = this.otpCode();
    const codeSalt = randomHex(16);
    const challenge = await this.unitOfWork.run(() =>
      this.repository.createChallenge({
        administratorId: administrator?.id ?? null,
        mobileHash: privacyHash(input.mobile, this.signingSecret),
        ipHash: privacyHash(input.ip, this.signingSecret),
        codeSalt,
        codeVerifier: createOtpVerifier(code, codeSalt, this.otpPepper),
        expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
        now,
        correlationId: input.correlationId,
      }),
    );
    if (administrator !== null) {
      try {
        await this.sms.sendOtp({
          mobile: input.mobile,
          code,
          correlationId: challenge.id,
        });
      } catch {
        await this.unitOfWork.run(() =>
          this.repository.markChallengeUndeliverable(
            challenge.id,
            this.clock(),
            input.correlationId,
          ),
        );
        throw new ApplicationError(
          'dependency',
          'ADMIN_OTP_DISPATCH_FAILED',
          'Administrator OTP could not be dispatched.',
        );
      }
    }
    return {
      challengeId: challenge.id,
      retryAfterSeconds: 60,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async verify(input: { challengeId: string; code: string; correlationId: string }): Promise<{
    administrator: AdministratorSessionValue['administrator'];
    sessionToken: string;
    csrfToken: string;
  }> {
    const now = this.clock();
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const result = await this.unitOfWork.run(async () => {
      const challenge = await this.repository.lockChallenge(input.challengeId);
      if (
        challenge === null ||
        challenge.administrator === null ||
        !challenge.administrator.enabled ||
        challenge.consumedAt !== null ||
        challenge.failedAttempts >= 5 ||
        challenge.expiresAt <= now
      ) {
        if (challenge !== null && challenge.consumedAt === null && challenge.expiresAt <= now) {
          await this.repository.consumeChallenge(challenge.id, now);
        }
        return null;
      }
      if (!otpMatches(input.code, challenge.codeSalt, this.otpPepper, challenge.codeVerifier)) {
        await this.repository.recordFailedAttempt(challenge.id, input.correlationId);
        return null;
      }
      await this.repository.consumeChallenge(challenge.id, now);
      await this.repository.rotateSession({
        administratorId: challenge.administrator.id,
        tokenHash: sha256(sessionToken),
        csrfHash: sha256(csrfToken),
        idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
        now,
        correlationId: input.correlationId,
      });
      return challenge.administrator;
    });
    if (result === null) {
      throw new ApplicationError(
        'bad_request',
        'ADMIN_OTP_VERIFICATION_FAILED',
        'Administrator OTP challenge could not be verified.',
      );
    }
    return { administrator: result, sessionToken, csrfToken };
  }

  resolveSession(sessionToken: string | null): Promise<AdministratorSessionValue | null> {
    if (sessionToken === null || sessionToken.length < 32) return Promise.resolve(null);
    const now = this.clock();
    return this.unitOfWork.run(() =>
      this.repository.resolveSession(
        sha256(sessionToken),
        now,
        new Date(now.getTime() + SESSION_IDLE_MS),
      ),
    );
  }

  logout(sessionToken: string, correlationId: string): Promise<void> {
    return this.unitOfWork.run(() =>
      this.repository.revokeSession(sha256(sessionToken), this.clock(), correlationId),
    );
  }
}
