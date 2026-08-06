import { Global, Module } from '@nestjs/common';
import { environment } from '../config/environment.js';
import {
  OtpVerificationRateLimitGuard,
  PaymentCallbackRateLimitGuard,
} from './abuse-rate-limit.guards.js';
import { FixedWindowRateLimiter } from './fixed-window-rate-limiter.js';

@Global()
@Module({
  providers: [
    {
      provide: FixedWindowRateLimiter,
      useFactory: () =>
        new FixedWindowRateLimiter(
          environment.IDENTITY_SIGNING_SECRET,
          environment.RATE_LIMIT_MAX_KEYS,
        ),
    },
    OtpVerificationRateLimitGuard,
    PaymentCallbackRateLimitGuard,
  ],
  exports: [FixedWindowRateLimiter, OtpVerificationRateLimitGuard, PaymentCallbackRateLimitGuard],
})
export class SecurityModule {}
