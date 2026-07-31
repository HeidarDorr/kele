import { PrismaClient } from '@prisma/client';

const missingId = '00000000-0000-0000-0000-000000000000';

export async function cleanupCatalogTestData(input: {
  productSlug?: string;
  productId?: string;
  categoryId?: string;
  mediaId?: string;
}): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const product =
      input.productId !== undefined
        ? await prisma.product.findUnique({
            where: { id: input.productId },
            include: { variants: { include: { skus: true } } },
          })
        : input.productSlug !== undefined
          ? await prisma.product.findUnique({
              where: { slug: input.productSlug },
              include: { variants: { include: { skus: true } } },
            })
          : null;
    const variantIds = product?.variants.map((variant) => variant.id) ?? [];
    const skuIds = product?.variants.flatMap((variant) => variant.skus.map((sku) => sku.id)) ?? [];
    const entityIds = [
      ...(product ? [product.id] : []),
      ...variantIds,
      ...skuIds,
      ...(input.categoryId ? [input.categoryId] : []),
      ...(input.mediaId ? [input.mediaId] : []),
    ];

    await prisma.$transaction([
      prisma.commandReceipt.deleteMany({
        where: { entityId: product?.id ?? missingId },
      }),
      prisma.businessEvent.deleteMany({ where: { entityId: { in: entityIds } } }),
      prisma.inventoryMovement.deleteMany({ where: { skuId: { in: skuIds } } }),
      prisma.currentSkuPrice.deleteMany({ where: { skuId: { in: skuIds } } }),
      prisma.priceRecord.deleteMany({ where: { skuId: { in: skuIds } } }),
      prisma.inventory.deleteMany({ where: { skuId: { in: skuIds } } }),
      prisma.mediaAssignment.deleteMany({
        where: { colorVariantId: { in: variantIds } },
      }),
      prisma.sku.deleteMany({ where: { id: { in: skuIds } } }),
      prisma.colorVariant.deleteMany({ where: { id: { in: variantIds } } }),
      prisma.product.deleteMany({ where: { id: product?.id ?? missingId } }),
      prisma.category.deleteMany({ where: { id: input.categoryId ?? missingId } }),
      prisma.mediaAsset.deleteMany({ where: { id: input.mediaId ?? missingId } }),
    ]);
  } finally {
    await prisma.$disconnect();
  }
}
