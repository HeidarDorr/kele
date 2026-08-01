export const CART_CATALOG_READER = Symbol('CART_CATALOG_READER');

export type CartCatalogMedia = Readonly<{
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: Readonly<{ x: number; y: number }>;
}>;

export type CartCatalogProduct = Readonly<{
  skuId: string;
  title: string;
  selection: string;
  skuCode: string;
  unitPriceRial: number;
  availableQuantity: number;
  purchasable: boolean;
  image: CartCatalogMedia | null;
}>;

export interface CartCatalogReader {
  getProductForCart(skuId: string): Promise<CartCatalogProduct | null>;
}
