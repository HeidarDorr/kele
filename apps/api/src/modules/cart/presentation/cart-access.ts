import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApplicationError } from '../../../shared/application-error.js';
import { IdentityService } from '../../identity/application/identity.service.js';
import {
  CART_COOKIE,
  CookieSecurity,
  CSRF_COOKIE,
  SESSION_COOKIE,
} from '../../identity/infrastructure/cookie-security.js';
import type { CartView } from '../domain/cart.types.js';
import { CartService } from '../application/cart.service.js';

export type CartAccess = Readonly<{
  cart: CartView;
  cartId: string;
  authenticated: boolean;
}>;

@Injectable()
export class CartAccessResolver {
  constructor(
    private readonly identity: IdentityService,
    private readonly carts: CartService,
    private readonly cookies: CookieSecurity,
  ) {}

  async resolve(request: Request, response: Response, mutation: boolean): Promise<CartAccess> {
    const sessionToken = this.cookies.read(request, SESSION_COOKIE);
    const session = await this.identity.resolveSession(sessionToken);
    if (session !== null) {
      if (mutation) {
        const csrf = this.assertHeaderCookieMatch(request);
        this.identity.assertCsrf(session, csrf);
      }
      const cart = await this.carts.getCustomerCart(session.customer.id);
      return { cart, cartId: cart.id, authenticated: true };
    }

    const signedCart = this.cookies.read(request, CART_COOKIE);
    const cartId = this.cookies.verify(signedCart);
    if (mutation) {
      if (cartId === null) {
        throw new ApplicationError(
          'unauthorized',
          'CART_COOKIE_REQUIRED',
          'Cart cookie is required.',
        );
      }
      this.assertAnonymousCsrf(request);
      const cart = await this.carts.getCart(cartId);
      return { cart, cartId, authenticated: false };
    }

    if (cartId !== null) {
      try {
        const cart = await this.carts.getCart(cartId);
        this.cookies.ensureAnonymousCsrf(request, response);
        return { cart, cartId, authenticated: false };
      } catch (error: unknown) {
        if (!(error instanceof ApplicationError) || error.code !== 'CART_NOT_FOUND') throw error;
      }
    }
    const cart = await this.carts.createAnonymousCart();
    this.cookies.setCart(response, cart.id);
    this.cookies.ensureAnonymousCsrf(request, response);
    return { cart, cartId: cart.id, authenticated: false };
  }

  assertAnonymousCsrf(request: Request): void {
    const token = this.assertHeaderCookieMatch(request);
    if (this.cookies.verify(token) === null) {
      throw new ApplicationError('forbidden', 'CSRF_VALIDATION_FAILED', 'CSRF validation failed.');
    }
  }

  private assertHeaderCookieMatch(request: Request): string {
    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? null : (header ?? null);
    const cookieToken = this.cookies.read(request, CSRF_COOKIE);
    if (headerToken === null || cookieToken === null || headerToken !== cookieToken) {
      throw new ApplicationError('forbidden', 'CSRF_VALIDATION_FAILED', 'CSRF validation failed.');
    }
    return headerToken;
  }
}
