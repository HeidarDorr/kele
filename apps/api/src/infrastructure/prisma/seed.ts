import {
  InventoryAction,
  MediaFormat,
  MediaGroup,
  PrismaClient,
  PublicationStatus,
} from '@prisma/client';

const seedVersion = 'milestone-2-catalog';
const prisma = new PrismaClient();

async function seed(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    const alreadyApplied = await transaction.seedLedger.findUnique({
      where: { key: seedVersion },
    });

    const categoryId = '20000000-0000-4000-8000-000000000001';
    const productId = '20000000-0000-4000-8000-000000000010';
    const variantId = '20000000-0000-4000-8000-000000000020';
    const frontMediaId = '20000000-0000-4000-8000-000000000031';
    const backMediaId = '20000000-0000-4000-8000-000000000032';
    const detailMediaId = '20000000-0000-4000-8000-000000000033';
    const mediaIds = [frontMediaId, backMediaId, detailMediaId];
    if (alreadyApplied !== null) {
      await transaction.mediaAsset.updateMany({
        where: { id: { in: mediaIds } },
        data: { width: 1122, height: 1402 },
      });
      return;
    }
    const skuInputs = [
      {
        id: '20000000-0000-4000-8000-000000000041',
        code: 'KELE-LINEN-BEIGE-5Y',
        normalizedSize: '5y',
        displaySize: '۵ سال',
        amountRial: 39_800_000n,
        physicalQuantity: 4,
      },
      {
        id: '20000000-0000-4000-8000-000000000042',
        code: 'KELE-LINEN-BEIGE-6Y',
        normalizedSize: '6y',
        displaySize: '۶ سال',
        amountRial: 39_800_000n,
        physicalQuantity: 2,
      },
      {
        id: '20000000-0000-4000-8000-000000000043',
        code: 'KELE-LINEN-BEIGE-7Y',
        normalizedSize: '7y',
        displaySize: '۷ سال',
        amountRial: 41_200_000n,
        physicalQuantity: 0,
      },
    ];

    await transaction.category.create({
      data: {
        id: categoryId,
        name: 'کت‌وشلوار',
        slug: 'suits',
        description: 'انتخابی آرام از کت‌وشلوارهای رسمی پسرانه.',
        displayOrder: 10,
        status: PublicationStatus.PUBLISHED,
      },
    });

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
    ];
    for (const item of media) {
      await transaction.mediaAsset.create({
        data: {
          ...item,
          format: MediaFormat.WEBP,
          group: MediaGroup.PRODUCT_IMAGES,
        },
      });
    }

    await transaction.product.create({
      data: {
        id: productId,
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
        publishedAt: new Date(),
        categories: { create: { categoryId } },
      },
    });
    await transaction.colorVariant.create({
      data: {
        id: variantId,
        productId,
        name: 'بژ',
        normalizedColorCode: 'beige',
        displayHex: '#D4C2A8',
        displayOrder: 0,
        status: PublicationStatus.PUBLISHED,
      },
    });
    await transaction.mediaAssignment.createMany({
      data: mediaIds.map((mediaAssetId, displayOrder) => ({
        colorVariantId: variantId,
        mediaAssetId,
        displayOrder,
        featured: displayOrder === 0,
      })),
    });

    for (const skuInput of skuInputs) {
      await transaction.sku.create({
        data: {
          id: skuInput.id,
          colorVariantId: variantId,
          code: skuInput.code,
          normalizedSize: skuInput.normalizedSize,
          displaySize: skuInput.displaySize,
          status: PublicationStatus.PUBLISHED,
        },
      });
      const priceRecord = await transaction.priceRecord.create({
        data: {
          id: skuInput.id.replace('00000000004', '00000000005'),
          skuId: skuInput.id,
          amountRial: skuInput.amountRial,
          actorId: 'seed',
          reason: 'دادهٔ قطعی آزمون Milestone 2',
        },
      });
      await transaction.currentSkuPrice.create({
        data: {
          skuId: skuInput.id,
          priceRecordId: priceRecord.id,
          amountRial: skuInput.amountRial,
        },
      });
      await transaction.inventory.create({
        data: {
          skuId: skuInput.id,
          physicalQuantity: skuInput.physicalQuantity,
          reservedQuantity: 0,
        },
      });
      if (skuInput.physicalQuantity > 0) {
        await transaction.inventoryMovement.create({
          data: {
            skuId: skuInput.id,
            action: InventoryAction.PRODUCTION,
            quantityDelta: skuInput.physicalQuantity,
            beforePhysicalQuantity: 0,
            afterPhysicalQuantity: skuInput.physicalQuantity,
            beforeReservedQuantity: 0,
            afterReservedQuantity: 0,
            actorId: 'seed',
            reason: 'موجودی قطعی آزمون Milestone 2',
            correlationId: '20000000-0000-4000-8000-000000000099',
            idempotencyKey: `seed-${skuInput.code}`,
          },
        });
      }
    }

    await transaction.businessEvent.create({
      data: {
        type: 'ProductPublished',
        actorId: 'seed',
        entityType: 'Product',
        entityId: productId,
        correlationId: '20000000-0000-4000-8000-000000000099',
        payload: {
          ruleIds: ['CAT-001', 'PUB-006', 'PUB-007', 'PUB-008'],
          deterministic: true,
        },
      },
    });
    await transaction.seedLedger.create({ data: { key: seedVersion } });
  });
}

void seed()
  .then(() => process.stdout.write(`Applied deterministic seed: ${seedVersion}\n`))
  .catch((error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
