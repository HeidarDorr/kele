import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApplicationError } from '../../shared/application-error.js';
import {
  OPERATIONAL_TELEMETRY,
  type OperationalTelemetry,
} from '../../shared/operational-telemetry.js';
import { environment } from '../config/environment.js';
import { FixedWindowRateLimiter } from './fixed-window-rate-limiter.js';

const minute = 60_000;

abstract class RateLimitGuard implements CanActivate {
  abstract readonly scope: string;
  abstract readonly limit: number;

  protected constructor(
    private readonly limiter: FixedWindowRateLimiter,
    @Inject(OPERATIONAL_TELEMETRY) private readonly telemetry: OperationalTelemetry,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const decision = this.limiter.consume(
      this.scope,
      `${request.ip ?? 'unknown'}:${this.secondaryKey(request)}`,
      this.limit,
      minute,
    );
    if (!decision.allowed) {
      this.telemetry.record({ name: 'rate_limit', outcome: this.scope });
      throw new ApplicationError(
        'rate_limited',
        'REQUEST_RATE_LIMITED',
        'Request rate limit exceeded.',
        [],
        decision.retryAfterSeconds,
      );
    }
    return true;
  }

  protected secondaryKey(_request: Request): string {
    void _request;
    return 'request';
  }
}

@Injectable()
export class OtpVerificationRateLimitGuard extends RateLimitGuard {
  readonly scope = 'otp_verification';
  readonly limit = environment.OTP_VERIFY_RATE_LIMIT_PER_MINUTE;

  constructor(
    limiter: FixedWindowRateLimiter,
    @Inject(OPERATIONAL_TELEMETRY) telemetry: OperationalTelemetry,
  ) {
    super(limiter, telemetry);
  }
}

@Injectable()
export class PaymentCallbackRateLimitGuard extends RateLimitGuard {
  readonly scope = 'payment_callback';
  readonly limit = environment.CALLBACK_RATE_LIMIT_PER_MINUTE;

  constructor(
    limiter: FixedWindowRateLimiter,
    @Inject(OPERATIONAL_TELEMETRY) telemetry: OperationalTelemetry,
  ) {
    super(limiter, telemetry);
  }

  protected override secondaryKey(request: Request): string {
    const provider = request.params.provider;
    return typeof provider === 'string' ? provider.slice(0, 40) : 'unknown';
  }
}
