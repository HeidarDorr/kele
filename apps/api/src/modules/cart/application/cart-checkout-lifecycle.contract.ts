export const CART_CHECKOUT_LIFECYCLE = Symbol('CART_CHECKOUT_LIFECYCLE');

export interface CartCheckoutLifecycle {
  cancelOpenCheckoutForCart(cartId: string, correlationId: string): Promise<void>;
}
