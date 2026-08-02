import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CheckoutCustomerPort } from '../application/checkout-customer.contract.js';

export class PrismaCheckoutCustomerAdapter implements CheckoutCustomerPort {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async getOwnedAddress(customerId: string, addressId: string) {
    const address = await this.transactions.client().address.findFirst({
      where: { id: addressId, customerId },
    });
    if (address === null) {
      throw new ApplicationError('not_found', 'ADDRESS_NOT_FOUND', 'Address was not found.');
    }
    return {
      recipientName: address.recipientName,
      recipientMobile: address.recipientMobile,
      province: address.province,
      city: address.city,
      addressLine: address.addressLine,
      postalCode: address.postalCode,
    };
  }
}
