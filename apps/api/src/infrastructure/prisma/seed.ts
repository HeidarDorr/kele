import {
  DiscoveryKind,
  EditorialRevisionState,
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

const seedVersion = 'product-navigation-catalog-v1';
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
const correctedOutfitRevisionId = '50000000-0000-4000-8000-000000000005';
const correctedOutfitItemId = '50000000-0000-4000-8000-000000000006';
const correctedOutfitEventId = '50000000-0000-4000-8000-000000000007';
const customerCopyOutfitRevisionId = '50000000-0000-4000-8000-000000000008';
const customerCopyOutfitItemId = '50000000-0000-4000-8000-000000000009';
const customerCopyOutfitEventId = '50000000-0000-4000-8000-000000000010';
const outfitMediaIds = [
  '50000000-0000-4000-8000-000000000031',
  '50000000-0000-4000-8000-000000000032',
  '50000000-0000-4000-8000-000000000033',
] as const;
const occasionCategoryId = '70000000-0000-4000-8000-000000000001';
const homepagePublishedId = '70000000-0000-4000-8000-000000000010';
const homepageDraftId = '70000000-0000-4000-8000-000000000011';
const journalArticleId = '70000000-0000-4000-8000-000000000020';
const journalPublicationId = '70000000-0000-4000-8000-000000000021';
const settingsPublishedId = '70000000-0000-4000-8000-000000000030';
const settingsDraftId = '70000000-0000-4000-8000-000000000031';
const editorialMediaIds = {
  homepageHero: '70000000-0000-4000-8000-000000000041',
  occasionFormal: '70000000-0000-4000-8000-000000000042',
  journalTailoring: '70000000-0000-4000-8000-000000000043',
} as const;
const publishedAt = new Date('2026-07-31T00:00:00.000Z');
const correctedOutfitPublishedAt = new Date('2026-08-16T00:00:00.000Z');
const customerCopyOutfitPublishedAt = new Date('2026-08-18T00:00:00.000Z');
const mediaIds = [frontMediaId, backMediaId, detailMediaId];
const productGroups = [
  {
    categoryId: '80000000-0000-4000-8000-000000000001',
    productId: '81000000-0000-4000-8000-000000000001',
    variantId: '82000000-0000-4000-8000-000000000001',
    category: 'کت',
    categorySlug: 'jackets',
    name: 'کت مخمل زغالی',
    slug: 'charcoal-velvet-jacket',
    colorName: 'زغالی',
    colorCode: 'charcoal',
    colorHex: '#3D3A38',
    skuPrefix: 'KELE-JACKET-CHARCOAL',
    price: 24_800_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000002',
    productId: '81000000-0000-4000-8000-000000000002',
    variantId: '82000000-0000-4000-8000-000000000002',
    category: 'شلوار',
    categorySlug: 'trousers',
    name: 'شلوار کتان فندقی',
    slug: 'hazelnut-cotton-trousers',
    colorName: 'فندقی',
    colorCode: 'hazelnut',
    colorHex: '#8A6547',
    skuPrefix: 'KELE-TROUSER-HAZELNUT',
    price: 16_900_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000003',
    productId: '81000000-0000-4000-8000-000000000003',
    variantId: '82000000-0000-4000-8000-000000000003',
    category: 'پیراهن',
    categorySlug: 'shirts',
    name: 'پیراهن لینن شیری',
    slug: 'ivory-linen-shirt',
    colorName: 'شیری',
    colorCode: 'ivory',
    colorHex: '#E8DDC9',
    skuPrefix: 'KELE-SHIRT-IVORY',
    price: 14_600_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000004',
    productId: '81000000-0000-4000-8000-000000000004',
    variantId: '82000000-0000-4000-8000-000000000004',
    category: 'تیشرت',
    categorySlug: 't-shirts',
    name: 'تیشرت پنبه‌ای خاکی',
    slug: 'khaki-cotton-tshirt',
    colorName: 'خاکی',
    colorCode: 'khaki',
    colorHex: '#B5A382',
    skuPrefix: 'KELE-TSHIRT-KHAKI',
    price: 9_800_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000005',
    productId: '81000000-0000-4000-8000-000000000005',
    variantId: '82000000-0000-4000-8000-000000000005',
    category: 'وست',
    categorySlug: 'vests',
    name: 'وست پشمی شتری',
    slug: 'camel-wool-vest',
    colorName: 'شتری',
    colorCode: 'camel',
    colorHex: '#B8895D',
    skuPrefix: 'KELE-VEST-CAMEL',
    price: 18_400_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000006',
    productId: '81000000-0000-4000-8000-000000000006',
    variantId: '82000000-0000-4000-8000-000000000006',
    category: 'شلوارک',
    categorySlug: 'shorts',
    name: 'شلوارک لینن زیتونی',
    slug: 'olive-linen-shorts',
    colorName: 'زیتونی',
    colorCode: 'olive',
    colorHex: '#7A7651',
    skuPrefix: 'KELE-SHORTS-OLIVE',
    price: 11_200_000n,
  },
  {
    categoryId: '80000000-0000-4000-8000-000000000007',
    productId: '81000000-0000-4000-8000-000000000007',
    variantId: '82000000-0000-4000-8000-000000000007',
    category: 'کفش',
    categorySlug: 'shoes',
    name: 'کفش چرمی عسلی',
    slug: 'honey-leather-shoes',
    colorName: 'عسلی',
    colorCode: 'honey',
    colorHex: '#A66C3F',
    skuPrefix: 'KELE-SHOES-HONEY',
    price: 22_500_000n,
  },
] as const;
const prisma = new PrismaClient();

const media = [
  {
    id: frontMediaId,
    url: '/media/catalog/linen-suit-front.webp',
    width: 1122,
    height: 1402,
    altText: 'نمای روبه‌روی کت‌وشلوار لینن بژ بچگانه',
    colorHex: '#D4C2A8',
    focalPointX: 0.5,
    focalPointY: 0.48,
  },
  {
    id: backMediaId,
    url: '/media/catalog/linen-suit-back.webp',
    width: 1122,
    height: 1402,
    altText: 'نمای پشت کت‌وشلوار لینن بژ بچگانه',
    colorHex: '#D4C2A8',
    focalPointX: 0.5,
    focalPointY: 0.48,
  },
  {
    id: detailMediaId,
    url: '/media/catalog/linen-suit-detail.webp',
    width: 1122,
    height: 1402,
    altText: 'جزئیات بافت لینن، یقه و جیب کت بژ',
    colorHex: '#D4C2A8',
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
  await transaction.$executeRawUnsafe('TRUNCATE TABLE "homepage_revisions" CASCADE');
  await transaction.$executeRawUnsafe('TRUNCATE TABLE "journal_articles" CASCADE');
  await transaction.$executeRawUnsafe('TRUNCATE TABLE "site_settings_versions" CASCADE');
  await transaction.$executeRawUnsafe('TRUNCATE TABLE "editorial_media_references" CASCADE');
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

const seededOutfitCopy = {
  name: 'ست لینن آرام',
  description:
    'یک انتخاب کامل و روشن برای موقعیت‌های رسمی؛ اندازهٔ ست مستقیماً به رنگ و اندازهٔ دقیق کت‌وشلوار لینن متصل است.',
  seoTitle: 'ست لینن آرام | KELE',
  seoDescription: 'مشاهدهٔ اندازه، قیمت مستقل و موجودی لحظه‌ای ست لینن آرام KELE.',
} as const;

async function createSeedOutfitRevision(
  transaction: Prisma.TransactionClient,
  input: Readonly<{
    revisionId: string;
    itemId: string;
    eventId: string;
    revisionNumber: number;
    sourceRevisionId: string | null;
    publishedAt: Date;
  }>,
): Promise<void> {
  await transaction.outfitRevision.create({
    data: {
      id: input.revisionId,
      outfitId,
      revisionNumber: input.revisionNumber,
      sourceRevisionId: input.sourceRevisionId,
      createdAt: input.publishedAt,
      state: OutfitRevisionState.DRAFT,
      ...seededOutfitCopy,
    },
  });
  await transaction.outfitItem.create({
    data: {
      id: input.itemId,
      outfitRevisionId: input.revisionId,
      productId,
      defaultColorVariantId: variantId,
      quantity: 1,
      displayOrder: 0,
    },
  });
  for (const [displayOrder, mediaAssetId] of outfitMediaIds.entries()) {
    await transaction.outfitRevisionMedia.create({
      data: {
        outfitRevisionId: input.revisionId,
        mediaAssetId,
        displayOrder,
        featured: displayOrder === 0,
      },
    });
  }
  for (const [displayOrder, sku] of skuInputs.entries()) {
    const size = await transaction.outfitSize.create({
      data: {
        outfitRevisionId: input.revisionId,
        code: sku.normalizedSize.toUpperCase(),
        label: sku.displaySize,
        amountRial: sku.amountRial + 6_000_000n,
        displayOrder,
      },
    });
    await transaction.outfitSizeComponent.create({
      data: {
        outfitSizeId: size.id,
        outfitItemId: input.itemId,
        skuId: sku.id,
        quantity: 1,
        displayOrder: 0,
      },
    });
  }
  if (input.sourceRevisionId !== null) {
    await transaction.outfitRevision.update({
      where: { id: input.sourceRevisionId },
      data: { state: OutfitRevisionState.HISTORICAL, supersededAt: input.publishedAt },
    });
  }
  await transaction.outfitRevision.update({
    where: { id: input.revisionId },
    data: { state: OutfitRevisionState.PUBLISHED, publishedAt: input.publishedAt },
  });
  await transaction.outfit.update({
    where: { id: outfitId },
    data: {
      status: PublicationStatus.PUBLISHED,
      publishedAt,
      archivedAt: null,
      version: input.revisionNumber === 1 ? 2 : { increment: 1 },
    },
  });
  await transaction.businessEvent.create({
    data: {
      id: input.eventId,
      type: 'OutfitPublished',
      actorId: 'seed',
      entityType: 'Outfit',
      entityId: outfitId,
      correlationId,
      payload: {
        revisionId: input.revisionId,
        sourceRevisionId: input.sourceRevisionId,
        ruleIds: ['OTF-004', 'OTF-014', 'OTF-015', 'OTF-017'],
        deterministic: true,
      },
    },
  });
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
            ? 'نمای کامل ست لینن آرام KELE'
            : index === 1
              ? 'نمای پشت ست لینن آرام KELE'
              : 'جزئیات بافت ست لینن آرام KELE',
        focalPointX: source.focalPointX,
        focalPointY: source.focalPointY,
        format: MediaFormat.WEBP,
        group: MediaGroup.OUTFIT_EDITORIAL,
      },
      update: {
        url: source.url,
        width: source.width,
        height: source.height,
        altText:
          index === 0
            ? 'نمای کامل ست لینن آرام KELE'
            : index === 1
              ? 'نمای پشت ست لینن آرام KELE'
              : 'جزئیات بافت ست لینن آرام KELE',
        focalPointX: source.focalPointX,
        focalPointY: source.focalPointY,
        format: MediaFormat.WEBP,
        group: MediaGroup.OUTFIT_EDITORIAL,
        archivedAt: null,
      },
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
    await createSeedOutfitRevision(transaction, {
      revisionId: outfitRevisionId,
      itemId: outfitItemId,
      eventId: outfitEventId,
      revisionNumber: 1,
      sourceRevisionId: null,
      publishedAt,
    });
    return;
  }

  const currentRevision = await transaction.outfitRevision.findFirst({
    where: { outfitId, state: OutfitRevisionState.PUBLISHED },
    orderBy: { revisionNumber: 'desc' },
  });
  const correction = await transaction.outfitRevision.findUnique({
    where: { id: correctedOutfitRevisionId },
  });
  if (
    currentRevision?.id === outfitRevisionId &&
    currentRevision.name !== seededOutfitCopy.name &&
    correction === null
  ) {
    await createSeedOutfitRevision(transaction, {
      revisionId: correctedOutfitRevisionId,
      itemId: correctedOutfitItemId,
      eventId: correctedOutfitEventId,
      revisionNumber: currentRevision.revisionNumber + 1,
      sourceRevisionId: currentRevision.id,
      publishedAt: correctedOutfitPublishedAt,
    });
    return;
  }

  const customerCopyRevision = await transaction.outfitRevision.findUnique({
    where: { id: customerCopyOutfitRevisionId },
  });
  if (
    currentRevision?.id === correctedOutfitRevisionId &&
    currentRevision.description !== seededOutfitCopy.description &&
    customerCopyRevision === null
  ) {
    await createSeedOutfitRevision(transaction, {
      revisionId: customerCopyOutfitRevisionId,
      itemId: customerCopyOutfitItemId,
      eventId: customerCopyOutfitEventId,
      revisionNumber: currentRevision.revisionNumber + 1,
      sourceRevisionId: currentRevision.id,
      publishedAt: customerCopyOutfitPublishedAt,
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
        colorHex: item.colorHex,
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

async function reconcileProductNavigationCategories(
  transaction: Prisma.TransactionClient,
): Promise<void> {
  for (const [groupIndex, group] of productGroups.entries()) {
    await transaction.category.upsert({
      where: { id: group.categoryId },
      create: {
        id: group.categoryId,
        name: group.category,
        slug: group.categorySlug,
        description: `انتخاب‌های ${group.category} کودک با رنگ و سایز مستقل.`,
        displayOrder: groupIndex + 1,
        status: PublicationStatus.PUBLISHED,
      },
      update: {
        name: group.category,
        slug: group.categorySlug,
        description: `انتخاب‌های ${group.category} کودک با رنگ و سایز مستقل.`,
        displayOrder: groupIndex + 1,
        status: PublicationStatus.PUBLISHED,
        archivedAt: null,
      },
    });
  }
}

async function reconcileProductGroups(transaction: Prisma.TransactionClient): Promise<void> {
  for (const [groupIndex, group] of productGroups.entries()) {
    await transaction.product.upsert({
      where: { id: group.productId },
      create: {
        id: group.productId,
        name: group.name,
        slug: group.slug,
        description: `${group.name} با برش راحت، بافت سنجیده و جزئیات مناسب حرکت کودک.`,
        details: ['دوخت تمیز', 'فرم راحت کودک', 'نگهداری آسان'],
        seoTitle: `${group.name} کودک | KELE`,
        seoDescription: `مشاهدهٔ رنگ، سایز و قیمت ${group.name} در فروشگاه KELE.`,
        searchText: `${group.name} ${group.category} ${group.colorName} ${group.categorySlug}`,
        status: PublicationStatus.PUBLISHED,
        publishedAt,
      },
      update: {
        name: group.name,
        slug: group.slug,
        status: PublicationStatus.PUBLISHED,
        archivedAt: null,
      },
    });
    await transaction.productCategory.upsert({
      where: {
        productId_categoryId: { productId: group.productId, categoryId: group.categoryId },
      },
      create: { productId: group.productId, categoryId: group.categoryId },
      update: {},
    });
    await transaction.colorVariant.upsert({
      where: { id: group.variantId },
      create: {
        id: group.variantId,
        productId: group.productId,
        name: group.colorName,
        normalizedColorCode: group.colorCode,
        displayHex: group.colorHex,
        displayOrder: 0,
        status: PublicationStatus.PUBLISHED,
      },
      update: {
        productId: group.productId,
        name: group.colorName,
        normalizedColorCode: group.colorCode,
        displayHex: group.colorHex,
        displayOrder: 0,
        status: PublicationStatus.PUBLISHED,
        archivedAt: null,
      },
    });
    for (const [displayOrder, mediaAssetId] of mediaIds.entries()) {
      await transaction.mediaAssignment.upsert({
        where: {
          colorVariantId_mediaAssetId: { colorVariantId: group.variantId, mediaAssetId },
        },
        create: {
          colorVariantId: group.variantId,
          mediaAssetId,
          displayOrder,
          featured: displayOrder === 0,
        },
        update: { displayOrder, featured: displayOrder === 0 },
      });
    }
    for (const [sizeIndex, size] of ['5y', '6y'].entries()) {
      const sequence = String((groupIndex + 1) * 10 + sizeIndex + 1).padStart(12, '0');
      const skuId = `83000000-0000-4000-8000-${sequence}`;
      const priceRecordId = `84000000-0000-4000-8000-${sequence}`;
      const code = `${group.skuPrefix}-${size.toUpperCase()}`;
      const amountRial = group.price + BigInt(sizeIndex * 1_200_000);
      const physicalQuantity = sizeIndex === 0 ? 5 : 3;
      await transaction.sku.upsert({
        where: { id: skuId },
        create: {
          id: skuId,
          colorVariantId: group.variantId,
          code,
          normalizedSize: size,
          displaySize: sizeIndex === 0 ? '۵ سال' : '۶ سال',
          status: PublicationStatus.PUBLISHED,
        },
        update: {
          colorVariantId: group.variantId,
          normalizedSize: size,
          displaySize: sizeIndex === 0 ? '۵ سال' : '۶ سال',
          status: PublicationStatus.PUBLISHED,
          archivedAt: null,
        },
      });
      await transaction.priceRecord.upsert({
        where: { id: priceRecordId },
        create: {
          id: priceRecordId,
          skuId,
          amountRial,
          validFrom: publishedAt,
          actorId: 'seed',
          reason: 'دادهٔ نمایشی گروه‌های محصول',
        },
        update: {},
      });
      await transaction.currentSkuPrice.upsert({
        where: { skuId },
        create: { skuId, priceRecordId, amountRial },
        update: { priceRecordId, amountRial },
      });
      await transaction.inventory.upsert({
        where: { skuId },
        create: { skuId, physicalQuantity, reservedQuantity: 0 },
        update: { physicalQuantity, reservedQuantity: 0 },
      });
      await transaction.inventoryMovement.upsert({
        where: { idempotencyKey: `seed-${code}` },
        create: {
          skuId,
          action: InventoryAction.PRODUCTION,
          quantityDelta: physicalQuantity,
          beforePhysicalQuantity: 0,
          afterPhysicalQuantity: physicalQuantity,
          beforeReservedQuantity: 0,
          afterReservedQuantity: 0,
          actorId: 'seed',
          reason: 'موجودی نمایشی گروه محصول',
          correlationId,
          idempotencyKey: `seed-${code}`,
        },
        update: {},
      });
    }
  }
}

async function reconcileEditorial(transaction: Prisma.TransactionClient): Promise<void> {
  const editorialMedia = [
    {
      id: editorialMediaIds.homepageHero,
      url: '/media/editorial/homepage-hero.webp',
      width: 1536,
      height: 1024,
      altText: 'پسربچه با کت‌وشلوار لینن روشن در فضای سنگی آرام',
      group: MediaGroup.HOMEPAGE,
      focalPointX: 0.32,
      focalPointY: 0.48,
    },
    {
      id: editorialMediaIds.occasionFormal,
      url: '/media/editorial/occasion-formal.webp',
      width: 1122,
      height: 1402,
      altText: 'پوشش رسمی قهوه‌ای برای مهمانی کودکانه',
      group: MediaGroup.HOMEPAGE,
      focalPointX: 0.65,
      focalPointY: 0.43,
    },
    {
      id: editorialMediaIds.journalTailoring,
      url: '/media/editorial/journal-tailoring.webp',
      width: 1536,
      height: 1024,
      altText: 'جزئیات دوخت کت لینن در کارگاه خیاطی',
      group: MediaGroup.JOURNAL,
      focalPointX: 0.68,
      focalPointY: 0.5,
    },
  ] as const;
  for (const item of editorialMedia) {
    await transaction.mediaAsset.upsert({
      where: { id: item.id },
      create: { ...item, format: MediaFormat.WEBP },
      update: { ...item, format: MediaFormat.WEBP, archivedAt: null },
    });
  }

  await transaction.category.upsert({
    where: { id: occasionCategoryId },
    create: {
      id: occasionCategoryId,
      name: 'مراسم رسمی',
      slug: 'formal-occasions',
      description: 'انتخاب‌های آرام و سنجیده برای مهمانی‌ها و مراسم رسمی.',
      status: PublicationStatus.PUBLISHED,
      displayOrder: 1,
      discoveryKind: DiscoveryKind.OCCASION,
      editorialTitle: 'برای لحظه‌های به‌یادماندنی',
      editorialDescription:
        'پوشش‌های رسمی با تناسب راحت، بافت طبیعی و جزئیاتی که در عکس و خاطره ماندگار می‌شوند.',
      heroMediaId: editorialMediaIds.occasionFormal,
      seoTitle: 'لباس رسمی کودک برای مراسم | KELE',
      seoDescription:
        'انتخاب پوشش رسمی کودک KELE برای مهمانی و مراسم با پارچه‌های طبیعی و طراحی آرام.',
    },
    update: {
      status: PublicationStatus.PUBLISHED,
      discoveryKind: DiscoveryKind.OCCASION,
      heroMediaId: editorialMediaIds.occasionFormal,
      archivedAt: null,
    },
  });
  await transaction.productCategory.upsert({
    where: { productId_categoryId: { productId, categoryId: occasionCategoryId } },
    create: { productId, categoryId: occasionCategoryId },
    update: {},
  });

  const homepageSections: Prisma.InputJsonValue = [
    {
      id: '71000000-0000-4000-8000-000000000001',
      type: 'hero',
      enabled: true,
      order: 1,
      content: {
        title: 'لباس‌هایی برای خاطره‌های آرام کودکی',
        subtitle: 'پارچه‌های طبیعی، فرم‌های سنجیده و راحتی برای هر روز و هر مراسم',
        mediaId: editorialMediaIds.homepageHero,
        ctaLabel: 'دیدن مجموعه',
        href: '/catalog',
      },
    },
    {
      id: '71000000-0000-4000-8000-000000000002',
      type: 'occasion_grid',
      enabled: true,
      order: 2,
      content: { title: 'انتخاب بر اساس موقعیت', referenceIds: [occasionCategoryId] },
    },
    {
      id: '71000000-0000-4000-8000-000000000003',
      type: 'featured_products',
      enabled: true,
      order: 3,
      content: { title: 'انتخاب‌های تازه', referenceIds: [productId] },
    },
    {
      id: '71000000-0000-4000-8000-000000000004',
      type: 'brand_story',
      enabled: true,
      order: 4,
      content: {
        title: 'آرام، ماندگار، برای کودک',
        subtitle: 'KELE لباس کودک را با احترام به حرکت، لمس و خاطره طراحی می‌کند.',
        mediaId: editorialMediaIds.journalTailoring,
        ctaLabel: 'خواندن ژورنال',
        href: '/journal',
      },
    },
  ];
  await transaction.homepageRevision.upsert({
    where: { id: homepagePublishedId },
    create: {
      id: homepagePublishedId,
      revisionNumber: 1,
      state: EditorialRevisionState.PUBLISHED,
      sections: homepageSections,
      actorId: 'seed',
      publishedAt,
    },
    update: {},
  });
  await transaction.homepageRevision.upsert({
    where: { id: homepageDraftId },
    create: {
      id: homepageDraftId,
      revisionNumber: 2,
      state: EditorialRevisionState.DRAFT,
      sections: homepageSections,
      actorId: 'seed',
    },
    update: {},
  });

  const journalBlocks: Prisma.InputJsonValue = [
    {
      id: '72000000-0000-4000-8000-000000000001',
      type: 'paragraph',
      text: 'یک کت خوب از ظاهر آغاز نمی‌شود؛ از آزادی حرکت کودک و انتخاب پارچه‌ای شروع می‌شود که با پوست او مهربان باشد.',
    },
    {
      id: '72000000-0000-4000-8000-000000000002',
      type: 'heading',
      level: 2,
      text: 'جزئیاتی که تفاوت می‌سازند',
    },
    {
      id: '72000000-0000-4000-8000-000000000003',
      type: 'unordered_list',
      items: ['آستر نرم و تنفس‌پذیر', 'درزهای تمیز و بدون زبری', 'فضای کافی برای حرکت و بازی'],
    },
    {
      id: '72000000-0000-4000-8000-000000000004',
      type: 'image',
      mediaId: editorialMediaIds.journalTailoring,
    },
    {
      id: '72000000-0000-4000-8000-000000000005',
      type: 'product_reference',
      referenceId: productId,
      label: 'مشاهده کت‌وشلوار لینن',
    },
  ];
  await transaction.journalArticle.upsert({
    where: { id: journalArticleId },
    create: {
      id: journalArticleId,
      slug: 'quiet-craft-of-tailoring',
      status: PublicationStatus.PUBLISHED,
      title: 'هنر آرام دوخت برای کودک',
      excerpt: 'نگاهی نزدیک به پارچه، تناسب و جزئیاتی که پوشش کودک را راحت و ماندگار می‌کنند.',
      coverMediaId: editorialMediaIds.journalTailoring,
      blocks: journalBlocks,
      seoTitle: 'راهنمای دوخت و پارچه لباس کودک | ژورنال KELE',
      seoDescription: 'نگاهی به انتخاب پارچه و جزئیات دوخت لباس کودک برای راحتی، حرکت و ماندگاری.',
    },
    update: {},
  });
  await transaction.journalPublication.upsert({
    where: { id: journalPublicationId },
    create: {
      id: journalPublicationId,
      articleId: journalArticleId,
      publicationNumber: 1,
      slug: 'quiet-craft-of-tailoring',
      title: 'هنر آرام دوخت برای کودک',
      excerpt: 'نگاهی نزدیک به پارچه، تناسب و جزئیاتی که پوشش کودک را راحت و ماندگار می‌کنند.',
      coverMediaId: editorialMediaIds.journalTailoring,
      blocks: journalBlocks,
      seoTitle: 'راهنمای دوخت و پارچه لباس کودک | ژورنال KELE',
      seoDescription: 'نگاهی به انتخاب پارچه و جزئیات دوخت لباس کودک برای راحتی، حرکت و ماندگاری.',
      actorId: 'seed',
      publishedAt,
    },
    update: {},
  });

  const settings: Prisma.InputJsonValue = {
    brandName: 'KELE',
    brandTagline: 'پوشش آرام برای کودکی آزاد',
    contactEmail: 'hello@kele.ir',
    primaryNavigation: [
      { label: 'محصولات', href: '/catalog' },
      { label: 'موقعیت‌ها', href: '/occasions' },
      { label: 'ژورنال', href: '/journal' },
    ],
    footerNavigation: [
      { label: 'محصولات', href: '/catalog' },
      { label: 'موقعیت‌ها', href: '/occasions' },
      { label: 'ژورنال', href: '/journal' },
    ],
    announcement: null,
    announcementKind: null,
    seoDefaults: {
      title: 'KELE | پوشش کودک',
      description: 'پوشش کودک با پارچه‌های طبیعی، طراحی سنجیده و آزادی حرکت.',
    },
  };
  await transaction.siteSettingsVersion.upsert({
    where: { id: settingsPublishedId },
    create: {
      id: settingsPublishedId,
      revisionNumber: 1,
      state: EditorialRevisionState.PUBLISHED,
      configuration: settings,
      actorId: 'seed',
      publishedAt,
    },
    update: {},
  });
  await transaction.siteSettingsVersion.upsert({
    where: { id: settingsDraftId },
    create: {
      id: settingsDraftId,
      revisionNumber: 2,
      state: EditorialRevisionState.DRAFT,
      configuration: settings,
      actorId: 'seed',
    },
    update: {},
  });

  const references = [
    {
      mediaAssetId: editorialMediaIds.homepageHero,
      ownerType: 'homepage_revision',
      ownerId: homepagePublishedId,
      field: 'media.0',
    },
    {
      mediaAssetId: editorialMediaIds.journalTailoring,
      ownerType: 'homepage_revision',
      ownerId: homepagePublishedId,
      field: 'media.1',
    },
    {
      mediaAssetId: editorialMediaIds.homepageHero,
      ownerType: 'homepage_revision',
      ownerId: homepageDraftId,
      field: 'media.0',
    },
    {
      mediaAssetId: editorialMediaIds.journalTailoring,
      ownerType: 'homepage_revision',
      ownerId: homepageDraftId,
      field: 'media.1',
    },
    {
      mediaAssetId: editorialMediaIds.journalTailoring,
      ownerType: 'journal_publication',
      ownerId: journalPublicationId,
      field: 'media.0',
    },
  ];
  for (const reference of references) {
    await transaction.editorialMediaReference.upsert({
      where: { mediaAssetId_ownerType_ownerId_field: reference },
      create: reference,
      update: {},
    });
  }
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
    prisma.homepageRevision.count(),
    prisma.journalArticle.count(),
    prisma.journalPublication.count(),
    prisma.siteSettingsVersion.count(),
  ]);
  const expected = [1, 9, 1, 9, 3, 3, 3, 1, 1, 3, 2, 1, 1, 2];
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
    await reconcileProductNavigationCategories(transaction);
    if (!resetForE2E) await reconcileProductGroups(transaction);
    await reconcileOutfit(transaction);
    await reconcileEditorial(transaction);
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
