import { describe, expect, it } from 'vitest';
import { ensureInternalColorCodes } from './product-variant-code';

describe('کد داخلی رنگ محصول', () => {
  it('کد رنگ موجود را هنگام ویرایش بدون تغییر نگه می‌دارد', () => {
    expect(
      ensureInternalColorCodes([
        {
          id: '82000000-0000-4000-8000-000000000001',
          name: 'زغالی',
          normalizedColorCode: 'charcoal',
        },
      ]),
    ).toEqual([
      {
        id: '82000000-0000-4000-8000-000000000001',
        name: 'زغالی',
        normalizedColorCode: 'charcoal',
      },
    ]);
  });

  it('برای رنگ جدید کد غیرقابل‌ویرایش، معتبر و یکتا تولید می‌کند', () => {
    const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
    const result = ensureInternalColorCodes(
      [{ name: 'لجنی', normalizedColorCode: 'admin-value-is-ignored' }, { name: 'شیری' }],
      () => ids.shift() ?? '33333333-3333-4333-8333-333333333333',
    );

    expect(result.map((variant) => variant.normalizedColorCode)).toEqual([
      'color-11111111111141118111111111111111',
      'color-22222222222242228222222222222222',
    ]);
    for (const variant of result) {
      expect(variant.normalizedColorCode).toMatch(/^[a-z0-9][a-z0-9_-]{0,39}$/u);
    }
  });
});
