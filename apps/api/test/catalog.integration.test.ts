import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { PrismaCatalogRepository } from '../src/modules/catalog/infrastructure/prisma-catalog.repository.js';
import type {
  ActorContext,
  AdminProductInput,
} from '../src/modules/catalog/domain/catalog.types.js';

const prisma = new PrismaClient();
const repository = new PrismaCatalogRepository(prisma as PrismaService);
const runId = randomUUID();
const actor: ActorContext = {
  actorId: 'integration-super-admin',
  role: 'super_admin',
  correlationId: randomUUID(),
};

let productId = '';
let skuId = '';
let productSlug = '';
let categoryId = '';
let mediaId = '';

beforeAll(async () => {
  const category = await repository.createCategory(
    {
      name: `کت یکپارچه ${runId.slice(0, 8)}`,
      slug: `integration-category-${runId}`,
      description: 'دستهٔ آزمون یکپارچه',
      displayOrder: 900,
      status: 'published',
    },
    actor,
  );
  categoryId = category.id;
  const media = await repository.createMedia(
    {
      url: `/media/catalog/integration-${runId}.webp`,
      width: 1024,
      height: 1536,
      alt: 'نمای روبه‌روی محصول آزمون یکپارچه',
      format: 'webp',
      group: 'product_images',
      focalPoint: { x: 0.5, y: 0.42 },
    },
    actor,
  );
  mediaId = media.id;
  productSlug = `integration-linen-${runId}`;
  const input: AdminProductInput = {
    name: `کت لینن یکپارچه ${runId.slice(0, 8)}`,
    slug: productSlug,
    description: 'محصول کامل برای آزمون مسیر انتشار تا ویترین',
    details: ['پارچهٔ لینن', 'دوخت تمیز'],
    categoryIds: [category.id],
    seo: {
      title: 'کت لینن یکپارچه',
      description: 'شرح جست‌وجوی محصول یکپارچه',
    },
    variants: [
      {
        name: 'بژ',
        normalizedColorCode: `beige-${runId.slice(0, 12)}`,
        hex: '#d4c2a8',
        displayOrder: 0,
        mediaIds: [media.id],
        featuredMediaId: media.id,
        skus: [
          {
            code: `INT-${runId.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
            normalizedSize: '5y',
            displaySize: '۵ سال',
            amountRial: 39_800_000,
            physicalQuantity: 0,
          },
        ],
      },
    ],
  };
  const product = await repository.createProduct(input, actor);
  const sku = product.variants[0]?.skus[0];
  if (sku === undefined) {
    throw new Error('Created integration product did not contain its SKU.');
  }
  productId = product.id;
  skuId = sku.id;
});

afterAll(async () => {
  try {
    if (productId !== '') {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: { include: { skus: true } } },
      });
      const variantIds = product?.variants.map((variant) => variant.id) ?? [];
      const skuIds =
        product?.variants.flatMap((variant) => variant.skus.map((sku) => sku.id)) ?? [];
      const entityIds = [
        productId,
        ...variantIds,
        ...skuIds,
        ...(categoryId ? [categoryId] : []),
        ...(mediaId ? [mediaId] : []),
      ];
      await prisma.$transaction([
        prisma.commandReceipt.deleteMany({ where: { entityId: productId } }),
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
        prisma.product.deleteMany({ where: { id: productId } }),
      ]);
    }
    if (categoryId !== '') {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    if (mediaId !== '') {
      await prisma.mediaAsset.deleteMany({ where: { id: mediaId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe('پایداری و انتشار کاتالوگ روی PostgreSQL', () => {
  it('محصول کامل را اعتبارسنجی، به‌صورت idempotent منتشر و با موجودی صفر کشف می‌کند', async () => {
    await expect(repository.validateProduct(productId)).resolves.toEqual({
      valid: true,
      errors: [],
    });

    const idempotencyKey = `publish-${runId}`;
    const first = await repository.publishProduct(productId, idempotencyKey, actor);
    const replay = await repository.publishProduct(productId, idempotencyKey, actor);
    expect(first.status).toBe('published');
    expect(replay.status).toBe('published');

    const page = await repository.listPublicProducts({
      category: null,
      search: 'لينن یکپارچه',
      sort: 'newest',
      limit: 24,
      cursor: null,
    });
    expect(page.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ productId, slug: productSlug, available: false }),
      ]),
    );
    await expect(repository.getPublicProduct(productSlug, null)).resolves.toEqual(
      expect.objectContaining({ productId, slug: productSlug, available: false }),
    );

    expect(await prisma.commandReceipt.count({ where: { idempotencyKey } })).toBe(1);
    expect(
      await prisma.businessEvent.count({
        where: { entityId: productId, type: 'ProductPublished' },
      }),
    ).toBe(1);
  });

  it('حقایق قیمت را نگه می‌دارد و فقط projection جاری را عوض می‌کند', async () => {
    const previousProjection = await prisma.currentSkuPrice.findUniqueOrThrow({
      where: { skuId },
    });
    const previousFact = await prisma.priceRecord.findUniqueOrThrow({
      where: { id: previousProjection.priceRecordId },
    });
    const before = await prisma.priceRecord.count({ where: { skuId } });
    await repository.createPrice(skuId, 41_200_000, 'اصلاح قیمت آزمون', actor);
    const after = await prisma.priceRecord.count({ where: { skuId } });
    const current = await prisma.currentSkuPrice.findUniqueOrThrow({
      where: { skuId },
    });
    const unchangedPreviousFact = await prisma.priceRecord.findUniqueOrThrow({
      where: { id: previousFact.id },
    });

    expect(after).toBe(before + 1);
    expect(unchangedPreviousFact).toEqual(previousFact);
    expect(unchangedPreviousFact.validTo).toBeNull();
    expect(current.priceRecordId).not.toBe(previousFact.id);
    expect(current.amountRial).toBe(41_200_000n);
  });

  it('حرکت موجودی را idempotent ثبت و projection جاری را دوبار اعمال نمی‌کند', async () => {
    const idempotencyKey = `inventory-${runId}`;
    const command = {
      action: 'production' as const,
      quantity: 2,
      reason: 'تولید آزمون یکپارچه',
    };
    const first = await repository.applyInventoryAction(skuId, command, idempotencyKey, actor);
    const replay = await repository.applyInventoryAction(skuId, command, idempotencyKey, actor);

    expect(first.physicalQuantity).toBe(2);
    expect(replay.physicalQuantity).toBe(2);
    expect(await prisma.inventoryMovement.count({ where: { idempotencyKey } })).toBe(1);
  });
});
