export type CatalogErrorKind =
  'not_found' | 'conflict' | 'validation' | 'unauthorized' | 'forbidden';

export class CatalogError extends Error {
  constructor(
    public readonly kind: CatalogErrorKind,
    public readonly code: string,
    message: string,
    public readonly errors: ReadonlyArray<{
      path: string;
      code: string;
      message: string;
    }> = [],
  ) {
    super(message);
  }
}
