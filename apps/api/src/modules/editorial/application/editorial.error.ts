import { ApplicationError, type ApplicationErrorKind } from '../../../shared/application-error.js';

export class EditorialError extends ApplicationError {
  constructor(
    kind: ApplicationErrorKind,
    code: string,
    message: string,
    errors: ConstructorParameters<typeof ApplicationError>[3] = [],
  ) {
    super(kind, code, message, errors);
  }
}
