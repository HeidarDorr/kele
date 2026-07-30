import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithCorrelationId } from './correlation-context.js';

const correlationHeader = 'x-correlation-id';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CorrelationIdMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.header(correlationHeader);
    const resolved = supplied !== undefined && uuidPattern.test(supplied) ? supplied : randomUUID();

    response.setHeader(correlationHeader, resolved);
    runWithCorrelationId(resolved, next);
  }
}
