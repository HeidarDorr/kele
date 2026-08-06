import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { environment } from '../../../platform/config/environment.js';
import { correlationId } from '../../../platform/observability/correlation-context.js';
import type { ActorContext } from '../domain/catalog.types.js';

const rolesMetadata = 'catalog.roles';
type AdminRole = ActorContext['role'];

export const RequireAdminRoles = (...roles: AdminRole[]) => SetMetadata(rolesMetadata, roles);

export interface CatalogAdminRequest extends Request {
  catalogActor?: ActorContext;
}

function cookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (cookieHeader === undefined) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CatalogAdminRequest>();
    const token = cookieValue(request.headers.cookie, 'kele_session');
    if (token === null) {
      throw new UnauthorizedException('Administrator session is required.');
    }

    const identity: Pick<ActorContext, 'actorId' | 'role'> | null = safeTokenEqual(
      token,
      environment.ADMIN_SUPER_SESSION_TOKEN,
    )
      ? { actorId: 'admin-super', role: 'super_admin' as const }
      : safeTokenEqual(token, environment.ADMIN_INVENTORY_SESSION_TOKEN)
        ? { actorId: 'admin-inventory', role: 'inventory_admin' as const }
        : safeTokenEqual(token, environment.ADMIN_INSTAGRAM_SESSION_TOKEN)
          ? { actorId: 'admin-instagram', role: 'instagram_admin' as const }
          : null;
    if (identity === null) {
      throw new UnauthorizedException('Administrator session is invalid.');
    }

    const roles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(rolesMetadata, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles !== undefined && roles.length > 0 && !roles.includes(identity.role)) {
      throw new ForbiddenException('Administrator role is not allowed.');
    }
    request.catalogActor = {
      ...identity,
      correlationId: correlationId() ?? randomUUID(),
    };
    return true;
  }
}

function safeTokenEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function actorFromRequest(request: CatalogAdminRequest): ActorContext {
  if (request.catalogActor === undefined) {
    throw new UnauthorizedException('Administrator session is required.');
  }
  return request.catalogActor;
}
