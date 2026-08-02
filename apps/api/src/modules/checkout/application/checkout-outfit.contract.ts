import type { CheckoutMediaSnapshot } from '../domain/checkout.types.js';

export const CHECKOUT_OUTFIT_PORT = Symbol('CHECKOUT_OUTFIT_PORT');

export type CheckoutOutfitSelection = Readonly<{
  revisionId: string;
  revisionNumber: number;
  size: string;
  sizeLabel: string;
  title: string;
  unitPriceRial: number;
  image: CheckoutMediaSnapshot | null;
  availableQuantity: number;
  purchasable: boolean;
  components: ReadonlyArray<{
    outfitItemId: string;
    skuId: string;
    skuCode: string;
    productName: string;
    colorName: string;
    sizeLabel: string;
    quantityPerOutfit: number;
    availableQuantity: number;
    displayOrder: number;
  }>;
}>;

export interface CheckoutOutfitPort {
  getOutfitForCheckout(revisionId: string, size: string): Promise<CheckoutOutfitSelection | null>;
}
