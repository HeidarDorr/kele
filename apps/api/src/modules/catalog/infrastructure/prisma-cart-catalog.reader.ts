import { PublicationStatus } from '@prisma/client';
import type {
  CartCatalogProduct,
  CartCatalogReader,
} from '../application/cart-catalog.contract.js';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';

function safeInteger(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('Catalog price exceeds safe integer range.');
  return result;
}

export class PrismaCartCatalogReader implements CartCatalogReader {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async getProductForCart(skuId: string): Promise<CartCatalogProduct | null> {
    const sku = await this.transactions.client().sku.findUnique({
      where: { id: skuId },
      include: {
        currentPrice: true,
        inventory: true,
        colorVariant: {
          include: {
            product: true,
            mediaAssignments: {
              where: { featured: true },
              orderBy: { displayOrder: 'asc' },
              take: 1,
              include: { mediaAsset: true },
            },
          },
        },
      },
    });
    if (sku === null) return null;

    const media = sku.colorVariant.mediaAssignments[0]?.mediaAsset;
    const availableQuantity = Math.max(
      0,
      (sku.inventory?.physicalQuantity ?? 0) - (sku.inventory?.reservedQuantity ?? 0),
    );
    const purchasable =
      sku.status === PublicationStatus.PUBLISHED &&
      sku.colorVariant.status === PublicationStatus.PUBLISHED &&
      sku.colorVariant.product.status === PublicationStatus.PUBLISHED &&
      sku.currentPrice !== null &&
      sku.inventory !== null &&
      availableQuantity > 0;

    return {
      skuId: sku.id,
      title: sku.colorVariant.product.name,
      selection: `${sku.colorVariant.name} / ${sku.displaySize}`,
      skuCode: sku.code,
      unitPriceRial: sku.currentPrice === null ? 0 : safeInteger(sku.currentPrice.amountRial),
      availableQuantity,
      purchasable,
      image:
        media === undefined
          ? null
          : {
              id: media.id,
              url: media.url,
              width: media.width,
              height: media.height,
              alt: media.altText,
              focalPoint: { x: media.focalPointX, y: media.focalPointY },
            },
    };
  }
}
