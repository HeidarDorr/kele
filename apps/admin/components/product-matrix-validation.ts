export interface ProductMatrixMediaVariant {
  name: string;
  mediaIds: string[];
  featuredMediaId: string;
}

export interface ProductMatrixValidationError {
  variantIndex: number;
  message: string;
}

function variantLabel(variant: ProductMatrixMediaVariant, variantIndex: number): string {
  const position = (variantIndex + 1).toLocaleString('fa-IR');
  const name = variant.name.trim();
  return name.length > 0 ? `رنگ ${position} («${name}»)` : `رنگ ${position}`;
}

export function validateProductMatrixMedia(
  variants: ProductMatrixMediaVariant[],
): ProductMatrixValidationError | null {
  for (const [variantIndex, variant] of variants.entries()) {
    const label = variantLabel(variant, variantIndex);
    if (variant.mediaIds.length === 0) {
      return {
        variantIndex,
        message: `برای ${label} حداقل یک تصویر انتخاب کنید.`,
      };
    }
    if (
      variant.featuredMediaId.length === 0 ||
      !variant.mediaIds.includes(variant.featuredMediaId)
    ) {
      return {
        variantIndex,
        message: `برای ${label} یک تصویر شاخص انتخاب کنید.`,
      };
    }
  }
  return null;
}
