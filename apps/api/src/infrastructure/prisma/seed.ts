import {
  InventoryAction,
  MediaFormat,
  MediaGroup,
  type Prisma,
  PrismaClient,
  PublicationStatus,
} from '@prisma/client';

const seedVersion = 'milestone-2-catalog';
const categoryId = '20000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000010';
const variantId = '20000000-0000-4000-8000-000000000020';
const frontMediaId = '20000000-0000-4000-8000-000000000031';
const backMediaId = '20000000-0000-4000-8000-000000000032';
const detailMediaId = '20000000-0000-4000-8000-000000000033';
const eventId = '20000000-0000-4000-8000-000000000060';
const correlationId = '20000000-0000-4000-8000-000000000099';
const publishedAt = new Date('2026-07-31T00:00:00.000Z');
const mediaIds = [frontMediaId, backMediaId, detailMediaId];
const prisma = new PrismaClient();

const media = [
  {
    id: frontMediaId,
    url: '/media/catalog/linen-suit-front.webp',
    width: 1122,
    height: 1402,
    altText: 'نمای روبه‌روی کت‌وشلوار لینن بژ بچگانه',
    focalPointX: 0.5,
    focalPointY: 0.48,
  },
  {
    id: backMediaId,
    url: '/media/catalog/linen-suit-back.webp',
    width: 1122,
    height: 1402,
    altText: 'نمای پشت کت‌وشلوار لینن بژ بچگانه',
    focalPointX: 0.5,
    focalPointY: 0.48,
  },
  {
    id: detailMediaId,
    url: '/media/catalog/linen-suit-detail.webp',
    width: 1122,
    height: 1402,
    altText: 'جزئیات بافت لینن، یقه و جیب کت بژ',
    focalPointX: 0.48,
    focalPointY: 0.42,
  },
] as const;

const skuInputs = [
  {
    id: '20000000-0000-4000-8000-000000000041',
    priceRecordId: '20000000-0000-4000-8000-000000000051',
    code: 'KELE-LINEN-BEIGE-5Y',
    normalizedSize: '5y',
    displaySize: '۵ سال',
    amountRial: 39_800_000n,
    physicalQuantity: 4,
  },
  {
    id: '20000000-0000-4000-8000-000000000042',
    priceRecordId: '20000000-0000-4000-8000-000000000052',
    code: 'KELE-LINEN-BEIGE-6Y',
    normalizedSize: '6y',
    displaySize: '۶ سال',
    amountRial: 39_800_000n,
    physicalQuantity: 2,
  },
  {
    id: '20000000-0000-4000-8000-000000000043',
    priceRecordId: '20000000-0000-4000-8000-000000000053',
    code: 'KELE-LINEN-BEIGE-7Y',
    normalizedSize: '7y',
    displaySize: '۷ سال',
    amountRial: 41_200_000n,
    physicalQuantity: 0,
  },
] as const;

async function resetCatalogForE2E(transaction: Prisma.TransactionClient): Promise<void> {
  await transaction.commandReceipt.deleteMany();
  await transaction.businessEvent.deleteMany();
  await transaction.inventoryMovement.deleteMany();
  await transaction.currentSkuPrice.deleteMany();
  await transaction.priceRecord.deleteMany();
  await transaction.inventory.deleteMany();
  await transaction.mediaAssignment.deleteMany();
  await transaction.sku.deleteMany();
  await transaction.colorVariant.deleteMany();
  await transaction.productCategory.deleteMany();
  await transaction.product.deleteMany();
  await transaction.category.deleteMany();
  await transaction.mediaAsset.deleteMany();
}

async function reconcileSeed(transaction: Prisma.TransactionClient): Promise<void> {
  await transaction.category.upsert({
    where: { id: categoryId },
    create: {
      id: categoryId,
      name: 'کت‌وشلوار',
      slug: 'suits',
      description: 'انتخابی آرام از کت‌وشلوارهای رسمی پسرانه.',
      displayOrder: 10,
      status: PublicationStatus.PUBLISHED,
    },
    update: {
      name: 'کت‌وشلوار',
      slug: 'suits',
      description: 'انتخابی آرام از کت‌وشلوارهای رسمی پسرانه.',
      displayOrder: 10,
      status: PublicationStatus.PUBLISHED,
      archivedAt: null,
      version: 1,
    },
  });

  for (const item of media) {
    await transaction.mediaAsset.upsert({
      where: { id: item.id },
      create: {
        ...item,
        format: MediaFormat.WEBP,
        group: MediaGroup.PRODUCT_IMAGES,
      },
      update: {
        url: item.url,
        width: item.width,
        height: item.height,
        altText: item.altText,
        focalPointX: item.focalPointX,
        focalPointY: item.focalPointY,
        format: MediaFormat.WEBP,
        group: MediaGroup.PRODUCT_IMAGES,
        archivedAt: null,
      },
    });
  }

  const productData = {
    name: 'کت‌وشلوار لینن بژ',
    slug: 'beige-linen-suit',
    description:
      'کت‌وشلواری سبک با بافت طبیعی لینن، برش تمیز و جزئیاتی سنجیده برای موقعیت‌های رسمی.',
    details: [
      'پارچهٔ لینن با بافت طبیعی',
      'کت تک‌ردیفه با یقهٔ کلاسیک',
      'شلوار راسته با اتوی ظریف',
    ],
    seoTitle: 'کت‌وشلوار لینن بژ پسرانه | KELE',
    seoDescription: 'مشاهدهٔ رنگ، اندازه، موجودی و جزئیات کت‌وشلوار لینن بژ پسرانه KELE.',
    searchText: 'کت شلوار لینن بژ پسرانه رسمی suits beige linen 5y 6y 7y',
    status: PublicationStatus.PUBLISHED,
    publishedAt,
    archivedAt: null,
    version: 1,
  };
  await transaction.product.upsert({
    where: { id: productId },
    create: { id: productId, ...productData },
    update: productData,
  });
  await transaction.productCategory.upsert({
    where: { productId_categoryId: { productId, categoryId } },
    create: { productId, categoryId },
    update: {},
  });

  await transaction.colorVariant.upsert({
    where: { id: variantId },
    create: {
      id: variantId,
      productId,
      name: 'بژ',
      normalizedColorCode: 'beige',
      displayHex: '#D4C2A8',
      displayOrder: 0,
      status: PublicationStatus.PUBLISHED,
    },
    update: {
      productId,
      name: 'بژ',
      normalizedColorCode: 'beige',
      displayHex: '#D4C2A8',
      displayOrder: 0,
      status: PublicationStatus.PUBLISHED,
      archivedAt: null,
      version: 1,
    },
  });
  for (const [displayOrder, mediaAssetId] of mediaIds.entries()) {
    await transaction.mediaAssignment.upsert({
      where: { colorVariantId_mediaAssetId: { colorVariantId: variantId, mediaAssetId } },
      create: {
        colorVariantId: variantId,
        mediaAssetId,
        displayOrder,
        featured: displayOrder === 0,
      },
      update: { displayOrder, featured: displayOrder === 0 },
    });
  }

  for (const skuInput of skuInputs) {
    await transaction.sku.upsert({
      where: { id: skuInput.id },
      create: {
        id: skuInput.id,
        colorVariantId: variantId,
        code: skuInput.code,
        normalizedSize: skuInput.normalizedSize,
        displaySize: skuInput.displaySize,
        status: PublicationStatus.PUBLISHED,
      },
      update: {
        colorVariantId: variantId,
        code: skuInput.code,
        normalizedSize: skuInput.normalizedSize,
        displaySize: skuInput.displaySize,
        status: PublicationStatus.PUBLISHED,
        archivedAt: null,
      },
    });
    await transaction.priceRecord.upsert({
      where: { id: skuInput.priceRecordId },
      create: {
        id: skuInput.priceRecordId,
        skuId: skuInput.id,
        amountRial: skuInput.amountRial,
        validFrom: publishedAt,
        actorId: 'seed',
        reason: 'دادهٔ قطعی آزمون Milestone 2',
      },
      update: {},
    });
    await transaction.currentSkuPrice.upsert({
      where: { skuId: skuInput.id },
      create: {
        skuId: skuInput.id,
        priceRecordId: skuInput.priceRecordId,
        amountRial: skuInput.amountRial,
      },
      update: {
        priceRecordId: skuInput.priceRecordId,
        amountRial: skuInput.amountRial,
        version: 1,
      },
    });
    await transaction.inventory.upsert({
      where: { skuId: skuInput.id },
      create: {
        skuId: skuInput.id,
        physicalQuantity: skuInput.physicalQuantity,
        reservedQuantity: 0,
      },
      update: {
        physicalQuantity: skuInput.physicalQuantity,
        reservedQuantity: 0,
        version: 1,
      },
    });
    if (skuInput.physicalQuantity > 0) {
      await transaction.inventoryMovement.upsert({
        where: { idempotencyKey: `seed-${skuInput.code}` },
        create: {
          skuId: skuInput.id,
          action: InventoryAction.PRODUCTION,
          quantityDelta: skuInput.physicalQuantity,
          beforePhysicalQuantity: 0,
          afterPhysicalQuantity: skuInput.physicalQuantity,
          beforeReservedQuantity: 0,
          afterReservedQuantity: 0,
          actorId: 'seed',
          reason: 'موجودی قطعی آزمون Milestone 2',
          correlationId,
          idempotencyKey: `seed-${skuInput.code}`,
        },
        update: {},
      });
    }
  }

  const seedEvent = await transaction.businessEvent.findFirst({
    where: { type: 'ProductPublished', actorId: 'seed', entityId: productId },
  });
  if (seedEvent === null) {
    await transaction.businessEvent.create({
      data: {
        id: eventId,
        type: 'ProductPublished',
        actorId: 'seed',
        entityType: 'Product',
        entityId: productId,
        correlationId,
        payload: {
          ruleIds: ['CAT-001', 'PUB-006', 'PUB-007', 'PUB-008'],
          deterministic: true,
        },
      },
    });
  }
  await transaction.seedLedger.upsert({
    where: { key: seedVersion },
    create: { key: seedVersion },
    update: {},
  });
}

async function assertExactE2EFixture(): Promise<void> {
  const counts = await prisma.$transaction([
    prisma.product.count(),
    prisma.category.count(),
    prisma.colorVariant.count(),
    prisma.mediaAsset.count(),
    prisma.sku.count(),
    prisma.priceRecord.count(),
    prisma.inventory.count(),
  ]);
  const expected = [1, 1, 1, 3, 3, 3, 3];
  if (counts.some((count, index) => count !== expected[index])) {
    throw new Error(
      `E2E fixture is not exclusive. Expected ${expected.join('/')} but found ${counts.join('/')}.`,
    );
  }
}

async function seed(): Promise<void> {
  const resetForE2E = process.env.E2E_DATABASE_RESET === 'true';
  if (resetForE2E && process.env.NODE_ENV !== 'test') {
    throw new Error('E2E_DATABASE_RESET is allowed only when NODE_ENV=test.');
  }

  await prisma.$transaction(async (transaction) => {
    if (resetForE2E) await resetCatalogForE2E(transaction);
    await reconcileSeed(transaction);
  });
  if (resetForE2E) await assertExactE2EFixture();
}

void seed()
  .then(() => process.stdout.write(`Reconciled deterministic seed: ${seedVersion}\n`))
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
