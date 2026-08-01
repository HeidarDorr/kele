import { describe, expect, it } from 'vitest';
import {
  createOtpVerifier,
  otpMatches,
} from '../src/modules/identity/application/identity-crypto.js';
import { planDeterministicMerge } from '../src/modules/cart/domain/cart-merge.js';
import type { CartLineRecord } from '../src/modules/cart/domain/cart.types.js';

function productLine(input: {
  id: string;
  cartId: string;
  skuId: string;
  quantity: number;
  createdAt?: Date;
}): CartLineRecord {
  return {
    id: input.id,
    cartId: input.cartId,
    kind: 'product',
    skuId: input.skuId,
    outfitRevisionId: null,
    outfitSize: null,
    titleSnapshot: 'محصول آزمون',
    selectionSnapshot: 'مشکی / M',
    skuCodeSnapshot: 'SKU-TEST',
    imageSnapshot: null,
    quantity: input.quantity,
    status: 'available',
    unitPriceRial: 1_000_000,
    createdAt: input.createdAt ?? new Date('2026-08-01T00:00:00Z'),
  };
}

describe('Milestone 3 identity and cart domain', () => {
  it('[CUS-010] stores and compares a salted OTP verifier without retaining the code', () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const verifier = createOtpVerifier(
      '418205',
      salt,
      'test-pepper-with-at-least-thirty-two-characters',
    );
    expect(verifier).not.toContain('418205');
    expect(
      otpMatches('418205', salt, 'test-pepper-with-at-least-thirty-two-characters', verifier),
    ).toBe(true);
    expect(
      otpMatches('418206', salt, 'test-pepper-with-at-least-thirty-two-characters', verifier),
    ).toBe(false);
  });

  it('[CRT-013][CRT-015][CRT-016] combines a Product SKU once and caps it to current inventory', () => {
    const customer = productLine({
      id: 'customer-line',
      cartId: 'customer',
      skuId: 'sku-1',
      quantity: 3,
    });
    const guest = productLine({ id: 'guest-line', cartId: 'guest', skuId: 'sku-1', quantity: 4 });
    expect(
      planDeterministicMerge([customer], [guest], {
        productAvailability: new Map([['sku-1', { purchasable: true, available: 5 }]]),
        outfitPurchasability: new Map(),
      }),
    ).toEqual([
      {
        kind: 'combine_product',
        customerLineId: 'customer-line',
        guestLineId: 'guest-line',
        quantity: 5,
        status: 'available',
        notice: 'quantity_reduced_to_inventory',
        requestedQuantity: 7,
      },
    ]);
  });

  it('[CRT-017] retains the positive requested quantity when a matching SKU is unavailable', () => {
    const guest = productLine({ id: 'guest-line', cartId: 'guest', skuId: 'sku-1', quantity: 2 });
    expect(
      planDeterministicMerge([], [guest], {
        productAvailability: new Map([['sku-1', { purchasable: false, available: 0 }]]),
        outfitPurchasability: new Map(),
      }),
    ).toEqual([
      expect.objectContaining({
        kind: 'move_product',
        quantity: 2,
        status: 'unavailable',
        notice: 'sku_unavailable',
      }),
    ]);
  });

  it('[CRT-018] preserves an immutable Outfit Revision as a separate requires-review line', () => {
    const outfit: CartLineRecord = {
      id: 'outfit-line',
      cartId: 'guest',
      kind: 'outfit',
      skuId: null,
      outfitRevisionId: 'revision-1',
      outfitSize: 'M',
      titleSnapshot: 'استایل آزمون',
      selectionSnapshot: 'M',
      skuCodeSnapshot: null,
      imageSnapshot: null,
      quantity: 1,
      status: 'available',
      unitPriceRial: 5_000_000,
      createdAt: new Date('2026-08-01T00:00:00Z'),
    };
    expect(
      planDeterministicMerge([], [outfit], {
        productAvailability: new Map(),
        outfitPurchasability: new Map([['revision-1:M', false]]),
      }),
    ).toEqual([
      {
        kind: 'move_outfit',
        guestLineId: 'outfit-line',
        status: 'requires_review',
        notice: 'outfit_revision_requires_review',
      },
    ]);
  });
});
