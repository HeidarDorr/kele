import type { MediaValue, ProductDetail } from './catalog-api';

type ProductVariantGallery = Pick<ProductDetail['variants'][number], 'id' | 'name' | 'gallery'>;

export type ProductGalleryItem = {
  key: string;
  media: MediaValue;
  groupId?: string;
  groupLabel?: string;
  startsGroup: boolean;
};

export type GalleryPoint = {
  x: number;
  y: number;
};

export function productGalleryItems(variants: ProductVariantGallery[]): ProductGalleryItem[] {
  return variants.flatMap((variant) =>
    variant.gallery.map((media, mediaIndex) => ({
      key: `${variant.id}:${media.id}:${String(mediaIndex)}`,
      media,
      groupId: variant.id,
      groupLabel: variant.name,
      startsGroup: mediaIndex === 0,
    })),
  );
}

export function standaloneGalleryItems(media: MediaValue[]): ProductGalleryItem[] {
  return media.map((item, index) => ({
    key: `standalone:${item.id}:${String(index)}`,
    media: item,
    startsGroup: index === 0,
  }));
}

export function initialProductGalleryItemKey(
  items: ProductGalleryItem[],
  variantId: string,
  preferredMediaId: string,
): string | undefined {
  return (
    items.find((item) => item.groupId === variantId && item.media.id === preferredMediaId)?.key ??
    items.find((item) => item.groupId === variantId)?.key
  );
}

export function moveGalleryIndex(currentIndex: number, itemCount: number, step: -1 | 1): number {
  if (itemCount <= 0) return 0;
  return (currentIndex + step + itemCount) % itemCount;
}

export function gallerySwipeStep(
  start: GalleryPoint,
  end: GalleryPoint,
  direction: 'ltr' | 'rtl',
  minimumDistance = 40,
): -1 | 0 | 1 {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const horizontalDistance = Math.abs(deltaX);

  if (horizontalDistance < minimumDistance || horizontalDistance <= Math.abs(deltaY)) return 0;
  if (direction === 'rtl') return deltaX > 0 ? 1 : -1;
  return deltaX < 0 ? 1 : -1;
}
