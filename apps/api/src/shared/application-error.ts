export type ApplicationErrorKind =
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'dependency';

export class ApplicationError extends Error {
  constructor(
    public readonly kind: ApplicationErrorKind,
    public readonly code: string,
    message: string,
    public readonly errors: ReadonlyArray<{
      path: string;
      code: string;
      message: string;
    }> = [],
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
