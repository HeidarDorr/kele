import { describe, expect, it } from 'vitest';
import {
  deriveOutfitAvailability,
  structuralOutfitErrors,
} from '../src/modules/outfit/domain/outfit.js';

describe('Milestone 5 Outfit domain', () => {
  it('[OTF-007][OTF-015] derives quantity from exact weighted SKU demand without synthetic stock', () => {
    expect(
      deriveOutfitAvailability([
        { skuId: 'jacket-m', quantityPerOutfit: 1, availableQuantity: 7 },
        { skuId: 'trouser-42', quantityPerOutfit: 2, availableQuantity: 5 },
      ]),
    ).toBe(2);
  });

  it('[OTF-014][OTF-015] aggregates a shared SKU before deriving availability', () => {
    expect(
      deriveOutfitAvailability([
        { skuId: 'shared-sku', quantityPerOutfit: 1, availableQuantity: 5 },
        { skuId: 'shared-sku', quantityPerOutfit: 2, availableQuantity: 5 },
      ]),
    ).toBe(1);
    expect(deriveOutfitAvailability([])).toBe(0);
  });

  it('[OTF-001][OTF-004][OTF-014][PUB-009] rejects incomplete mappings before publication', () => {
    const errors = structuralOutfitErrors({
      categoryIds: [],
      mediaIds: [],
      featuredMediaId: 'missing-media',
      items: [
        { id: 'item-a', quantity: 1, displayOrder: 0 },
        { id: 'item-b', quantity: 1, displayOrder: 1 },
      ],
      sizes: [
        {
          code: 'M',
          amountRial: 0,
          displayOrder: 0,
          components: [
            { outfitItemId: 'item-a', quantity: 1, displayOrder: 0 },
            { outfitItemId: 'outside-revision', quantity: 1, displayOrder: 1 },
          ],
        },
      ],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'categoryIds', ruleId: 'PUB-009' }),
        expect.objectContaining({ path: 'featuredMediaId', ruleId: 'PUB-009' }),
        expect.objectContaining({ path: 'sizes.0.amountRial', ruleId: 'OTF-004' }),
        expect.objectContaining({
          path: 'sizes.0.components.1.outfitItemId',
          ruleId: 'OTF-014',
        }),
        expect.objectContaining({ path: 'sizes.0.components', ruleId: 'OTF-014' }),
      ]),
    );
  });
});
