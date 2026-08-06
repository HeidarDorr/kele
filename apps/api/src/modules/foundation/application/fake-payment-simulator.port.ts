import type {
  FakePaymentCallbackPayload,
  PaymentAttemptRecord,
} from '../../checkout/domain/checkout.types.js';

export interface FakePaymentSimulator {
  simulateCallback(
    attempt: PaymentAttemptRecord,
    outcome: 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount',
    now: Date,
  ): Readonly<{ payload: FakePaymentCallbackPayload; signature: string }>;
}
