export function firstSkuId(skus: ReadonlyArray<{ id: string }>): string | null {
  return skus[0]?.id ?? null;
}

export function lowestPricedOutfitSizeCode(
  sizes: ReadonlyArray<{ code: string; price: { amountRial: number } }>,
): string | null {
  const first = sizes[0];
  if (first === undefined) return null;

  return sizes
    .slice(1)
    .reduce(
      (lowest, size) => (size.price.amountRial < lowest.price.amountRial ? size : lowest),
      first,
    ).code;
}
