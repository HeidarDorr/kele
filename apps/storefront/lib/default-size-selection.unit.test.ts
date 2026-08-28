import { describe, expect, it } from 'vitest';
import { firstOutfitSizeCode, firstSkuId } from './default-size-selection';

describe('detail-page default size selection', () => {
  it('selects the first Product SKU and Outfit size in API order', () => {
    expect(firstSkuId([{ id: 'sku-first' }, { id: 'sku-second' }])).toBe('sku-first');
    expect(firstOutfitSizeCode([{ code: 'S' }, { code: 'M' }])).toBe('S');
  });

  it('keeps empty products and outfits unselected', () => {
    expect(firstSkuId([])).toBeNull();
    expect(firstOutfitSizeCode([])).toBeNull();
  });
});
