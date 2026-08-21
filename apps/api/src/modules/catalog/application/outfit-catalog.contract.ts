import type { CartCatalogMedia } from './cart-catalog.contract.js';

export const OUTFIT_CATALOG_PORT = Symbol('OUTFIT_CATALOG_PORT');

export type OutfitCatalogReferences = Readonly<{
  categories: ReadonlyMap<
    string,
    Readonly<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      displayOrder: number;
      published: boolean;
    }>
  >;
  media: ReadonlyMap<string, Readonly<{ value: CartCatalogMedia; archived: boolean }>>;
  products: ReadonlyMap<
    string,
    Readonly<{ id: string; slug: string; name: string; published: boolean }>
  >;
  variants: ReadonlyMap<
    string,
    Readonly<{
      id: string;
      productId: string;
      name: string;
      published: boolean;
      featuredMedia: CartCatalogMedia | null;
    }>
  >;
  skus: ReadonlyMap<
    string,
    Readonly<{
      id: string;
      colorVariantId: string;
      code: string;
      sizeLabel: string;
      published: boolean;
      hasInventory: boolean;
      unitPriceRial: number | null;
      availableQuantity: number;
    }>
  >;
}>;

export type OutfitCatalogReferenceQuery = Readonly<{
  categoryIds: readonly string[];
  mediaIds: readonly string[];
  productIds: readonly string[];
  variantIds: readonly string[];
  skuIds: readonly string[];
  lockInventory?: boolean;
}>;

export interface OutfitCatalogPort {
  getOutfitReferences(query: OutfitCatalogReferenceQuery): Promise<OutfitCatalogReferences>;
}
