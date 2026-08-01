import type { UnitOfWork } from '../../../shared/unit-of-work.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { AddressInput } from '../domain/identity.types.js';
import type { IdentityRepository } from './identity.repository.js';

export class CustomerService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  getCustomer(customerId: string) {
    return this.repository.getCustomer(customerId);
  }

  updateCustomer(customerId: string, input: { firstName?: string; lastName?: string }) {
    if (input.firstName === undefined && input.lastName === undefined) {
      throw new ApplicationError(
        'validation',
        'PROFILE_UPDATE_EMPTY',
        'At least one profile field is required.',
      );
    }
    return this.unitOfWork.run(() => this.repository.updateCustomer(customerId, input));
  }

  listAddresses(customerId: string) {
    return this.repository.listAddresses(customerId);
  }

  createAddress(customerId: string, input: AddressInput) {
    return this.unitOfWork.run(() => this.repository.createAddress(customerId, input));
  }

  updateAddress(customerId: string, addressId: string, input: AddressInput) {
    return this.unitOfWork.run(() => this.repository.updateAddress(customerId, addressId, input));
  }

  deleteAddress(customerId: string, addressId: string): Promise<void> {
    return this.unitOfWork.run(async () => {
      if (!(await this.repository.deleteAddress(customerId, addressId))) {
        throw new ApplicationError('not_found', 'ADDRESS_NOT_FOUND', 'Address was not found.');
      }
    });
  }
}
