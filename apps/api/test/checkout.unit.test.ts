import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  normalizeAddressZone,
  quoteShippingOptions,
  requireEligibleShippingOption,
} from '../src/modules/checkout/domain/shipping.js';
import type {
  AddressSnapshot,
  FakePaymentCallbackPayload,
  PaymentAttemptRecord,
  ShippingSettingsRecord,
} from '../src/modules/checkout/domain/checkout.types.js';
import { FakePaymentAdapter } from '../src/modules/foundation/infrastructure/fake-payment.adapter.js';

const settings: ShippingSettingsRecord = {
  id: randomUUID(),
  version: 7,
  freeShippingThresholdRial: 50_000_000,
  eligibilityBasis: 'order_subtotal',
  effectiveAt: new Date('2026-08-02T00:00:00.000Z'),
  reason: 'test fixture',
  methods: [
    {
      code: 'iran_post',
      name: 'پست ایران',
      fixedPriceRial: 800_000,
      enabled: true,
      displayOrder: 0,
    },
    {
      code: 'tipax',
      name: 'تیپاکس',
      fixedPriceRial: 1_200_000,
      enabled: false,
      displayOrder: 1,
    },
    {
      code: 'tehran_local_courier',
      name: 'پیک محلی تهران',
      fixedPriceRial: 1_500_000,
      enabled: true,
      displayOrder: 2,
    },
  ],
};

function address(province: string, city: string): AddressSnapshot {
  const source = {
    recipientName: 'کاربر آزمون',
    recipientMobile: '+989121234567',
    province,
    city,
    addressLine: 'نشانی آزمون، پلاک ۱',
    postalCode: '1234567890',
  };
  return { ...source, normalizedZone: normalizeAddressZone(source) };
}

describe('Milestone 4 shipping and payment boundaries', () => {
  it('[SHP-001][SHP-003][SHP-004] uses only the immutable order subtotal at the exact free-shipping boundary', () => {
    const below = quoteShippingOptions(settings, address('تهران', 'تهران'), 49_999_999);
    const exact = quoteShippingOptions(settings, address('تهران', 'تهران'), 50_000_000);

    expect(below.find((option) => option.method === 'iran_post')).toMatchObject({
      quotedPriceRial: 800_000,
      eligibilitySubtotalRial: 49_999_999,
      freeShippingApplied: false,
    });
    expect(exact.find((option) => option.method === 'iran_post')).toMatchObject({
      quotedPriceRial: 0,
      eligibilitySubtotalRial: 50_000_000,
      freeShippingApplied: true,
    });
  });

  it('[SHP-002] normalizes Persian/Arabic Tehran safely and rejects local courier elsewhere', () => {
    expect(address('تِهران', 'تهران').normalizedZone).toBe('tehran');
    expect(address('تهران', 'تهران‌').normalizedZone).toBe('tehran');
    expect(address('البرز', 'کرج').normalizedZone).toBeNull();

    const outside = quoteShippingOptions(settings, address('البرز', 'کرج'), 1_000_000);
    expect(outside.find((option) => option.method === 'tehran_local_courier')).toMatchObject({
      eligible: false,
      ineligibilityCode: 'LOCAL_COURIER_OUTSIDE_TEHRAN',
    });
    expect(() => requireEligibleShippingOption(outside, 'tehran_local_courier')).toThrowError(
      expect.objectContaining({ code: 'LOCAL_COURIER_OUTSIDE_TEHRAN' }),
    );
    expect(outside.find((option) => option.method === 'tipax')).toMatchObject({
      eligible: false,
      ineligibilityCode: 'SHIPPING_METHOD_DISABLED',
    });
  });

  it('[PAY-002][PAY-005] verifies HMAC, timestamp freshness and payload integrity', async () => {
    const adapter = new FakePaymentAdapter('integration-fake-signing-secret-000001');
    const now = new Date('2026-08-02T10:00:00.000Z');
    const attempt: PaymentAttemptRecord = {
      id: randomUUID(),
      checkoutSessionId: randomUUID(),
      customerId: randomUUID(),
      provider: 'fake',
      providerReference: 'fake-reference',
      providerTransactionId: null,
      status: 'created',
      amountRial: 12_000_000,
      redirectUrl: null,
      requestHash: 'request-hash',
      createdAt: now,
      orderNumber: null,
      reconciliationReason: null,
    };
    const simulated = adapter.simulateCallback(attempt, 'success', now);
    await expect(adapter.verifyCallback({ ...simulated, now })).resolves.toMatchObject({
      provider: 'fake',
      amountRial: 12_000_000,
    });

    const forged: FakePaymentCallbackPayload = {
      ...simulated.payload,
      amountRial: simulated.payload.amountRial + 1,
    };
    expect(() =>
      adapter.verifyCallback({ signature: simulated.signature, payload: forged, now }),
    ).toThrowError(expect.objectContaining({ code: 'PAYMENT_CALLBACK_UNVERIFIED' }));

    const stale = { ...simulated.payload, issuedAt: '2026-08-02T09:54:59.999Z' };
    expect(() =>
      adapter.verifyCallback({ signature: adapter.signForTest(stale), payload: stale, now }),
    ).toThrowError(expect.objectContaining({ code: 'PAYMENT_CALLBACK_STALE' }));
  });
});
