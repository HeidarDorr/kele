import type { CartCatalogMedia } from '../../catalog/application/cart-catalog.contract.js';

export type CheckoutCartLine = Readonly<{
  id: string;
  kind: 'product' | 'outfit';
  skuId: string | null;
  outfitRevisionId: string | null;
  outfitSize: string | null;
  titleSnapshot: string;
  selectionSnapshot: string;
  skuCodeSnapshot: string | null;
  imageSnapshot: CartCatalogMedia | null;
  quantity: number;
  status: 'available' | 'unavailable' | 'requires_review';
}>;

export type CheckoutCart = Readonly<{
  id: string;
  customerId: string;
  version: number;
  lines: readonly CheckoutCartLine[];
}>;

export const CHECKOUT_CART_PORT = Symbol('CHECKOUT_CART_PORT');

export interface CheckoutCartPort {
  getOwnedCart(customerId: string, cartId: string): Promise<CheckoutCart>;
  lockOwnedCart(customerId: string, cartId: string): Promise<CheckoutCart>;
  completePurchasedLines(
    customerId: string,
    cartId: string,
    purchases: readonly Readonly<{ cartLineId: string; quantity: number }>[],
  ): Promise<void>;
}
