import { Injectable } from '@nestjs/common';
import type { PaymentGateway, PaymentIntent } from '../application/payment-gateway.port.js';

@Injectable()
export class FakePaymentAdapter implements PaymentGateway {
  createIntent(
    input: Readonly<{ amountIrr: number; correlationId: string }>,
  ): Promise<PaymentIntent> {
    if (!Number.isSafeInteger(input.amountIrr) || input.amountIrr <= 0) {
      return Promise.reject(new Error('Fake payment requires a positive integer IRR amount.'));
    }

    return Promise.resolve({
      reference: `fake-pay-${input.correlationId}`,
      amountIrr: input.amountIrr,
      status: 'created',
    });
  }
}
