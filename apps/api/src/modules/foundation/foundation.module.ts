import { Module } from '@nestjs/common';
import { FakePaymentAdapter } from './infrastructure/fake-payment.adapter.js';
import { FakeSmsAdapter } from './infrastructure/fake-sms.adapter.js';
import { PAYMENT_GATEWAY, SMS_GATEWAY } from './application/provider.tokens.js';

@Module({
  providers: [
    FakePaymentAdapter,
    FakeSmsAdapter,
    { provide: PAYMENT_GATEWAY, useExisting: FakePaymentAdapter },
    { provide: SMS_GATEWAY, useExisting: FakeSmsAdapter },
  ],
  exports: [PAYMENT_GATEWAY, SMS_GATEWAY],
})
export class FoundationModule {}
