import type { CartCatalogProduct } from '../../catalog/application/cart-catalog.contract.js';
import type { OutfitCartSelection } from './outfit-cart.contract.js';
import type { CartRecord, MergeInstruction } from '../domain/cart.types.js';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartRepository {
  createAnonymousCart(): Promise<CartRecord>;
  getOrCreateCustomerCart(customerId: string): Promise<CartRecord>;
  getActiveCart(id: string): Promise<CartRecord>;
  getMergedCustomerCart(guestCartId: string, customerCartId: string): Promise<CartRecord | null>;
  addProduct(
    cartId: string,
    expectedVersion: number,
    product: CartCatalogProduct,
    quantity: number,
  ): Promise<CartRecord>;
  addProducts(
    cartId: string,
    expectedVersion: number,
    selections: ReadonlyArray<{ product: CartCatalogProduct; quantity: number }>,
  ): Promise<CartRecord>;
  addOutfit(
    cartId: string,
    expectedVersion: number,
    outfit: OutfitCartSelection,
    quantity: number,
  ): Promise<CartRecord>;
  updateLine(
    cartId: string,
    lineId: string,
    expectedVersion: number,
    quantity: number,
    status: 'available' | 'unavailable' | 'requires_review',
    unitPriceRial: number,
  ): Promise<CartRecord>;
  removeLine(cartId: string, lineId: string, expectedVersion: number): Promise<void>;
  clear(cartId: string, expectedVersion: number): Promise<void>;
  applyMerge(
    customerCartId: string,
    guestCartId: string,
    instructions: readonly MergeInstruction[],
  ): Promise<{ cart: CartRecord; mergePerformed: boolean }>;
}
