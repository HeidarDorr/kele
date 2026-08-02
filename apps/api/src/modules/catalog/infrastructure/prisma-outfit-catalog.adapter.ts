import { Prisma, PublicationStatus } from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import type {
  OutfitCatalogPort,
  OutfitCatalogReferenceQuery,
  OutfitCatalogReferences,
} from '../application/outfit-catalog.contract.js';

function mapMedia(media: {
  id: string;
  url: string;
  width: number;
  height: number;
  altText: string;
  focalPointX: number;
  focalPointY: number;
}) {
  return {
    id: media.id,
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.altText,
    focalPoint: { x: media.focalPointX, y: media.focalPointY },
  };
}

export class PrismaOutfitCatalogAdapter implements OutfitCatalogPort {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  async getOutfitReferences(query: OutfitCatalogReferenceQuery): Promise<OutfitCatalogReferences> {
    const client = this.transactions.client();
    const skuIds = [...new Set(query.skuIds)].toSorted();
    if (query.lockInventory === true && skuIds.length > 0) {
      await client.$queryRaw(
        Prisma.sql`SELECT sku_id FROM "inventory" WHERE sku_id = ANY(ARRAY[${Prisma.join(
          skuIds,
        )}]::uuid[]) ORDER BY sku_id FOR UPDATE`,
      );
    }
    const [categories, media, products, variants, skus] = await Promise.all([
      client.category.findMany({ where: { id: { in: [...new Set(query.categoryIds)] } } }),
      client.mediaAsset.findMany({ where: { id: { in: [...new Set(query.mediaIds)] } } }),
      client.product.findMany({ where: { id: { in: [...new Set(query.productIds)] } } }),
      client.colorVariant.findMany({
        where: { id: { in: [...new Set(query.variantIds)] } },
        include: {
          mediaAssignments: {
            where: { featured: true },
            orderBy: { displayOrder: 'asc' },
            take: 1,
            include: { mediaAsset: true },
          },
        },
      }),
      client.sku.findMany({
        where: { id: { in: skuIds } },
        include: { inventory: true },
      }),
    ]);
    return {
      categories: new Map(
        categories.map((category) => [
          category.id,
          {
            id: category.id,
            slug: category.slug,
            name: category.name,
            description: category.description,
            displayOrder: category.displayOrder,
            published: category.status === PublicationStatus.PUBLISHED,
          },
        ]),
      ),
      media: new Map(
        media.map((asset) => [
          asset.id,
          { value: mapMedia(asset), archived: asset.archivedAt !== null },
        ]),
      ),
      products: new Map(
        products.map((product) => [
          product.id,
          {
            id: product.id,
            slug: product.slug,
            name: product.name,
            published: product.status === PublicationStatus.PUBLISHED,
          },
        ]),
      ),
      variants: new Map(
        variants.map((variant) => [
          variant.id,
          {
            id: variant.id,
            productId: variant.productId,
            name: variant.name,
            published: variant.status === PublicationStatus.PUBLISHED,
            featuredMedia:
              variant.mediaAssignments[0] === undefined
                ? null
                : mapMedia(variant.mediaAssignments[0].mediaAsset),
          },
        ]),
      ),
      skus: new Map(
        skus.map((sku) => [
          sku.id,
          {
            id: sku.id,
            colorVariantId: sku.colorVariantId,
            code: sku.code,
            sizeLabel: sku.displaySize,
            published: sku.status === PublicationStatus.PUBLISHED,
            hasInventory: sku.inventory !== null,
            availableQuantity: Math.max(
              0,
              (sku.inventory?.physicalQuantity ?? 0) - (sku.inventory?.reservedQuantity ?? 0),
            ),
          },
        ]),
      ),
    };
  }
}
