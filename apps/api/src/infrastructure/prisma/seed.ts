import {
  InventoryAction,
  MediaFormat,
  MediaGroup,
  OutfitRevisionState,
  type Prisma,
  PrismaClient,
  PublicationStatus,
  ShippingMethodCode,
} from '@prisma/client';
import { assertE2EDatabaseResetEnvironment } from '@kele/config/e2e-database';

const seedVersion = 'milestone-5-outfit';
const categoryId = '20000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000010';
const variantId = '20000000-0000-4000-8000-000000000020';
const frontMediaId = '20000000-0000-4000-8000-000000000031';
const backMediaId = '20000000-0000-4000-8000-000000000032';
const detailMediaId = '20000000-0000-4000-8000-000000000033';
const eventId = '20000000-0000-4000-8000-000000000060';
const correlationId = '20000000-0000-4000-8000-000000000099';
const outfitId = '50000000-0000-4000-8000-000000000001';
const outfitRevisionId = '50000000-0000-4000-8000-000000000002';
const outfitItemId = '50000000-0000-4000-8000-000000000003';
const outfitEventId = '50000000-0000-4000-8000-000000000004';
const outfitMediaIds = [
  '50000000-0000-4000-8000-000000000031',
  '50000000-0000-4000-8000-000000000032',
  '50000000-0000-4000-8000-000000000033',
] as const;
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
  // E2E reset is guarded by assertE2EDatabaseResetEnvironment. TRUNCATE bypasses
  // published-revision row guards while CASCADE clears only the disposable test graph.
  await transaction.$executeRawUnsafe('TRUNCATE TABLE "outfits" CASCADE');
  await transaction.paymentCallbackReceipt.deleteMany();
  await transaction.paymentReconciliation.deleteMany();
  await transaction.databaseJob.deleteMany();
  await transaction.inventoryMovement.deleteMany();
  await transaction.orderItem.deleteMany();
  await transaction.order.deleteMany();
  await transaction.paymentAttempt.deleteMany();
  await transaction.inventoryReservation.deleteMany();
  await transaction.checkoutLine.deleteMany();
  await transaction.checkoutSession.deleteMany();
  await transaction.shippingMethodVersion.deleteMany();
  await transaction.shippingPolicyVersion.deleteMany();
  await transaction.cartMergeReceipt.deleteMany();
  await transaction.cartNotice.deleteMany();
  await transaction.cartLine.deleteMany();
  await transaction.cart.deleteMany();
  await transaction.address.deleteMany();
  await transaction.customerSession.deleteMany();
  await transaction.otpChallenge.deleteMany();
  await transaction.customer.deleteMany();
  await transaction.commandReceipt.deleteMany();
  await transaction.businessEvent.deleteMany();
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

async function reconcileOutfit(transaction: Prisma.TransactionClient): Promise<void> {
  for (const [index, source] of media.entries()) {
    const outfitMediaId = outfitMediaIds[index];
    if (outfitMediaId === undefined) throw new Error('Outfit seed media mapping is incomplete.');
    await transaction.mediaAsset.upsert({
      where: { id: outfitMediaId },
      create: {
        id: outfitMediaId,
        url: source.url,
        width: source.width,
        height: source.height,
        altText:
          index === 0
            ? 'نمای کامل استایل لینن آرام KELE'
            : index === 1
              ? 'نمای پشت استایل لینن آرام KELE'
              : 'جزئیات بافت استایل لینن آرام KELE',
        focalPointX: source.focalPointX,
        focalPointY: source.focalPointY,
        format: MediaFormat.WEBP,
        group: MediaGroup.OUTFIT_EDITORIAL,
      },
      update: { archivedAt: null },
    });
  }
  await transaction.outfit.upsert({
    where: { id: outfitId },
    create: { id: outfitId, slug: 'calm-linen-look' },
    update: {},
  });
  await transaction.outfitCategory.upsert({
    where: { outfitId_categoryId: { outfitId, categoryId } },
    create: { outfitId, categoryId },
    update: {},
  });
  const existing = await transaction.outfitRevision.findUnique({
    where: { id: outfitRevisionId },
  });
  if (existing === null) {
    await transaction.outfitRevision.create({
      data: {
        id: outfitRevisionId,
        outfitId,
        revisionNumber: 1,
        createdAt: publishedAt,
        state: OutfitRevisionState.DRAFT,
        name: 'استایل لینن آرام',
        description:
          'یک انتخاب کامل و روشن برای موقعیت‌های رسمی؛ اندازهٔ استایل مستقیماً به SKU واقعی کت‌وشلوار لینن متصل است.',
        seoTitle: 'استایل لینن آرام | KELE',
        seoDescription: 'مشاهدهٔ اندازه، قیمت مستقل و موجودی لحظه‌ای استایل لینن آرام KELE.',
      },
    });
    await transaction.outfitItem.create({
      data: {
        id: outfitItemId,
        outfitRevisionId,
        productId,
        defaultColorVariantId: variantId,
        quantity: 1,
        displayOrder: 0,
      },
    });
    for (const [displayOrder, mediaAssetId] of outfitMediaIds.entries()) {
      await transaction.outfitRevisionMedia.create({
        data: {
          outfitRevisionId,
          mediaAssetId,
          displayOrder,
          featured: displayOrder === 0,
        },
      });
    }
    for (const [displayOrder, sku] of skuInputs.entries()) {
      const size = await transaction.outfitSize.create({
        data: {
          outfitRevisionId,
          code: sku.normalizedSize.toUpperCase(),
          label: sku.displaySize,
          amountRial: sku.amountRial + 6_000_000n,
          displayOrder,
        },
      });
      await transaction.outfitSizeComponent.create({
        data: {
          outfitSizeId: size.id,
          outfitItemId,
          skuId: sku.id,
          quantity: 1,
          displayOrder: 0,
        },
      });
    }
    await transaction.outfitRevision.update({
      where: { id: outfitRevisionId },
      data: { state: OutfitRevisionState.PUBLISHED, publishedAt },
    });
    await transaction.outfit.update({
      where: { id: outfitId },
      data: { status: PublicationStatus.PUBLISHED, publishedAt, version: 2 },
    });
    await transaction.businessEvent.create({
      data: {
        id: outfitEventId,
        type: 'OutfitPublished',
        actorId: 'seed',
        entityType: 'Outfit',
        entityId: outfitId,
        correlationId,
        payload: {
          revisionId: outfitRevisionId,
          ruleIds: ['OTF-004', 'OTF-014', 'OTF-015', 'OTF-017'],
          deterministic: true,
        },
      },
    });
  }
}

async function reconcileE2EShipping(transaction: Prisma.TransactionClient): Promise<void> {
  const policyId = '40000000-0000-4000-8000-000000000001';
  await transaction.shippingPolicyVersion.upsert({
    where: { version: 1 },
    create: {
      id: policyId,
      version: 1,
      freeShippingThresholdRial: 40_000_000,
      eligibilityBasis: 'order_subtotal',
      effectiveAt: publishedAt,
      actorId: 'e2e-seed',
      reason: 'Synthetic Milestone 4 browser fixture; not approved production pricing',
    },
    update: {},
  });
  const methods = [
    {
      id: '40000000-0000-4000-8000-000000000011',
      code: ShippingMethodCode.IRAN_POST,
      localizedName: 'پست ایران',
      fixedPriceRial: 2_500_000,
      displayOrder: 0,
    },
    {
      id: '40000000-0000-4000-8000-000000000012',
      code: ShippingMethodCode.TIPAX,
      localizedName: 'تیپاکس',
      fixedPriceRial: 3_500_000,
      displayOrder: 1,
    },
    {
      id: '40000000-0000-4000-8000-000000000013',
      code: ShippingMethodCode.TEHRAN_LOCAL_COURIER,
      localizedName: 'پیک محلی تهران',
      fixedPriceRial: 1_800_000,
      displayOrder: 2,
    },
  ] as const;
  for (const method of methods) {
    await transaction.shippingMethodVersion.upsert({
      where: { policyId_code: { policyId, code: method.code } },
      create: { ...method, policyId, enabled: true },
      update: {},
    });
  }
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
    prisma.outfit.count(),
    prisma.outfitRevision.count(),
    prisma.outfitSize.count(),
  ]);
  const expected = [1, 1, 1, 6, 3, 3, 3, 1, 1, 3];
  if (counts.some((count, index) => count !== expected[index])) {
    throw new Error(
      `E2E fixture is not exclusive. Expected ${expected.join('/')} but found ${counts.join('/')}.`,
    );
  }
}

async function seed(): Promise<void> {
  const resetForE2E = process.env.E2E_DATABASE_RESET === 'true';
  if (resetForE2E) assertE2EDatabaseResetEnvironment(process.env);

  await prisma.$transaction(async (transaction) => {
    if (resetForE2E) await resetCatalogForE2E(transaction);
    await reconcileSeed(transaction);
    await reconcileOutfit(transaction);
    if (resetForE2E) await reconcileE2EShipping(transaction);
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
