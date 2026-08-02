import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../shared/application-error.js';
import type {
  FakePaymentCallbackPayload,
  PaymentAttemptRecord,
} from '../../checkout/domain/checkout.types.js';
import type { PaymentGateway, PaymentIntent } from '../application/payment-gateway.port.js';
import type { IdFactory } from '../../../shared/deterministic-runtime.js';

const CALLBACK_MAX_AGE_MS = 5 * 60_000;
const CALLBACK_FUTURE_SKEW_MS = 30_000;

function canonicalCallback(payload: FakePaymentCallbackPayload): string {
  return JSON.stringify({
    amountRial: payload.amountRial,
    currency: payload.currency,
    issuedAt: payload.issuedAt,
    nonce: payload.nonce,
    providerReference: payload.providerReference,
    providerTransactionId: payload.providerTransactionId,
    status: payload.status,
  });
}

@Injectable()
export class FakePaymentAdapter implements PaymentGateway {
  constructor(
    private readonly signingSecret: string,
    private readonly idFactory: IdFactory = randomUUID,
  ) {}

  createIntent(input: {
    applicationReference: string;
    paymentAttemptId: string;
    amountRial: number;
    currency: 'IRR';
    returnBaseUrl: string;
    correlationId: string;
  }): Promise<PaymentIntent> {
    if (!Number.isSafeInteger(input.amountRial) || input.amountRial <= 0) {
      return Promise.reject(new Error('Fake payment requires a positive integer IRR amount.'));
    }
    return Promise.resolve({
      provider: 'fake',
      reference: `fake-${input.applicationReference}`,
      redirectUrl: `${input.returnBaseUrl.replace(/\/$/, '')}/payment/fake?attempt=${encodeURIComponent(
        input.paymentAttemptId,
      )}`,
      status: 'created',
    });
  }

  verifyCallback(input: {
    signature: string;
    payload: FakePaymentCallbackPayload;
    now: Date;
  }): Promise<import('../../checkout/domain/checkout.types.js').VerifiedPaymentCallback> {
    const canonical = canonicalCallback(input.payload);
    const expected = this.signature(canonical);
    const presented = Buffer.from(input.signature, 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    if (presented.length !== expectedBytes.length || !timingSafeEqual(presented, expectedBytes)) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_UNVERIFIED',
        'Payment callback authenticity verification failed.',
      );
    }
    const issuedAt = new Date(input.payload.issuedAt);
    if (
      Number.isNaN(issuedAt.getTime()) ||
      input.now.getTime() - issuedAt.getTime() > CALLBACK_MAX_AGE_MS ||
      issuedAt.getTime() - input.now.getTime() > CALLBACK_FUTURE_SKEW_MS
    ) {
      throw new ApplicationError(
        'forbidden',
        'PAYMENT_CALLBACK_STALE',
        'Payment callback is stale or has an invalid provider timestamp.',
      );
    }
    return Promise.resolve({
      ...input.payload,
      provider: 'fake',
      payloadHash: createHash('sha256').update(canonical).digest('hex'),
    });
  }

  simulateCallback(
    attempt: PaymentAttemptRecord,
    outcome: 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount',
    now: Date,
  ): { payload: FakePaymentCallbackPayload; signature: string } {
    const payload: FakePaymentCallbackPayload = {
      providerReference: attempt.providerReference,
      providerTransactionId: `fake-txn-${attempt.id}`,
      status: outcome === 'tampered_amount' ? 'success' : outcome,
      amountRial: outcome === 'tampered_amount' ? attempt.amountRial + 1 : attempt.amountRial,
      currency: 'IRR',
      issuedAt: now.toISOString(),
      nonce: this.idFactory(),
    };
    return { payload, signature: this.signature(canonicalCallback(payload)) };
  }

  signForTest(payload: FakePaymentCallbackPayload): string {
    return this.signature(canonicalCallback(payload));
  }

  private signature(canonical: string): string {
    return createHmac('sha256', this.signingSecret).update(canonical).digest('hex');
  }
}
