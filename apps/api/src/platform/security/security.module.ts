import { Global, Module } from '@nestjs/common';
import { OPERATIONAL_TELEMETRY } from '../../shared/operational-telemetry.js';
import { OperationalTelemetryService } from '../observability/operational-telemetry.service.js';
import { ObservabilityModule } from '../observability/observability.module.js';
import { environment } from '../config/environment.js';
import {
  OtpVerificationRateLimitGuard,
  PaymentCallbackRateLimitGuard,
} from './abuse-rate-limit.guards.js';
import { FixedWindowRateLimiter } from './fixed-window-rate-limiter.js';

@Global()
@Module({
  imports: [ObservabilityModule],
  providers: [
    {
      provide: FixedWindowRateLimiter,
      useFactory: () =>
        new FixedWindowRateLimiter(
          environment.IDENTITY_SIGNING_SECRET,
          environment.RATE_LIMIT_MAX_KEYS,
        ),
    },
    {
      provide: OPERATIONAL_TELEMETRY,
      useFactory: (telemetry: OperationalTelemetryService) => telemetry,
      inject: [OperationalTelemetryService],
    },
    OtpVerificationRateLimitGuard,
    PaymentCallbackRateLimitGuard,
  ],
  exports: [FixedWindowRateLimiter, OtpVerificationRateLimitGuard, PaymentCallbackRateLimitGuard],
})
export class SecurityModule {}
