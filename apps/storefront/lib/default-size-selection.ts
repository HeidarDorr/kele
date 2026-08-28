export function firstSkuId(skus: ReadonlyArray<{ id: string }>): string | null {
  return skus[0]?.id ?? null;
}

export function firstOutfitSizeCode(sizes: ReadonlyArray<{ code: string }>): string | null {
  return sizes[0]?.code ?? null;
}
