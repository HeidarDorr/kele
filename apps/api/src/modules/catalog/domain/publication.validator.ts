import type {
  ProductValue,
  PublicationValidation,
  PublicationValidationError,
} from './catalog.types.js';

function error(
  errors: PublicationValidationError[],
  path: string,
  ruleId: PublicationValidationError['ruleId'],
  message: string,
): void {
  errors.push({ path, ruleId, message });
}

export function validateProductPublication(product: ProductValue): PublicationValidation {
  const errors: PublicationValidationError[] = [];

  if (product.categories.length === 0) {
    error(errors, 'categoryIds', 'PUB-006', 'حداقل یک دسته‌بندی باید انتخاب شود.');
  }

  if (product.variants.length === 0) {
    error(errors, 'variants', 'PUB-006', 'حداقل یک تنوع رنگ باید تعریف شود.');
  }

  if (product.variants.every((variant) => variant.skus.length === 0)) {
    error(errors, 'variants', 'PUB-006', 'حداقل یک شناسهٔ کالا باید تعریف شود.');
  }

  product.variants.forEach((variant, variantIndex) => {
    const variantPath = `variants.${String(variantIndex)}`;

    if (variant.skus.length === 0) {
      error(
        errors,
        `${variantPath}.skus`,
        'PUB-007',
        'هر تنوع رنگ باید حداقل یک شناسهٔ کالا داشته باشد.',
      );
    }

    if (variant.gallery.length === 0 || variant.featuredMediaId === null) {
      error(
        errors,
        `${variantPath}.mediaIds`,
        'PUB-007',
        'هر تنوع رنگ باید تصویر و تصویر شاخص داشته باشد.',
      );
    }

    variant.skus.forEach((sku, skuIndex) => {
      const skuPath = `${variantPath}.skus.${String(skuIndex)}`;
      if (sku.price === null || sku.price.amountRial <= 0) {
        error(
          errors,
          `${skuPath}.amountRial`,
          'PUB-008',
          'برای انتشار شناسهٔ کالا باید قیمت فروش معتبر ثبت شود.',
        );
      }
      if (sku.inventory === null) {
        error(
          errors,
          `${skuPath}.physicalQuantity`,
          'PUB-008',
          'رکورد موجودی شناسهٔ کالا باید وجود داشته باشد.',
        );
      }
    });
  });

  return { valid: errors.length === 0, errors };
}
