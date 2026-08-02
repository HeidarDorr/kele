export type CheckoutAddressSource = Readonly<{
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
}>;

export const CHECKOUT_CUSTOMER_PORT = Symbol('CHECKOUT_CUSTOMER_PORT');

export interface CheckoutCustomerPort {
  getOwnedAddress(customerId: string, addressId: string): Promise<CheckoutAddressSource>;
}
