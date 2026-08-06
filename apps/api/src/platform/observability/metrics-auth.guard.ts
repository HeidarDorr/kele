import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

export const METRICS_AUTH_TOKEN = Symbol('METRICS_AUTH_TOKEN');

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(@Inject(METRICS_AUTH_TOKEN) token: string) {
    this.expected = digest(token);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    const presented = digest(token);
    if (!timingSafeEqual(presented, this.expected)) {
      throw new UnauthorizedException('Metrics credential is invalid.');
    }
    return true;
  }
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}
