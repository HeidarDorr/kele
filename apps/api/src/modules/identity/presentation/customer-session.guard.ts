import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CustomerSessionValue } from '../domain/identity.types.js';
import { IdentityService } from '../application/identity.service.js';
import { CookieSecurity, CSRF_COOKIE, SESSION_COOKIE } from '../infrastructure/cookie-security.js';

export interface CustomerRequest extends Request {
  customerSession: CustomerSessionValue;
  rawSessionToken: string;
}

@Injectable()
export class CustomerSessionGuard implements CanActivate {
  constructor(
    private readonly identity: IdentityService,
    private readonly cookies: CookieSecurity,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    const rawSessionToken = this.cookies.read(request, SESSION_COOKIE);
    const session = await this.identity.resolveSession(rawSessionToken);
    if (session === null || rawSessionToken === null) {
      throw new ApplicationError('unauthorized', 'SESSION_REQUIRED', 'Authentication is required.');
    }
    request.customerSession = session;
    request.rawSessionToken = rawSessionToken;
    return true;
  }
}

@Injectable()
export class CustomerCsrfGuard implements CanActivate {
  constructor(
    private readonly identity: IdentityService,
    private readonly cookies: CookieSecurity,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? null : (header ?? null);
    const cookieToken = this.cookies.read(request, CSRF_COOKIE);
    if (headerToken === null || cookieToken === null || headerToken !== cookieToken) {
      throw new ApplicationError('forbidden', 'CSRF_VALIDATION_FAILED', 'CSRF validation failed.');
    }
    this.identity.assertCsrf(request.customerSession, headerToken);
    return true;
  }
}
