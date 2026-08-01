import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { randomToken } from '../application/identity-crypto.js';

export const SESSION_COOKIE = 'kele_session';
export const CART_COOKIE = 'kele_cart';
export const DEVICE_COOKIE = 'kele_device';
export const CSRF_COOKIE = 'kele_csrf';

const DAY_MS = 24 * 60 * 60 * 1000;

export class CookieSecurity {
  constructor(
    private readonly secret: string,
    private readonly secure: boolean,
  ) {}

  read(request: Request, name: string): string | null {
    const header = request.headers.cookie;
    if (header === undefined) return null;
    for (const item of header.split(';')) {
      const separator = item.indexOf('=');
      if (separator < 0) continue;
      const key = item.slice(0, separator).trim();
      if (key !== name) continue;
      try {
        return decodeURIComponent(item.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  sign(payload: string): string {
    return `${payload}.${createHmac('sha256', this.secret).update(payload).digest('base64url')}`;
  }

  verify(signed: string | null): string | null {
    if (signed === null) return null;
    const separator = signed.lastIndexOf('.');
    if (separator <= 0) return null;
    const payload = signed.slice(0, separator);
    const supplied = Buffer.from(signed.slice(separator + 1));
    const expected = Buffer.from(
      createHmac('sha256', this.secret).update(payload).digest('base64url'),
    );
    return supplied.length === expected.length && timingSafeEqual(supplied, expected)
      ? payload
      : null;
  }

  ensureDevice(request: Request, response: Response): string {
    const existing = this.verify(this.read(request, DEVICE_COOKIE));
    if (existing !== null && existing.length >= 32) return existing;
    const deviceId = randomToken();
    this.set(response, DEVICE_COOKIE, this.sign(deviceId), true, 365 * DAY_MS);
    return deviceId;
  }

  ensureAnonymousCsrf(request: Request, response: Response): string {
    const existing = this.read(request, CSRF_COOKIE);
    if (this.verify(existing) !== null) return existing as string;
    const token = this.sign(randomToken());
    this.set(response, CSRF_COOKIE, token, false, 30 * DAY_MS);
    return token;
  }

  setSession(response: Response, token: string): void {
    this.set(response, SESSION_COOKIE, token, true, 7 * DAY_MS);
  }

  clearSession(response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.options(true));
  }

  setCart(response: Response, cartId: string): void {
    this.set(response, CART_COOKIE, this.sign(cartId), true, 30 * DAY_MS);
  }

  clearCart(response: Response): void {
    response.clearCookie(CART_COOKIE, this.options(true));
  }

  setSessionCsrf(response: Response, token: string): void {
    this.set(response, CSRF_COOKIE, token, false, 7 * DAY_MS);
  }

  clearCsrf(response: Response): void {
    response.clearCookie(CSRF_COOKIE, this.options(false));
  }

  private set(
    response: Response,
    name: string,
    value: string,
    httpOnly: boolean,
    maxAge: number,
  ): void {
    response.cookie(name, value, { ...this.options(httpOnly), maxAge });
  }

  private options(httpOnly: boolean) {
    return {
      httpOnly,
      secure: this.secure,
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
