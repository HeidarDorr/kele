import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AdministratorIdentityService } from '../src/modules/identity/application/administrator-identity.service.js';
import { sha256 } from '../src/modules/identity/application/identity-crypto.js';

let AdminSessionGuard: (typeof import('../src/modules/catalog/presentation/admin-session.guard.js'))['AdminSessionGuard'];

const sessionToken = 'administrator-session-token-with-more-than-thirty-two-characters';
const csrfToken = 'administrator-csrf-token-with-more-than-thirty-two-characters';

beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://kele:kele@localhost:5432/kele?schema=public',
    STORAGE_ENDPOINT: 'http://localhost:9000',
    STORAGE_REGION: 'us-east-1',
    STORAGE_BUCKET: 'kele-test',
    STORAGE_ACCESS_KEY: 'test',
    STORAGE_SECRET_KEY: 'test',
    PAYMENT_PROVIDER: 'fake',
    SMS_PROVIDER: 'fake',
    API_BASE_URL: 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3001/api/v1',
    ADMIN_SESSION_PROVIDER: 'postgres_otp',
    ADMIN_SESSION_SIGNING_SECRET: 'test-admin-session-signing-secret-00001',
    ADMIN_OTP_VERIFIER_PEPPER: 'test-admin-otp-verifier-pepper-000001',
  });
  ({ AdminSessionGuard } =
    await import('../src/modules/catalog/presentation/admin-session.guard.js'));
});

function context(input: {
  method?: string;
  cookie?: string;
  csrfHeader?: string;
  requiredRoles?: readonly string[];
}) {
  const request: {
    method: string;
    headers: { cookie?: string; 'x-csrf-token'?: string };
    catalogActor?: unknown;
  } = { method: input.method ?? 'GET', headers: {} };
  if (input.cookie !== undefined) request.headers.cookie = input.cookie;
  if (input.csrfHeader !== undefined) request.headers['x-csrf-token'] = input.csrfHeader;
  const execution = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
    getHandler: () => context,
    getClass: () => context,
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: () => input.requiredRoles,
  } as unknown as Reflector;
  return { execution, reflector, request };
}

function identity(role: 'super_admin' | 'inventory_admin'): AdministratorIdentityService {
  return {
    resolveSession: (token: string | null) =>
      Promise.resolve(
        token === sessionToken
          ? {
              id: '00000000-0000-4000-8000-000000000001',
              administrator: {
                id: '00000000-0000-4000-8000-000000000002',
                displayName: 'Administrator',
                role,
                enabled: true,
                version: 1,
              },
              csrfHash: sha256(csrfToken),
              idleExpiresAt: new Date('2026-08-08T10:30:00.000Z'),
              absoluteExpiresAt: new Date('2026-08-08T22:00:00.000Z'),
            }
          : null,
      ),
  } as AdministratorIdentityService;
}

describe('PostgreSQL administrator session guard', () => {
  it('denies a missing opaque administrator session', async () => {
    const fixture = context({ requiredRoles: ['super_admin'] });
    await expect(
      new AdminSessionGuard(fixture.reflector, identity('super_admin')).canActivate(
        fixture.execution,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('denies a lower role on a Super Admin route', async () => {
    const fixture = context({
      cookie: `kele_admin_session=${sessionToken}`,
      requiredRoles: ['super_admin'],
    });
    await expect(
      new AdminSessionGuard(fixture.reflector, identity('inventory_admin')).canActivate(
        fixture.execution,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies a state-changing request without a matching double-submit token', async () => {
    const fixture = context({
      method: 'PATCH',
      cookie: `kele_admin_session=${sessionToken}; kele_admin_csrf=${csrfToken}`,
      requiredRoles: ['super_admin'],
    });
    await expect(
      new AdminSessionGuard(fixture.reflector, identity('super_admin')).canActivate(
        fixture.execution,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts the persisted role and matching CSRF token without exposing credentials', async () => {
    const fixture = context({
      method: 'PATCH',
      cookie: `kele_admin_session=${sessionToken}; kele_admin_csrf=${csrfToken}`,
      csrfHeader: csrfToken,
      requiredRoles: ['super_admin'],
    });
    await expect(
      new AdminSessionGuard(fixture.reflector, identity('super_admin')).canActivate(
        fixture.execution,
      ),
    ).resolves.toBe(true);
    expect(fixture.request.catalogActor).toMatchObject({
      actorId: '00000000-0000-4000-8000-000000000002',
      role: 'super_admin',
    });
  });
});
