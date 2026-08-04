import { Module } from '@nestjs/common';
import { FakePaymentAdapter } from './infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from './infrastructure/fake-sms.adapter.js';
import {
  FAKE_PAYMENT_SIMULATOR,
  PAYMENT_GATEWAY,
  SMS_GATEWAY,
  REFUND_GATEWAY,
} from './application/provider.tokens.js';
import { environment } from '../../platform/config/environment.js';
import { runtimeIdFactory } from '../../shared/deterministic-runtime.js';
import { FakeRefundAdapter } from './infrastructure/fake-refund.adapter.js';

@Module({
  providers: [
    {
      provide: FakePaymentAdapter,
      useFactory: (): FakePaymentAdapter =>
        new FakePaymentAdapter(
          environment.FAKE_PAYMENT_SIGNING_SECRET,
          runtimeIdFactory(environment.E2E_DETERMINISTIC_ID_SEED, 'fake-payment-callback'),
        ),
    },
    FakeSmsAdapter,
    FakeRefundAdapter,
    { provide: PAYMENT_GATEWAY, useExisting: FakePaymentAdapter },
    { provide: FAKE_PAYMENT_SIMULATOR, useExisting: FakePaymentAdapter },
    { provide: SMS_GATEWAY, useExisting: FakeSmsAdapter },
    { provide: REFUND_GATEWAY, useExisting: FakeRefundAdapter },
  ],
  exports: [PAYMENT_GATEWAY, FAKE_PAYMENT_SIMULATOR, SMS_GATEWAY, REFUND_GATEWAY],
})
export class FoundationModule {}
