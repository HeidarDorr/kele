import type { VerifiedPaymentCallback } from '../../checkout/domain/checkout.types.js';

export type PaymentIntent = Readonly<{
  provider: string;
  reference: string;
  redirectUrl: string;
  status: 'created';
}>;

export interface PaymentGateway {
  readonly provider: string;
  createIntent(input: {
    applicationReference: string;
    paymentAttemptId: string;
    amountRial: number;
    currency: 'IRR';
    returnBaseUrl: string;
    correlationId: string;
  }): Promise<PaymentIntent>;
  verifyCallback(input: {
    signature: string;
    payload: unknown;
    now: Date;
  }): Promise<VerifiedPaymentCallback>;
}
