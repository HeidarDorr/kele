import type { CartLineRecord, CartNoticeCodeValue, MergeInstruction } from './cart.types.js';

export type MergeMerchandiseState = Readonly<{
  productAvailability: ReadonlyMap<string, Readonly<{ purchasable: boolean; available: number }>>;
  outfitAvailability: ReadonlyMap<string, Readonly<{ purchasable: boolean; available: number }>>;
}>;

export function planDeterministicMerge(
  customerLines: readonly CartLineRecord[],
  guestLines: readonly CartLineRecord[],
  state: MergeMerchandiseState,
): MergeInstruction[] {
  const customerProducts = new Map(
    customerLines
      .filter((line) => line.kind === 'product' && line.skuId !== null)
      .map((line) => [line.skuId as string, line]),
  );
  const customerOutfits = new Map(
    customerLines
      .filter(
        (line) =>
          line.kind === 'outfit' && line.outfitRevisionId !== null && line.outfitSize !== null,
      )
      .map((line) => [`${String(line.outfitRevisionId)}:${String(line.outfitSize)}`, line]),
  );
  const orderedGuestLines = [...guestLines].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id),
  );

  return orderedGuestLines.map((guestLine): MergeInstruction => {
    if (guestLine.kind === 'outfit') {
      const key = `${guestLine.outfitRevisionId ?? ''}:${guestLine.outfitSize ?? ''}`;
      const current = customerOutfits.get(key);
      const requestedQuantity = guestLine.quantity + (current?.quantity ?? 0);
      const merchandise = state.outfitAvailability.get(key);
      const purchasable = merchandise?.purchasable === true;
      const available = Math.min(20, Math.max(0, merchandise?.available ?? 0));
      const quantity =
        purchasable && available > 0 ? Math.min(requestedQuantity, available) : requestedQuantity;
      const status = !purchasable
        ? ('requires_review' as const)
        : available > 0
          ? ('available' as const)
          : ('unavailable' as const);
      const notice: CartNoticeCodeValue | null = !purchasable
        ? 'outfit_revision_requires_review'
        : quantity < requestedQuantity
          ? 'quantity_reduced_to_inventory'
          : null;
      const common = {
        guestLineId: guestLine.id,
        quantity,
        status,
        notice,
        requestedQuantity,
      };
      if (current === undefined) {
        customerOutfits.set(key, { ...guestLine, quantity });
        return { kind: 'move_outfit', ...common };
      }
      return { kind: 'combine_outfit', customerLineId: current.id, ...common };
    }

    if (guestLine.skuId === null) {
      throw new Error('Product cart line requires a product option ID.');
    }
    const customerLine = customerProducts.get(guestLine.skuId);
    const requestedQuantity = guestLine.quantity + (customerLine?.quantity ?? 0);
    const merchandise = state.productAvailability.get(guestLine.skuId);
    const available = Math.min(20, Math.max(0, merchandise?.available ?? 0));
    const canPurchase = merchandise?.purchasable === true && available > 0;
    const quantity = canPurchase ? Math.min(requestedQuantity, available) : requestedQuantity;
    const notice: CartNoticeCodeValue | null = canPurchase
      ? quantity < requestedQuantity
        ? 'quantity_reduced_to_inventory'
        : null
      : 'sku_unavailable';
    const common = {
      guestLineId: guestLine.id,
      quantity,
      status: canPurchase ? ('available' as const) : ('unavailable' as const),
      notice,
      requestedQuantity,
    };

    if (customerLine === undefined) {
      customerProducts.set(guestLine.skuId, { ...guestLine, quantity });
      return { kind: 'move_product', ...common };
    }
    return { kind: 'combine_product', customerLineId: customerLine.id, ...common };
  });
}
