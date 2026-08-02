export const OUTFIT_CART_READER = Symbol('OUTFIT_CART_READER');

export type OutfitCartSelection = Readonly<{
  revisionId: string;
  revisionNumber: number;
  size: string;
  sizeLabel: string;
  title: string;
  unitPriceRial: number;
  availableQuantity: number;
  purchasable: boolean;
  image: Readonly<{
    id: string;
    url: string;
    width: number;
    height: number;
    alt: string;
    focalPoint: Readonly<{ x: number; y: number }>;
  }> | null;
}>;

export interface OutfitCartReader {
  getOutfitForCart(revisionId: string, size: string): Promise<OutfitCartSelection | null>;
}

export class MilestoneThreeOutfitCartReader implements OutfitCartReader {
  getOutfitForCart(): Promise<null> {
    return Promise.resolve(null);
  }
}
