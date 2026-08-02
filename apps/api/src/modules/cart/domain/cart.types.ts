import type { CartCatalogMedia } from '../../catalog/application/cart-catalog.contract.js';

export type CartLineKindValue = 'product' | 'outfit';
export type CartLineStatusValue = 'available' | 'unavailable' | 'requires_review';
export type CartNoticeCodeValue =
  'quantity_reduced_to_inventory' | 'sku_unavailable' | 'outfit_revision_requires_review';

export type CartLineRecord = Readonly<{
  id: string;
  cartId: string;
  kind: CartLineKindValue;
  skuId: string | null;
  outfitRevisionId: string | null;
  outfitRevisionNumber: number | null;
  outfitSize: string | null;
  titleSnapshot: string;
  selectionSnapshot: string;
  skuCodeSnapshot: string | null;
  imageSnapshot: CartCatalogMedia | null;
  quantity: number;
  status: CartLineStatusValue;
  unitPriceRial: number;
  createdAt: Date;
}>;

export type CartNoticeRecord = Readonly<{
  id: string;
  lineId: string;
  code: CartNoticeCodeValue;
  requestedQuantity: number | null;
  appliedQuantity: number | null;
}>;

export type CartRecord = Readonly<{
  id: string;
  customerId: string | null;
  version: number;
  status: 'active' | 'merged';
  lines: CartLineRecord[];
  notices: CartNoticeRecord[];
}>;

export type CartView = Readonly<{
  id: string;
  version: number;
  lines: ReadonlyArray<{
    id: string;
    kind: CartLineKindValue;
    title: string;
    selection: string;
    skuCode: string | null;
    outfitRevisionId: string | null;
    outfitRevisionNumber: number | null;
    outfitSize: string | null;
    image: CartCatalogMedia | null;
    quantity: number;
    status: CartLineStatusValue;
    checkoutBlocking: boolean;
    unitPrice: Readonly<{ amountRial: number; currency: 'IRR'; display: string }>;
  }>;
  informationalTotal: Readonly<{ amountRial: number; currency: 'IRR'; display: string }>;
  checkoutBlocked: boolean;
  mergeNotices: CartNoticeRecord[];
}>;

export type ProductLineInput = Readonly<{ kind: 'product'; skuId: string; quantity: number }>;
export type OutfitLineInput = Readonly<{
  kind: 'outfit';
  outfitRevisionId: string;
  size: string;
  quantity: number;
}>;
export type CartLineInput = ProductLineInput | OutfitLineInput;

export type MergeInstruction =
  | Readonly<{
      kind: 'move_product';
      guestLineId: string;
      quantity: number;
      status: 'available' | 'unavailable';
      notice: CartNoticeCodeValue | null;
      requestedQuantity: number;
    }>
  | Readonly<{
      kind: 'combine_product';
      guestLineId: string;
      customerLineId: string;
      quantity: number;
      status: 'available' | 'unavailable';
      notice: CartNoticeCodeValue | null;
      requestedQuantity: number;
    }>
  | Readonly<{
      kind: 'move_outfit';
      guestLineId: string;
      quantity: number;
      status: 'available' | 'unavailable' | 'requires_review';
      notice: CartNoticeCodeValue | null;
      requestedQuantity: number;
    }>
  | Readonly<{
      kind: 'combine_outfit';
      guestLineId: string;
      customerLineId: string;
      quantity: number;
      status: 'available' | 'unavailable' | 'requires_review';
      notice: CartNoticeCodeValue | null;
      requestedQuantity: number;
    }>;
