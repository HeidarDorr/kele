import type { NextFunction, Request, Response } from 'express';

export class SecurityHeadersMiddleware {
  constructor(private readonly production: boolean) {}

  use(_request: Request, response: Response, next: NextFunction): void {
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(), payment=()',
    );
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Cache-Control', 'no-store');
    if (this.production) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  }
}
