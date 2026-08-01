export const OUTFIT_CART_READER = Symbol('OUTFIT_CART_READER');

export type OutfitCartSelection = Readonly<{
  revisionId: string;
  size: string;
  title: string;
  unitPriceRial: number;
  availableQuantity: number;
  purchasable: boolean;
}>;

export interface OutfitCartReader {
  getOutfitForCart(revisionId: string, size: string): Promise<OutfitCartSelection | null>;
}

export class MilestoneThreeOutfitCartReader implements OutfitCartReader {
  getOutfitForCart(): Promise<null> {
    return Promise.resolve(null);
  }
}
