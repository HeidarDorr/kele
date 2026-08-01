import { ApplicationError, type ApplicationErrorKind } from '../../../shared/application-error.js';

export class CatalogError extends ApplicationError {
  constructor(
    kind: ApplicationErrorKind,
    code: string,
    message: string,
    errors: ReadonlyArray<{
      path: string;
      code: string;
      message: string;
    }> = [],
  ) {
    super(kind, code, message, errors);
  }
}
