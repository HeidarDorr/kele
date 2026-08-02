import type {
  FakePaymentCallbackPayload,
  PaymentAttemptRecord,
  VerifiedPaymentCallback,
} from '../../checkout/domain/checkout.types.js';

export type PaymentIntent = Readonly<{
  provider: 'fake';
  reference: string;
  redirectUrl: string;
  status: 'created';
}>;

export interface PaymentGateway {
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
    payload: FakePaymentCallbackPayload;
    now: Date;
  }): Promise<VerifiedPaymentCallback>;
}

export interface FakePaymentSimulator {
  simulateCallback(
    attempt: PaymentAttemptRecord,
    outcome: 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount',
    now: Date,
  ): Readonly<{ payload: FakePaymentCallbackPayload; signature: string }>;
}
