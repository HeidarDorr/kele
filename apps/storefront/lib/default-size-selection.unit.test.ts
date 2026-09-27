import { describe, expect, it } from 'vitest';
import { firstSkuId, lowestPricedOutfitSizeCode } from './default-size-selection';

describe('detail-page default size selection', () => {
  it('selects the first Product SKU in API order', () => {
    expect(firstSkuId([{ id: 'sku-first' }, { id: 'sku-second' }])).toBe('sku-first');
  });

  it('selects the lowest-priced Outfit size independently of API order', () => {
    expect(
      lowestPricedOutfitSizeCode([
        { code: 'S', price: { amountRial: 22_000_000 } },
        { code: 'M', price: { amountRial: 18_000_000 } },
        { code: 'L', price: { amountRial: 24_000_000 } },
      ]),
    ).toBe('M');
  });

  it('keeps configured order as the tie-breaker for equally cheap Outfit sizes', () => {
    expect(
      lowestPricedOutfitSizeCode([
        { code: 'S', price: { amountRial: 18_000_000 } },
        { code: 'M', price: { amountRial: 18_000_000 } },
      ]),
    ).toBe('S');
  });

  it('keeps empty products and outfits unselected', () => {
    expect(firstSkuId([])).toBeNull();
    expect(lowestPricedOutfitSizeCode([])).toBeNull();
  });
});
