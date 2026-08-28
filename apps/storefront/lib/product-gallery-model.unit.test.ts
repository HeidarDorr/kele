import { describe, expect, it } from 'vitest';
import type { MediaValue, ProductDetail } from './catalog-api';
import {
  gallerySwipeStep,
  initialProductGalleryItemKey,
  moveGalleryIndex,
  productGalleryItems,
} from './product-gallery-model';

function media(id: string, alt: string): MediaValue {
  return {
    id,
    url: `/media/${id}.webp`,
    width: 1000,
    height: 1400,
    alt,
    format: 'webp',
    group: 'product_images',
    colorHex: null,
    focalPoint: { x: 0.5, y: 0.5 },
  };
}

type ProductVariant = ProductDetail['variants'][number];

describe('Product detail gallery', () => {
  it('keeps every color gallery in variant and media order with assignment-safe keys', () => {
    const shared = media('shared-media', 'تصویر مشترک');
    const variants: ProductVariant[] = [
      {
        id: 'variant-beige',
        name: 'بژ',
        gallery: [media('beige-front', 'نمای روبه‌رو بژ'), shared],
        skus: [],
      },
      {
        id: 'variant-blue',
        name: 'آبی',
        gallery: [shared, media('blue-back', 'نمای پشت آبی')],
        skus: [],
      },
    ];

    const items = productGalleryItems(variants);

    expect(items.map((item) => `${item.groupLabel ?? 'بدون‌رنگ'}:${item.media.id}`)).toEqual([
      'بژ:beige-front',
      'بژ:shared-media',
      'آبی:shared-media',
      'آبی:blue-back',
    ]);
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
    expect(items.map((item) => item.startsGroup)).toEqual([true, false, true, false]);
    expect(initialProductGalleryItemKey(items, 'variant-blue', 'shared-media')).toBe(
      'variant-blue:shared-media:0',
    );
  });

  it('maps horizontal touch gestures to RTL previous/next movement and ignores scrolling', () => {
    expect(gallerySwipeStep({ x: 80, y: 200 }, { x: 220, y: 205 }, 'rtl')).toBe(1);
    expect(gallerySwipeStep({ x: 220, y: 200 }, { x: 80, y: 205 }, 'rtl')).toBe(-1);
    expect(gallerySwipeStep({ x: 100, y: 100 }, { x: 110, y: 190 }, 'rtl')).toBe(0);
    expect(gallerySwipeStep({ x: 100, y: 100 }, { x: 125, y: 102 }, 'rtl')).toBe(0);
    expect(moveGalleryIndex(0, 4, -1)).toBe(3);
    expect(moveGalleryIndex(3, 4, 1)).toBe(0);
  });
});
