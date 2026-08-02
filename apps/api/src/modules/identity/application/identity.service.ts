import type { SmsGateway } from '../../foundation/application/sms-gateway.port.js';
import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import type { Clock } from '../../../shared/deterministic-runtime.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CartService } from '../../cart/application/cart.service.js';
import type { CartView } from '../../cart/domain/cart.types.js';
import type { CustomerSessionValue, CustomerValue } from '../domain/identity.types.js';
import {
  createOtpVerifier,
  hashMatches,
  otpMatches,
  privacyHash,
  randomHex,
  randomOtp,
  randomToken,
  sha256,
} from './identity-crypto.js';
import type { IdentityRepository } from './identity.repository.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthenticationResultValue = Readonly<{
  customer: CustomerValue;
  cart: CartView;
  mergePerformed: boolean;
  sessionToken: string;
  csrfToken: string;
}>;

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly carts: CartService,
    private readonly sms: SmsGateway,
    private readonly unitOfWork: UnitOfWork,
    private readonly signingSecret: string,
    private readonly otpPepper: string,
    private readonly otpCode: () => string = randomOtp,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async createOtpChallenge(mobile: string, ip: string, deviceId: string) {
    const now = this.clock();
    const code = this.otpCode();
    const codeSalt = randomHex(16);
    const challenge = await this.unitOfWork.run(() =>
      this.repository.createChallenge({
        mobile,
        mobileHash: privacyHash(mobile, this.signingSecret),
        ipHash: privacyHash(ip, this.signingSecret),
        deviceHash: privacyHash(deviceId, this.signingSecret),
        codeSalt,
        codeVerifier: createOtpVerifier(code, codeSalt, this.otpPepper),
        expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
        now,
      }),
    );
    try {
      await this.sms.send({
        mobile,
        message: `KELE OTP: ${code}`,
        correlationId: challenge.id,
      });
    } catch {
      await this.unitOfWork.run(() =>
        this.repository.markChallengeUndeliverable(challenge.id, this.clock()),
      );
      throw new ApplicationError(
        'dependency',
        'SMS_DISPATCH_FAILED',
        'OTP could not be dispatched.',
      );
    }
    return {
      challengeId: challenge.id,
      retryAfterSeconds: 60,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  async verifyOtp(input: {
    challengeId: string;
    code: string;
    previousSessionToken: string | null;
    guestCartId: string | null;
  }): Promise<AuthenticationResultValue> {
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const now = this.clock();
    const outcome = await this.unitOfWork.run(async () => {
      const challenge = await this.repository.lockChallenge(input.challengeId);
      if (challenge === null || challenge.consumedAt !== null || challenge.failedAttempts >= 5) {
        return { valid: false as const };
      }
      if (challenge.expiresAt <= now) {
        await this.repository.consumeChallenge(challenge.id, now);
        return { valid: false as const };
      }
      if (!otpMatches(input.code, challenge.codeSalt, this.otpPepper, challenge.codeVerifier)) {
        await this.repository.recordFailedAttempt(challenge.id);
        return { valid: false as const };
      }

      await this.repository.consumeChallenge(challenge.id, now);
      const customer = await this.repository.upsertCustomer(challenge.mobile);
      await this.repository.rotateSession({
        customerId: customer.id,
        previousTokenHash:
          input.previousSessionToken === null ? null : sha256(input.previousSessionToken),
        tokenHash: sha256(sessionToken),
        csrfHash: sha256(csrfToken),
        idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_MS),
        absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
        now,
      });
      const merge = await this.carts.mergeGuestCart(customer.id, input.guestCartId);
      return { valid: true as const, customer, merge };
    });

    if (!outcome.valid) {
      throw new ApplicationError(
        'validation',
        'OTP_VERIFICATION_FAILED',
        'OTP challenge could not be verified.',
      );
    }
    return {
      customer: outcome.customer,
      cart: outcome.merge.cart,
      mergePerformed: outcome.merge.mergePerformed,
      sessionToken,
      csrfToken,
    };
  }

  resolveSession(sessionToken: string | null): Promise<CustomerSessionValue | null> {
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

  assertCsrf(session: CustomerSessionValue, token: string | null): void {
    if (token === null || !hashMatches(token, session.csrfHash)) {
      throw new ApplicationError('forbidden', 'CSRF_VALIDATION_FAILED', 'CSRF validation failed.');
    }
  }

  logout(sessionToken: string): Promise<void> {
    return this.unitOfWork.run(() =>
      this.repository.revokeSession(sha256(sessionToken), this.clock()),
    );
  }
}
