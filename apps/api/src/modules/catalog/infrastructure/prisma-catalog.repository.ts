import { createHash } from 'node:crypto';
import {
  InventoryAction as PrismaInventoryAction,
  MediaFormat as PrismaMediaFormat,
  MediaGroup as PrismaMediaGroup,
  Prisma,
  PublicationStatus as PrismaPublicationStatus,
} from '@prisma/client';
import { formatIrrAsToman } from '@kele/design-system/money';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { commandFingerprint } from '../../../shared/command-fingerprint.js';
import { CatalogError } from '../application/catalog.error.js';
import type { CatalogRepository } from '../application/catalog.repository.js';
import { applyInventoryDelta, InventoryInvariantError } from '../domain/inventory.js';
import { normalizePersianSearch } from '../domain/persian-search.js';
import { validateProductPublication } from '../domain/publication.validator.js';
import type {
  ActorContext,
  AdminCategoryInput,
  AdminColorVariantInput,
  AdminMediaInput,
  AdminProductInput,
  AdminSkuInput,
  CatalogQuery,
  CategoryValue,
  ColorVariantValue,
  InventoryActionInput,
  InventoryValue,
  MediaValue,
  MoneyValue,
  ProductCardPageValue,
  ProductCardValue,
  ProductDetailValue,
  ProductValue,
  PublicationStatus,
  PublicationValidation,
  SkuValue,
} from '../domain/catalog.types.js';

const productInclude = Prisma.validator<Prisma.ProductInclude>()({
  categories: {
    include: { category: true },
    orderBy: { category: { displayOrder: 'asc' } },
  },
  variants: {
    orderBy: { displayOrder: 'asc' },
    include: {
      mediaAssignments: {
        orderBy: { displayOrder: 'asc' },
        include: { mediaAsset: true },
      },
      skus: {
        orderBy: { normalizedSize: 'asc' },
        include: { currentPrice: true, inventory: true },
      },
    },
  },
});

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type Transaction = Prisma.TransactionClient;

const toDomainStatus: Record<PrismaPublicationStatus, PublicationStatus> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

const toPrismaStatus: Record<PublicationStatus, PrismaPublicationStatus> = {
  draft: PrismaPublicationStatus.DRAFT,
  published: PrismaPublicationStatus.PUBLISHED,
  archived: PrismaPublicationStatus.ARCHIVED,
};

const toPrismaFormat: Record<AdminMediaInput['format'], PrismaMediaFormat> = {
  jpg: PrismaMediaFormat.JPG,
  png: PrismaMediaFormat.PNG,
  webp: PrismaMediaFormat.WEBP,
};

const toPrismaGroup: Record<AdminMediaInput['group'], PrismaMediaGroup> = {
  product_images: PrismaMediaGroup.PRODUCT_IMAGES,
  outfit_editorial: PrismaMediaGroup.OUTFIT_EDITORIAL,
  homepage: PrismaMediaGroup.HOMEPAGE,
  journal: PrismaMediaGroup.JOURNAL,
  shared_assets: PrismaMediaGroup.SHARED_ASSETS,
};

const toDomainFormat: Record<PrismaMediaFormat, MediaValue['format']> = {
  JPG: 'jpg',
  PNG: 'png',
  WEBP: 'webp',
};

const toDomainGroup: Record<PrismaMediaGroup, MediaValue['group']> = {
  PRODUCT_IMAGES: 'product_images',
  OUTFIT_EDITORIAL: 'outfit_editorial',
  HOMEPAGE: 'homepage',
  JOURNAL: 'journal',
  SHARED_ASSETS: 'shared_assets',
};

const toPrismaInventoryAction: Record<InventoryActionInput['action'], PrismaInventoryAction> = {
  production: PrismaInventoryAction.PRODUCTION,
  sale: PrismaInventoryAction.SALE,
  manual_correction: PrismaInventoryAction.MANUAL_CORRECTION,
  damaged_goods: PrismaInventoryAction.DAMAGED_GOODS,
  instagram_sale: PrismaInventoryAction.INSTAGRAM_SALE,
  instagram_return: PrismaInventoryAction.INSTAGRAM_RETURN,
};

function toSafeNumber(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new CatalogError(
      'validation',
      'MONEY_OUT_OF_RANGE',
      'Persisted IRR amount is outside the safe transport range.',
    );
  }
  return number;
}

function mapMoney(amountRial: bigint): MoneyValue {
  const amount = toSafeNumber(amountRial);
  return {
    amountRial: amount,
    currency: 'IRR',
    display: formatIrrAsToman(amount),
  };
}

function mapMedia(media: {
  id: string;
  url: string;
  width: number;
  height: number;
  altText: string;
  format: PrismaMediaFormat;
  group: PrismaMediaGroup;
  colorHex: string | null;
  focalPointX: number;
  focalPointY: number;
}): MediaValue {
  return {
    id: media.id,
    url: media.url,
    width: media.width,
    height: media.height,
    alt: media.altText,
    format: toDomainFormat[media.format],
    group: toDomainGroup[media.group],
    colorHex: media.colorHex,
    focalPoint: { x: media.focalPointX, y: media.focalPointY },
  };
}

function mapCategory(category: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  status: PrismaPublicationStatus;
  version: number;
  discoveryKind: 'CATALOG' | 'OCCASION';
  editorialTitle: string | null;
  editorialDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  heroMedia?: {
    id: string;
    url: string;
    width: number;
    height: number;
    altText: string;
    format: PrismaMediaFormat;
    group: PrismaMediaGroup;
    colorHex: string | null;
    focalPointX: number;
    focalPointY: number;
  } | null;
}): CategoryValue {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    displayOrder: category.displayOrder,
    status: toDomainStatus[category.status],
    version: category.version,
    discoveryKind: category.discoveryKind.toLocaleLowerCase() as 'catalog' | 'occasion',
    editorialTitle: category.editorialTitle,
    editorialDescription: category.editorialDescription,
    heroMedia: category.heroMedia == null ? null : mapMedia(category.heroMedia),
    seo: {
      title: category.seoTitle,
      description: category.seoDescription,
    },
  };
}

function mapInventory(record: {
  skuId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  version: number;
}): InventoryValue {
  return {
    skuId: record.skuId,
    physicalQuantity: record.physicalQuantity,
    reservedQuantity: record.reservedQuantity,
    availableQuantity: record.physicalQuantity - record.reservedQuantity,
    version: record.version,
  };
}

function mapSku(sku: ProductRecord['variants'][number]['skus'][number]): SkuValue {
  return {
    id: sku.id,
    code: sku.code,
    normalizedSize: sku.normalizedSize,
    displaySize: sku.displaySize,
    status: toDomainStatus[sku.status],
    price: sku.currentPrice === null ? null : mapMoney(sku.currentPrice.amountRial),
    inventory: sku.inventory === null ? null : mapInventory(sku.inventory),
  };
}

function mapVariant(variant: ProductRecord['variants'][number]): ColorVariantValue {
  const gallery = variant.mediaAssignments.map((assignment) => mapMedia(assignment.mediaAsset));
  return {
    id: variant.id,
    name: variant.name,
    normalizedColorCode: variant.normalizedColorCode,
    hex: variant.displayHex,
    status: toDomainStatus[variant.status],
    displayOrder: variant.displayOrder,
    gallery,
    featuredMediaId:
      variant.mediaAssignments.find((assignment) => assignment.featured)?.mediaAssetId ?? null,
    skus: variant.skus.map(mapSku),
  };
}

function mapProduct(product: ProductRecord): ProductValue {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    details: product.details,
    status: toDomainStatus[product.status],
    seo: {
      title: product.seoTitle,
      description: product.seoDescription,
    },
    version: product.version,
    updatedAt: product.updatedAt.toISOString(),
    categories: product.categories.map(({ category }) => mapCategory(category)),
    variants: product.variants.map(mapVariant),
  };
}

function publishedVariants(product: ProductValue): ColorVariantValue[] {
  return product.variants
    .filter((variant) => variant.status === 'published')
    .map((variant) => ({
      ...variant,
      skus: variant.skus.filter(
        (sku) => sku.status === 'published' && sku.price !== null && sku.inventory !== null,
      ),
    }))
    .filter(
      (variant) =>
        variant.gallery.length > 0 && variant.featuredMediaId !== null && variant.skus.length > 0,
    );
}

function firstPricedSku(variant: ColorVariantValue): SkuValue & { price: MoneyValue } {
  const priced = variant.skus
    .filter((sku): sku is SkuValue & { price: MoneyValue } => sku.price !== null)
    .sort((left, right) => left.price.amountRial - right.price.amountRial);
  const first = priced[0];
  if (first === undefined) {
    throw new CatalogError(
      'validation',
      'CATALOG_PRICE_MISSING',
      'Published product option price is missing.',
    );
  }
  return first;
}

function featuredMedia(variant: ColorVariantValue): MediaValue {
  const media = variant.gallery.find((item) => item.id === variant.featuredMediaId);
  if (media === undefined) {
    throw new CatalogError(
      'validation',
      'CATALOG_MEDIA_MISSING',
      'Published variant featured media is missing.',
    );
  }
  return media;
}

function toProductCard(
  product: ProductValue,
  selectedVariantId: string | null = null,
): ProductCardValue {
  const variants = publishedVariants(product);
  const selected = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  if (selected === undefined) {
    throw new CatalogError(
      'not_found',
      'PRODUCT_NOT_PUBLIC',
      'No published product variant is available.',
    );
  }
  const selectedSku = firstPricedSku(selected);

  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    selectedVariant: {
      id: selected.id,
      name: selected.name,
      featuredMedia: featuredMedia(selected),
    },
    availableColors: variants.map((variant) => ({
      variantId: variant.id,
      name: variant.name,
      hex: variant.hex,
      available: variant.skus.some((sku) => (sku.inventory?.availableQuantity ?? 0) > 0),
      featuredMedia: featuredMedia(variant),
      secondaryMedia: variant.gallery.find((media) => media.id !== variant.featuredMediaId) ?? null,
      price: firstPricedSku(variant).price,
    })),
    price: selectedSku.price,
    available: selected.skus.some((sku) => (sku.inventory?.availableQuantity ?? 0) > 0),
  };
}

function toProductDetail(
  product: ProductValue,
  selectedVariantId: string | null,
  allowDraft: boolean,
): ProductDetailValue {
  const sourceVariants = allowDraft ? product.variants : publishedVariants(product);
  const completeVariants = sourceVariants.filter(
    (variant) =>
      variant.gallery.length > 0 &&
      variant.featuredMediaId !== null &&
      variant.skus.some((sku) => sku.price !== null && sku.inventory !== null),
  );
  const selected =
    completeVariants.find((variant) => variant.id === selectedVariantId) ?? completeVariants[0];
  if (selected === undefined) {
    throw new CatalogError(
      'validation',
      'PREVIEW_INCOMPLETE',
      'Product needs media, price, and inventory before preview.',
    );
  }

  const previewProduct: ProductValue = {
    ...product,
    variants: completeVariants.map((variant) => ({
      ...variant,
      status: 'published',
      skus: variant.skus
        .filter(
          (sku): sku is SkuValue & { price: MoneyValue; inventory: InventoryValue } =>
            sku.price !== null && sku.inventory !== null,
        )
        .map((sku) => ({ ...sku, status: 'published' })),
    })),
  };
  const card = toProductCard(previewProduct, selected.id);
  return {
    ...card,
    description: product.description,
    details: product.details,
    variants: previewProduct.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      gallery: variant.gallery,
      skus: variant.skus.map((sku) => ({
        id: sku.id,
        code: sku.code,
        size: sku.displaySize,
        available: (sku.inventory?.availableQuantity ?? 0) > 0,
        price: sku.price ?? card.price,
      })),
    })),
    categories: product.categories,
    seo: product.seo,
    updatedAt: product.updatedAt,
  };
}

function parseCursor(cursor: string | null): number {
  if (cursor === null) return 0;
  try {
    const value = Number.parseInt(Buffer.from(cursor, 'base64url').toString('utf8'), 10);
    if (!Number.isInteger(value) || value < 0) throw new Error('invalid');
    return value;
  } catch {
    throw new CatalogError('validation', 'INVALID_CURSOR', 'Catalog cursor is invalid.');
  }
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}

function requestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicCategories(): Promise<CategoryValue[]> {
    const categories = await this.prisma.category.findMany({
      where: { status: PrismaPublicationStatus.PUBLISHED, discoveryKind: 'CATALOG' },
      include: { heroMedia: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map(mapCategory);
  }

  async listPublicOccasions(): Promise<CategoryValue[]> {
    const categories = await this.prisma.category.findMany({
      where: { status: PrismaPublicationStatus.PUBLISHED, discoveryKind: 'OCCASION' },
      include: { heroMedia: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map(mapCategory);
  }

  async getPublicCategory(
    slug: string,
    query: CatalogQuery,
  ): Promise<{ category: CategoryValue; products: ProductCardPageValue }> {
    const category = await this.prisma.category.findFirst({
      where: { slug, status: PrismaPublicationStatus.PUBLISHED },
      include: { heroMedia: true },
    });
    if (category === null) {
      throw new CatalogError('not_found', 'CATEGORY_NOT_FOUND', 'Category was not found.');
    }
    return {
      category: mapCategory(category),
      products: await this.listPublicProducts({ ...query, category: slug }),
    };
  }

  async listPublicProducts(query: CatalogQuery): Promise<ProductCardPageValue> {
    const offset = parseCursor(query.cursor);
    const normalizedSearch = query.search === null ? null : normalizePersianSearch(query.search);
    const categoryClause =
      query.category === null
        ? Prisma.empty
        : Prisma.sql`AND EXISTS (
            SELECT 1
            FROM "product_categories" pc
            JOIN "categories" c ON c."id" = pc."category_id"
            WHERE pc."product_id" = p."id"
              AND c."slug" = ${query.category}
              AND c."status" = 'PUBLISHED'::"publication_status"
          )`;
    const searchClause =
      normalizedSearch === null || normalizedSearch.length === 0
        ? Prisma.empty
        : Prisma.sql`AND to_tsvector('simple', p."search_text")
          @@ websearch_to_tsquery('simple', ${normalizedSearch})`;
    const orderClause =
      query.sort === 'price_asc'
        ? Prisma.sql`ORDER BY MIN(cp."amount_rial") ASC, p."created_at" DESC, p."id" ASC`
        : query.sort === 'price_desc'
          ? Prisma.sql`ORDER BY MIN(cp."amount_rial") DESC, p."created_at" DESC, p."id" ASC`
          : normalizedSearch === null || normalizedSearch.length === 0
            ? Prisma.sql`ORDER BY p."created_at" DESC, p."id" ASC`
            : Prisma.sql`ORDER BY ts_rank(
                to_tsvector('simple', p."search_text"),
                websearch_to_tsquery('simple', ${normalizedSearch})
              ) DESC, p."created_at" DESC, p."id" ASC`;

    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT p."id"
      FROM "products" p
      JOIN "color_variants" cv
        ON cv."product_id" = p."id"
        AND cv."status" = 'PUBLISHED'::"publication_status"
      JOIN "skus" s
        ON s."color_variant_id" = cv."id"
        AND s."status" = 'PUBLISHED'::"publication_status"
      JOIN "current_sku_prices" cp ON cp."sku_id" = s."id"
      JOIN "inventory" i ON i."sku_id" = s."id"
      JOIN "media_assignments" ma
        ON ma."color_variant_id" = cv."id"
        AND ma."featured" = true
      JOIN "media_assets" m
        ON m."id" = ma."media_asset_id"
        AND m."archived_at" IS NULL
      WHERE p."status" = 'PUBLISHED'::"publication_status"
        ${categoryClause}
        ${searchClause}
      GROUP BY p."id", p."search_text", p."created_at"
      ${orderClause}
      LIMIT ${query.limit + 1}
      OFFSET ${offset}
    `);

    const hasMore = rows.length > query.limit;
    const pageRows = rows.slice(0, query.limit);
    const ids = pageRows.map((row) => row.id);
    const records = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: productInclude,
    });
    const byId = new Map(records.map((record) => [record.id, record]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((record): record is ProductRecord => record !== undefined)
      .map(mapProduct)
      .map((product) => toProductCard(product));

    return {
      items,
      page: {
        nextCursor: hasMore ? encodeCursor(offset + query.limit) : null,
        hasMore,
      },
    };
  }

  async getPublicProduct(slug: string, colorVariantId: string | null): Promise<ProductDetailValue> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: PrismaPublicationStatus.PUBLISHED },
      include: productInclude,
    });
    if (product === null) {
      throw new CatalogError('not_found', 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    const mapped = mapProduct(product);
    if (
      colorVariantId !== null &&
      !mapped.variants.some(
        (variant) => variant.id === colorVariantId && variant.status === 'published',
      )
    ) {
      throw new CatalogError(
        'not_found',
        'COLOR_VARIANT_NOT_FOUND',
        'Color variant was not found for this product.',
      );
    }
    return toProductDetail(mapped, colorVariantId, false);
  }

  async listAdminCategories(): Promise<CategoryValue[]> {
    const categories = await this.prisma.category.findMany({
      include: { heroMedia: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map(mapCategory);
  }

  async createCategory(input: AdminCategoryInput, actor: ActorContext): Promise<CategoryValue> {
    try {
      const category = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.category.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            displayOrder: input.displayOrder,
            status: toPrismaStatus[input.status],
            discoveryKind: input.discoveryKind === 'occasion' ? 'OCCASION' : 'CATALOG',
            editorialTitle: input.editorialTitle ?? null,
            editorialDescription: input.editorialDescription ?? null,
            heroMediaId: input.heroMediaId ?? null,
            seoTitle: input.seoTitle ?? null,
            seoDescription: input.seoDescription ?? null,
          },
          include: { heroMedia: true },
        });
        await transaction.businessEvent.create({
          data: {
            type: 'CategoryCreated',
            actorId: actor.actorId,
            entityType: 'Category',
            entityId: created.id,
            correlationId: actor.correlationId,
            payload: { slug: created.slug, status: input.status },
          },
        });
        return created;
      });
      return mapCategory(category);
    } catch (error: unknown) {
      this.mapPrismaConflict(error, 'CATEGORY_SLUG_CONFLICT', 'Category slug already exists.');
    }
  }

  async updateCategory(
    id: string,
    input: AdminCategoryInput,
    expectedVersion: number,
    actor: ActorContext,
  ): Promise<CategoryValue> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (input.heroMediaId != null) {
          const media = await transaction.mediaAsset.findFirst({
            where: { id: input.heroMediaId, archivedAt: null },
            select: { id: true },
          });
          if (media === null) {
            throw new CatalogError(
              'validation',
              'CATEGORY_MEDIA_INVALID',
              'Category Hero Media is unavailable.',
            );
          }
        }
        const result = await transaction.category.updateMany({
          where: { id, version: expectedVersion },
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            displayOrder: input.displayOrder,
            status: toPrismaStatus[input.status],
            discoveryKind: input.discoveryKind === 'occasion' ? 'OCCASION' : 'CATALOG',
            editorialTitle: input.editorialTitle ?? null,
            editorialDescription: input.editorialDescription ?? null,
            heroMediaId: input.heroMediaId ?? null,
            seoTitle: input.seoTitle ?? null,
            seoDescription: input.seoDescription ?? null,
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) {
          throw new CatalogError(
            'conflict',
            'CATEGORY_VERSION_CONFLICT',
            'Category changed. Reload before saving.',
          );
        }
        const updated = await transaction.category.findUniqueOrThrow({
          where: { id },
          include: { heroMedia: true },
        });
        await transaction.businessEvent.create({
          data: {
            type: 'CategoryEditorialUpdated',
            actorId: actor.actorId,
            entityType: 'Category',
            entityId: id,
            correlationId: actor.correlationId,
            payload: {
              slug: updated.slug,
              discoveryKind: input.discoveryKind,
              status: input.status,
            },
          },
        });
        return mapCategory(updated);
      });
    } catch (error: unknown) {
      this.mapPrismaConflict(error, 'CATEGORY_SLUG_CONFLICT', 'Category slug already exists.');
    }
  }

  async listMedia(): Promise<MediaValue[]> {
    const media = await this.prisma.mediaAsset.findMany({
      where: { archivedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return media.map(mapMedia);
  }

  async createMedia(input: AdminMediaInput, actor: ActorContext): Promise<MediaValue> {
    const media = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.mediaAsset.create({
        data: {
          url: input.url,
          width: input.width,
          height: input.height,
          altText: input.alt,
          colorHex: input.colorHex ?? null,
          focalPointX: input.focalPoint.x,
          focalPointY: input.focalPoint.y,
          format: toPrismaFormat[input.format],
          group: toPrismaGroup[input.group],
        },
      });
      await transaction.businessEvent.create({
        data: {
          type: 'MediaCreated',
          actorId: actor.actorId,
          entityType: 'MediaAsset',
          entityId: created.id,
          correlationId: actor.correlationId,
          payload: { url: created.url, group: input.group },
        },
      });
      return created;
    });
    return mapMedia(media);
  }

  async listAdminProducts(query: CatalogQuery): Promise<ProductValue[]> {
    const search = query.search === null ? undefined : normalizePersianSearch(query.search);
    const products = await this.prisma.product.findMany({
      where: {
        ...(search === undefined || search.length === 0
          ? {}
          : { searchText: { contains: search, mode: 'insensitive' } }),
      },
      orderBy: { updatedAt: 'desc' },
      take: query.limit,
      include: productInclude,
    });
    return products.map(mapProduct);
  }

  async getAdminProduct(id: string): Promise<ProductValue> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (product === null) {
      throw new CatalogError('not_found', 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    return mapProduct(product);
  }

  async createProduct(input: AdminProductInput, actor: ActorContext): Promise<ProductValue> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const categories = await this.assertReferences(
          transaction,
          input.categoryIds,
          input.variants,
        );
        const product = await transaction.product.create({
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            details: input.details,
            seoTitle: input.seo.title,
            seoDescription: input.seo.description,
            categories: {
              create: input.categoryIds.map((categoryId) => ({ categoryId })),
            },
          },
        });

        for (const variantInput of input.variants) {
          await this.createVariant(transaction, product.id, variantInput, actor);
        }

        await transaction.product.update({
          where: { id: product.id },
          data: {
            searchText: this.buildSearchText(
              input,
              categories.map((category) => category.name),
            ),
          },
        });
        await this.createEvent(transaction, actor, 'ProductCreated', 'Product', product.id, {
          slug: product.slug,
        });
        return mapProduct(await this.findProduct(transaction, product.id));
      });
    } catch (error: unknown) {
      this.mapPrismaConflict(
        error,
        'CATALOG_UNIQUENESS_CONFLICT',
        'A product slug, color, size, or internal code is already in use.',
      );
    }
  }

  async updateProduct(
    id: string,
    input: AdminProductInput,
    expectedVersion: number,
    actor: ActorContext,
  ): Promise<ProductValue> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await this.findProduct(transaction, id);
        if (current.version !== expectedVersion) {
          throw new CatalogError(
            'conflict',
            'STALE_PRODUCT_VERSION',
            'Product was changed by another administrator.',
          );
        }
        const categories = await this.assertReferences(
          transaction,
          input.categoryIds,
          input.variants,
        );
        const updated = await transaction.product.updateMany({
          where: { id, version: expectedVersion },
          data: {
            name: input.name,
            slug: input.slug,
            description: input.description,
            details: input.details,
            seoTitle: input.seo.title,
            seoDescription: input.seo.description,
            searchText: this.buildSearchText(
              input,
              categories.map((category) => category.name),
            ),
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new CatalogError(
            'conflict',
            'STALE_PRODUCT_VERSION',
            'Product was changed by another administrator.',
          );
        }
        await transaction.productCategory.deleteMany({ where: { productId: id } });
        await transaction.productCategory.createMany({
          data: input.categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        });

        const retainedVariantIds = new Set<string>();
        for (const variantInput of input.variants) {
          if (variantInput.id === undefined) {
            const variantId = await this.createVariant(transaction, id, variantInput, actor);
            retainedVariantIds.add(variantId);
          } else {
            retainedVariantIds.add(variantInput.id);
            await this.updateVariant(transaction, id, variantInput, actor);
          }
        }
        await transaction.colorVariant.updateMany({
          where: {
            productId: id,
            id: { notIn: [...retainedVariantIds] },
          },
          data: {
            status: PrismaPublicationStatus.ARCHIVED,
            archivedAt: new Date(),
          },
        });

        await this.createEvent(transaction, actor, 'ProductUpdated', 'Product', id, {
          version: expectedVersion + 1,
        });
        return mapProduct(await this.findProduct(transaction, id));
      });
    } catch (error: unknown) {
      if (error instanceof CatalogError) throw error;
      this.mapPrismaConflict(
        error,
        'CATALOG_UNIQUENESS_CONFLICT',
        'A product slug, color, size, or internal code is already in use.',
      );
    }
  }

  async validateProduct(id: string): Promise<PublicationValidation> {
    return validateProductPublication(await this.getAdminProduct(id));
  }

  async previewProduct(id: string): Promise<ProductDetailValue> {
    return toProductDetail(await this.getAdminProduct(id), null, true);
  }

  async publishProduct(
    id: string,
    idempotencyKey: string,
    actor: ActorContext,
  ): Promise<ProductValue> {
    return this.prisma.$transaction(async (transaction) => {
      const hash = requestHash({ id, command: 'publish' });
      const receipt = await transaction.commandReceipt.findUnique({
        where: { idempotencyKey },
      });
      if (receipt !== null) {
        if (
          receipt.commandType !== 'PublishProduct' ||
          receipt.entityId !== id ||
          receipt.requestHash !== hash
        ) {
          throw new CatalogError(
            'conflict',
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was reused with a different command.',
          );
        }
        return mapProduct(await this.findProduct(transaction, id));
      }

      const product = mapProduct(await this.findProduct(transaction, id));
      const validation = validateProductPublication(product);
      if (!validation.valid) {
        throw new CatalogError(
          'validation',
          'PRODUCT_PUBLICATION_FAILED',
          'Product is not ready to publish.',
          validation.errors.map((item) => ({
            path: item.path,
            code: item.ruleId,
            message: item.message,
          })),
        );
      }

      const now = new Date();
      await transaction.product.update({
        where: { id },
        data: {
          status: PrismaPublicationStatus.PUBLISHED,
          publishedAt: now,
          archivedAt: null,
          version: { increment: 1 },
        },
      });
      await transaction.colorVariant.updateMany({
        where: { productId: id, status: { not: PrismaPublicationStatus.ARCHIVED } },
        data: { status: PrismaPublicationStatus.PUBLISHED, archivedAt: null },
      });
      await transaction.sku.updateMany({
        where: {
          colorVariant: {
            productId: id,
            status: PrismaPublicationStatus.PUBLISHED,
          },
          status: { not: PrismaPublicationStatus.ARCHIVED },
        },
        data: { status: PrismaPublicationStatus.PUBLISHED, archivedAt: null },
      });
      await this.createEvent(transaction, actor, 'ProductPublished', 'Product', id, {
        ruleIds: ['PUB-003', 'PUB-006', 'PUB-007', 'PUB-008', 'PUB-010'],
      });
      await transaction.commandReceipt.create({
        data: {
          idempotencyKey,
          commandType: 'PublishProduct',
          requestHash: hash,
          entityId: id,
        },
      });
      return mapProduct(await this.findProduct(transaction, id));
    });
  }

  async archiveProduct(
    id: string,
    idempotencyKey: string,
    actor: ActorContext,
  ): Promise<ProductValue> {
    return this.prisma.$transaction(async (transaction) => {
      const hash = requestHash({ id, command: 'archive' });
      const receipt = await transaction.commandReceipt.findUnique({
        where: { idempotencyKey },
      });
      if (receipt !== null) {
        if (
          receipt.commandType !== 'ArchiveProduct' ||
          receipt.entityId !== id ||
          receipt.requestHash !== hash
        ) {
          throw new CatalogError(
            'conflict',
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was reused with a different command.',
          );
        }
        return mapProduct(await this.findProduct(transaction, id));
      }
      await this.findProduct(transaction, id);
      await transaction.product.update({
        where: { id },
        data: {
          status: PrismaPublicationStatus.ARCHIVED,
          archivedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await this.createEvent(transaction, actor, 'ProductArchived', 'Product', id, {});
      await transaction.commandReceipt.create({
        data: {
          idempotencyKey,
          commandType: 'ArchiveProduct',
          requestHash: hash,
          entityId: id,
        },
      });
      return mapProduct(await this.findProduct(transaction, id));
    });
  }

  async createPrice(
    skuId: string,
    amountRial: number,
    reason: string,
    actor: ActorContext,
  ): Promise<MoneyValue> {
    if (!Number.isSafeInteger(amountRial) || amountRial <= 0) {
      throw new CatalogError(
        'validation',
        'INVALID_PRICE',
        'Price must be a positive integer IRR amount.',
      );
    }
    await this.prisma.$transaction(async (transaction) => {
      const sku = await transaction.sku.findUnique({ where: { id: skuId } });
      if (sku === null) {
        throw new CatalogError(
          'not_found',
          'SKU_NOT_FOUND',
          'The selected product option was not found.',
        );
      }
      await this.appendPrice(transaction, skuId, amountRial, reason, actor);
    });
    return {
      amountRial,
      currency: 'IRR',
      display: formatIrrAsToman(amountRial),
    };
  }

  async getInventory(skuId: string): Promise<InventoryValue> {
    const inventory = await this.prisma.inventory.findUnique({ where: { skuId } });
    if (inventory === null) {
      throw new CatalogError('not_found', 'INVENTORY_NOT_FOUND', 'Inventory was not found.');
    }
    return mapInventory(inventory);
  }

  async applyInventoryAction(
    skuId: string,
    input: InventoryActionInput,
    idempotencyKey: string,
    actor: ActorContext,
  ): Promise<InventoryValue> {
    return this.prisma.$transaction(async (transaction) => {
      const normalizedInput: InventoryActionInput = { ...input, reason: input.reason.trim() };
      const fingerprint = commandFingerprint({
        commandType: 'operations.inventory.action',
        target: { type: 'SKU', id: skuId },
        version: null,
        payload: {
          action: normalizedInput.action,
          quantity: normalizedInput.quantity,
          reason: normalizedInput.reason,
        },
      });
      const claim = await transaction.commandReceipt.createMany({
        data: [
          {
            idempotencyKey,
            commandType: fingerprint.commandType,
            requestHash: fingerprint.requestHash,
            entityId: fingerprint.targetId,
          },
        ],
        skipDuplicates: true,
      });
      const receipt = await transaction.commandReceipt.findUniqueOrThrow({
        where: { idempotencyKey },
      });
      if (
        receipt.commandType !== fingerprint.commandType ||
        receipt.entityId !== fingerprint.targetId ||
        receipt.requestHash !== fingerprint.requestHash
      ) {
        throw new CatalogError(
          'conflict',
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency key was reused with different inventory input.',
        );
      }

      if (claim.count === 0) {
        const current = await transaction.inventory.findUnique({ where: { skuId } });
        if (current === null) {
          throw new CatalogError('not_found', 'INVENTORY_NOT_FOUND', 'Inventory was not found.');
        }
        return mapInventory(current);
      }

      const replay = await transaction.inventoryMovement.findUnique({
        where: { idempotencyKey },
      });
      if (replay !== null) {
        if (
          replay.skuId !== skuId ||
          replay.action !== toPrismaInventoryAction[normalizedInput.action] ||
          replay.quantityDelta !==
            (['production', 'instagram_return'].includes(normalizedInput.action)
              ? Math.abs(normalizedInput.quantity)
              : -Math.abs(normalizedInput.quantity)) ||
          replay.reason !== normalizedInput.reason
        ) {
          throw new CatalogError(
            'conflict',
            'IDEMPOTENCY_KEY_REUSED',
            'Idempotency key was reused with different inventory input.',
          );
        }
        const current = await transaction.inventory.findUnique({ where: { skuId } });
        if (current === null) {
          throw new CatalogError('not_found', 'INVENTORY_NOT_FOUND', 'Inventory was not found.');
        }
        return mapInventory(current);
      }

      const inventory = await transaction.inventory.findUnique({ where: { skuId } });
      if (inventory === null) {
        throw new CatalogError('not_found', 'INVENTORY_NOT_FOUND', 'Inventory was not found.');
      }
      const current = mapInventory(inventory);
      let next: InventoryValue;
      try {
        next = applyInventoryDelta(current, normalizedInput);
      } catch (error: unknown) {
        if (error instanceof InventoryInvariantError) {
          throw new CatalogError('validation', 'INVENTORY_INVARIANT', error.message);
        }
        throw error;
      }
      const updated = await transaction.inventory.updateMany({
        where: { skuId, version: current.version },
        data: {
          physicalQuantity: next.physicalQuantity,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new CatalogError(
          'conflict',
          'INVENTORY_CONCURRENT_UPDATE',
          'Inventory changed concurrently. Retry with a new idempotency key.',
        );
      }
      await transaction.inventoryMovement.create({
        data: {
          skuId,
          action: toPrismaInventoryAction[normalizedInput.action],
          quantityDelta: next.physicalQuantity - current.physicalQuantity,
          beforePhysicalQuantity: current.physicalQuantity,
          afterPhysicalQuantity: next.physicalQuantity,
          beforeReservedQuantity: current.reservedQuantity,
          afterReservedQuantity: next.reservedQuantity,
          actorId: actor.actorId,
          reason: normalizedInput.reason,
          correlationId: actor.correlationId,
          idempotencyKey,
        },
      });
      await this.createEvent(
        transaction,
        actor,
        next.physicalQuantity > current.physicalQuantity
          ? 'InventoryIncreased'
          : 'InventoryDecreased',
        'SKU',
        skuId,
        {
          action: normalizedInput.action,
          beforePhysicalQuantity: current.physicalQuantity,
          afterPhysicalQuantity: next.physicalQuantity,
        },
      );
      return next;
    });
  }

  private async findProduct(transaction: Transaction, id: string): Promise<ProductRecord> {
    const product = await transaction.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (product === null) {
      throw new CatalogError('not_found', 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    return product;
  }

  private async assertReferences(
    transaction: Transaction,
    categoryIds: string[],
    variants: AdminColorVariantInput[],
  ) {
    const categories = await transaction.category.findMany({
      where: { id: { in: categoryIds }, status: { not: PrismaPublicationStatus.ARCHIVED } },
    });
    if (categories.length !== new Set(categoryIds).size) {
      throw new CatalogError(
        'validation',
        'CATEGORY_REFERENCE_INVALID',
        'One or more categories do not exist or are archived.',
      );
    }
    const mediaIds = [...new Set(variants.flatMap((variant) => variant.mediaIds))];
    const mediaCount = await transaction.mediaAsset.count({
      where: { id: { in: mediaIds }, archivedAt: null },
    });
    if (mediaCount !== mediaIds.length) {
      throw new CatalogError(
        'validation',
        'MEDIA_REFERENCE_INVALID',
        'One or more media assets do not exist or are archived.',
      );
    }
    for (const variant of variants) {
      if (!variant.mediaIds.includes(variant.featuredMediaId)) {
        throw new CatalogError(
          'validation',
          'FEATURED_MEDIA_INVALID',
          'Featured media must be assigned to its color variant.',
        );
      }
    }
    return categories;
  }

  private async createVariant(
    transaction: Transaction,
    productId: string,
    input: AdminColorVariantInput,
    actor: ActorContext,
  ): Promise<string> {
    const variant = await transaction.colorVariant.create({
      data: {
        productId,
        name: input.name,
        normalizedColorCode: input.normalizedColorCode,
        displayHex: input.hex,
        displayOrder: input.displayOrder,
        status: toPrismaStatus[input.status ?? 'draft'],
      },
    });
    await transaction.mediaAssignment.createMany({
      data: input.mediaIds.map((mediaAssetId, index) => ({
        colorVariantId: variant.id,
        mediaAssetId,
        displayOrder: index,
        featured: mediaAssetId === input.featuredMediaId,
      })),
    });
    for (const skuInput of input.skus) {
      await this.createSku(transaction, variant.id, skuInput, actor);
    }
    return variant.id;
  }

  private async updateVariant(
    transaction: Transaction,
    productId: string,
    input: AdminColorVariantInput & { id?: string },
    actor: ActorContext,
  ): Promise<void> {
    if (input.id === undefined) return;
    const variantId = input.id;
    const current = await transaction.colorVariant.findFirst({
      where: { id: variantId, productId },
      include: { skus: { include: { currentPrice: true, inventory: true } } },
    });
    if (current === null) {
      throw new CatalogError(
        'validation',
        'COLOR_VARIANT_REFERENCE_INVALID',
        'Color variant does not belong to this product.',
      );
    }
    await transaction.colorVariant.update({
      where: { id: variantId },
      data: {
        name: input.name,
        normalizedColorCode: input.normalizedColorCode,
        displayHex: input.hex,
        displayOrder: input.displayOrder,
        version: { increment: 1 },
      },
    });
    await transaction.mediaAssignment.deleteMany({ where: { colorVariantId: variantId } });
    await transaction.mediaAssignment.createMany({
      data: input.mediaIds.map((mediaAssetId, index) => ({
        colorVariantId: variantId,
        mediaAssetId,
        displayOrder: index,
        featured: mediaAssetId === input.featuredMediaId,
      })),
    });

    const retainedSkuIds = new Set<string>();
    for (const skuInput of input.skus) {
      if (skuInput.id === undefined) {
        retainedSkuIds.add(await this.createSku(transaction, variantId, skuInput, actor));
        continue;
      }
      retainedSkuIds.add(skuInput.id);
      const currentSku = current.skus.find((sku) => sku.id === skuInput.id);
      if (currentSku === undefined) {
        throw new CatalogError(
          'validation',
          'SKU_REFERENCE_INVALID',
          'The selected size does not belong to this color.',
        );
      }
      if (currentSku.code !== skuInput.code) {
        throw new CatalogError(
          'validation',
          'SKU_CODE_IMMUTABLE',
          'The internal code cannot change after creation.',
        );
      }
      if (
        currentSku.inventory !== null &&
        currentSku.inventory.physicalQuantity !== skuInput.physicalQuantity
      ) {
        throw new CatalogError(
          'validation',
          'INVENTORY_ACTION_REQUIRED',
          'Existing inventory must be changed through an inventory action.',
        );
      }
      await transaction.sku.update({
        where: { id: skuInput.id },
        data: {
          normalizedSize: skuInput.normalizedSize,
          displaySize: skuInput.displaySize,
        },
      });
      if (
        currentSku.currentPrice === null ||
        currentSku.currentPrice.amountRial !== BigInt(skuInput.amountRial)
      ) {
        await this.appendPrice(
          transaction,
          skuInput.id,
          skuInput.amountRial,
          'ویرایش محصول',
          actor,
        );
      }
    }
    await transaction.sku.updateMany({
      where: {
        colorVariantId: variantId,
        id: { notIn: [...retainedSkuIds] },
      },
      data: {
        status: PrismaPublicationStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });
  }

  private async createSku(
    transaction: Transaction,
    colorVariantId: string,
    input: AdminSkuInput,
    actor: ActorContext,
  ): Promise<string> {
    if (
      !Number.isSafeInteger(input.amountRial) ||
      input.amountRial <= 0 ||
      !Number.isInteger(input.physicalQuantity) ||
      input.physicalQuantity < 0
    ) {
      throw new CatalogError(
        'validation',
        'SKU_COMMERCIAL_VALUE_INVALID',
        'The product option price or inventory value is invalid.',
      );
    }
    const sku = await transaction.sku.create({
      data: {
        colorVariantId,
        code: input.code,
        normalizedSize: input.normalizedSize,
        displaySize: input.displaySize,
        status: toPrismaStatus[input.status ?? 'draft'],
        inventory: {
          create: {
            physicalQuantity: input.physicalQuantity,
            reservedQuantity: 0,
          },
        },
      },
    });
    await this.appendPrice(transaction, sku.id, input.amountRial, 'قیمت اولیه', actor);
    if (input.physicalQuantity > 0) {
      await transaction.inventoryMovement.create({
        data: {
          skuId: sku.id,
          action: PrismaInventoryAction.PRODUCTION,
          quantityDelta: input.physicalQuantity,
          beforePhysicalQuantity: 0,
          afterPhysicalQuantity: input.physicalQuantity,
          beforeReservedQuantity: 0,
          afterReservedQuantity: 0,
          actorId: actor.actorId,
          reason: 'موجودی اولیه',
          correlationId: actor.correlationId,
          idempotencyKey: `initial-${sku.id}`,
        },
      });
      await this.createEvent(transaction, actor, 'InventoryIncreased', 'SKU', sku.id, {
        beforePhysicalQuantity: 0,
        afterPhysicalQuantity: input.physicalQuantity,
      });
    }
    return sku.id;
  }

  private async appendPrice(
    transaction: Transaction,
    skuId: string,
    amountRial: number,
    reason: string,
    actor: ActorContext,
  ): Promise<void> {
    if (!Number.isSafeInteger(amountRial) || amountRial <= 0) {
      throw new CatalogError(
        'validation',
        'INVALID_PRICE',
        'Price must be a positive integer IRR amount.',
      );
    }
    const now = new Date();
    const previous = await transaction.currentSkuPrice.findUnique({ where: { skuId } });
    const record = await transaction.priceRecord.create({
      data: {
        skuId,
        amountRial: BigInt(amountRial),
        validFrom: now,
        actorId: actor.actorId,
        reason,
      },
    });
    await transaction.currentSkuPrice.upsert({
      where: { skuId },
      create: {
        skuId,
        priceRecordId: record.id,
        amountRial: BigInt(amountRial),
      },
      update: {
        priceRecordId: record.id,
        amountRial: BigInt(amountRial),
        version: { increment: 1 },
      },
    });
    await this.createEvent(transaction, actor, 'PriceChanged', 'SKU', skuId, {
      previousAmountRial: previous === null ? null : toSafeNumber(previous.amountRial),
      amountRial,
    });
  }

  private buildSearchText(input: AdminProductInput, categoryNames: string[]): string {
    return normalizePersianSearch(
      [
        input.name,
        input.description,
        ...input.details,
        ...categoryNames,
        ...input.variants.flatMap((variant) => [
          variant.name,
          variant.normalizedColorCode,
          ...variant.skus.flatMap((sku) => [sku.code, sku.normalizedSize, sku.displaySize]),
        ]),
      ].join(' '),
    );
  }

  private async createEvent(
    transaction: Transaction,
    actor: ActorContext,
    type: string,
    entityType: string,
    entityId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await transaction.businessEvent.create({
      data: {
        type,
        actorId: actor.actorId,
        entityType,
        entityId,
        correlationId: actor.correlationId,
        payload,
      },
    });
  }

  private mapPrismaConflict(error: unknown, code: string, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new CatalogError('conflict', code, message);
    }
    if (error instanceof CatalogError) throw error;
    throw error;
  }
}
