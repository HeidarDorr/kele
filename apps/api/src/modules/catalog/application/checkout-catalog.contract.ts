import type { CartCatalogMedia } from './cart-catalog.contract.js';

export type CheckoutCatalogProduct = Readonly<{
  skuId: string;
  title: string;
  selection: string;
  skuCode: string;
  image: CartCatalogMedia | null;
  unitPriceRial: number;
  availableQuantity: number;
  purchasable: boolean;
}>;

export const CHECKOUT_CATALOG_PORT = Symbol('CHECKOUT_CATALOG_PORT');

export type CheckoutInventoryReservation = Readonly<{
  reservationId: string;
  checkoutSessionId: string;
  skuId: string;
  quantity: number;
}>;

export type CheckoutInventoryActor = Readonly<{
  actorId: string;
  correlationId: string;
}>;

export interface CheckoutCatalogPort {
  getProducts(skuIds: readonly string[]): Promise<ReadonlyMap<string, CheckoutCatalogProduct>>;
  lockProducts(skuIds: readonly string[]): Promise<ReadonlyMap<string, CheckoutCatalogProduct>>;
  reserve(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
  ): Promise<void>;
  release(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
    reason: 'expired' | 'cancelled',
  ): Promise<void>;
  consume(
    reservations: readonly CheckoutInventoryReservation[],
    actor: CheckoutInventoryActor,
    orderId: string,
  ): Promise<void>;
}
