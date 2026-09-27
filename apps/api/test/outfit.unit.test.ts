import { describe, expect, it } from 'vitest';
import { OutfitService } from '../src/modules/outfit/application/outfit.service.js';
import {
  deriveOutfitAvailability,
  deriveOutfitStartingPrice,
  structuralOutfitErrors,
} from '../src/modules/outfit/domain/outfit.js';
import type { OutfitCatalogPort } from '../src/modules/catalog/application/outfit-catalog.contract.js';
import type { OutfitRepository } from '../src/modules/outfit/application/outfit.repository.js';
import type { OutfitRevisionRecord } from '../src/modules/outfit/domain/outfit.types.js';
import type { UnitOfWork } from '../src/shared/unit-of-work.js';

describe('Milestone 5 Outfit domain', () => {
  it('[OTF-021] derives the card price from the cheapest configured size', () => {
    expect(
      deriveOutfitStartingPrice([
        { amountRial: 48_000_000 },
        { amountRial: 45_000_000 },
        { amountRial: 51_000_000 },
      ]),
    ).toBe(45_000_000);
  });

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

  it('[OTF-001] keeps an incomplete draft in the admin list without requiring featured media', async () => {
    const incompleteDraft: OutfitRevisionRecord = {
      outfitId: 'outfit-draft',
      slug: 'draft-outfit',
      outfitStatus: 'draft',
      outfitVersion: 1,
      revisionId: 'revision-draft',
      revisionNumber: 1,
      revisionState: 'draft',
      revisionVersion: 1,
      name: 'Draft outfit',
      description: '',
      categoryIds: [],
      media: [],
      seo: { title: null, description: null },
      items: [],
      sizes: [],
      publishedAt: null,
      createdAt: new Date('2026-08-21T00:00:00.000Z'),
      updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    };
    const repository = {
      listAdmin: () => Promise.resolve([incompleteDraft]),
    } as unknown as OutfitRepository;
    const service = new OutfitService(repository, {} as OutfitCatalogPort, {} as UnitOfWork);

    await expect(service.listAdmin(null)).resolves.toEqual({
      items: [
        {
          id: 'outfit-draft',
          status: 'draft',
          version: 1,
          revisionId: 'revision-draft',
          revisionNumber: 1,
          revisionState: 'draft',
          publishedAt: null,
          name: 'Draft outfit',
          slug: 'draft-outfit',
          itemCount: 0,
          sizeCount: 0,
          mediaCount: 0,
          hasFeaturedMedia: false,
        },
      ],
      page: { nextCursor: null, hasMore: false },
    });
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
