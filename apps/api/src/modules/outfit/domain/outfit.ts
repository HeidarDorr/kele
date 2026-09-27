import type { OutfitComponentResolution, OutfitValidationError } from './outfit.types.js';

export function deriveOutfitStartingPrice(
  sizes: readonly Readonly<{ amountRial: number }>[],
): number {
  return Math.min(...sizes.map((size) => size.amountRial));
}

export function deriveOutfitAvailability(
  components: readonly Pick<
    OutfitComponentResolution,
    'skuId' | 'quantityPerOutfit' | 'availableQuantity'
  >[],
): number {
  if (components.length === 0) return 0;
  const aggregated = new Map<string, { required: number; available: number }>();
  for (const component of components) {
    const current = aggregated.get(component.skuId);
    aggregated.set(component.skuId, {
      required: (current?.required ?? 0) + component.quantityPerOutfit,
      available: Math.min(
        current?.available ?? component.availableQuantity,
        component.availableQuantity,
      ),
    });
  }
  return Math.min(
    ...[...aggregated.values()].map(({ required, available }) =>
      Math.floor(Math.max(0, available) / required),
    ),
  );
}

export function structuralOutfitErrors(input: {
  categoryIds: readonly string[];
  mediaIds: readonly string[];
  featuredMediaId: string;
  items: ReadonlyArray<{ id: string; quantity: number; displayOrder: number }>;
  sizes: ReadonlyArray<{
    code: string;
    amountRial: number;
    displayOrder: number;
    components: ReadonlyArray<{
      outfitItemId: string;
      quantity: number;
      displayOrder: number;
    }>;
  }>;
}): OutfitValidationError[] {
  const errors: OutfitValidationError[] = [];
  if (input.categoryIds.length === 0) {
    errors.push({ path: 'categoryIds', ruleId: 'PUB-009', message: 'Outfit needs a category.' });
  }
  if (input.mediaIds.length === 0 || !input.mediaIds.includes(input.featuredMediaId)) {
    errors.push({
      path: 'featuredMediaId',
      ruleId: 'PUB-009',
      message: 'Outfit needs a featured editorial image.',
    });
  }
  if (input.items.length === 0) {
    errors.push({ path: 'items', ruleId: 'OTF-001', message: 'Outfit needs at least one item.' });
  }
  if (input.sizes.length === 0) {
    errors.push({ path: 'sizes', ruleId: 'OTF-014', message: 'Outfit needs a size mapping.' });
  }
  const itemIds = new Set(input.items.map((item) => item.id));
  if (itemIds.size !== input.items.length) {
    errors.push({ path: 'items', ruleId: 'OTF-014', message: 'Outfit item IDs must be unique.' });
  }
  for (const [sizeIndex, size] of input.sizes.entries()) {
    if (!Number.isSafeInteger(size.amountRial) || size.amountRial <= 0) {
      errors.push({
        path: `sizes.${String(sizeIndex)}.amountRial`,
        ruleId: 'OTF-004',
        message: 'Outfit size price must be a positive integer IRR amount.',
      });
    }
    const mapped = new Map<string, number>();
    for (const [componentIndex, component] of size.components.entries()) {
      if (!itemIds.has(component.outfitItemId)) {
        errors.push({
          path: `sizes.${String(sizeIndex)}.components.${String(componentIndex)}.outfitItemId`,
          ruleId: 'OTF-014',
          message: 'Component must reference an Outfit item in this revision.',
        });
      }
      mapped.set(component.outfitItemId, (mapped.get(component.outfitItemId) ?? 0) + 1);
    }
    for (const [itemIndex, item] of input.items.entries()) {
      if (mapped.get(item.id) !== 1) {
        errors.push({
          path: `sizes.${String(sizeIndex)}.components`,
          ruleId: 'OTF-014',
          message: `Size must map Outfit item ${String(itemIndex + 1)} exactly once.`,
        });
      }
    }
  }
  return errors;
}
