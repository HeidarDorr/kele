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
const revisedDemoOutfitPublishedAt = new Date('2026-09-27T00:00:00.000Z');
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
const productGroupSizes = ['5y', '6y'] as const;

function productGroupSkuId(groupIndex: number, sizeIndex: number): string {
  const sequence = String((groupIndex + 1) * 10 + sizeIndex + 1).padStart(12, '0');
  return `83000000-0000-4000-8000-${sequence}`;
}

/**
 * Development-only Outfits composed from the demo product groups, so the Homepage
 * can feature complete looks. Their editorial artwork is briefed in the
 * storefront art-direction registry until the files are delivered.
 */
const demoOutfits = [
  {
    outfitId: '86000000-0000-4000-8000-000000000001',
    revisionId: '86000000-0000-4000-8000-000000000011',
    eventId: '86000000-0000-4000-8000-000000000021',
    slug: 'evening-velvet-set',
    name: 'ست مخمل شب',
    description:
      'برای شب‌هایی که چراغ‌ها روشن‌اند و همه دور هم جمع شده‌اند. کت مخمل زغالی روی پیراهن لینن شیری، با شلوار فندقی و کفش چرمی عسلی؛ ترکیبی گرم و رسمی که سال‌ها بعد هم در عکس‌های همان شب درست دیده می‌شود.',
    seoTitle: 'ست مخمل شب | KELE',
    seoDescription: 'ست کامل کت مخمل زغالی، پیراهن لینن شیری، شلوار فندقی و کفش چرمی عسلی KELE.',
    categoryIds: [categoryId, occasionCategoryId],
    homepage: 'featured',
    pieces: [0, 2, 1, 6],
    sizePricesRial: [74_000_000n, 78_500_000n],
    media: [
      {
        id: '87000000-0000-4000-8000-000000000011',
        url: '/media/outfits/evening-velvet-set-look.webp',
        altText: 'کودک با کت مخمل زغالی، پیراهن شیری و شلوار فندقی در یک شب جشن',
        focalPointX: 0.5,
        focalPointY: 0.42,
      },
      {
        id: '87000000-0000-4000-8000-000000000012',
        url: '/media/outfits/evening-velvet-set-detail.webp',
        altText: 'جزئیات بافت مخمل زغالی کت و یقهٔ پیراهن لینن شیری',
        focalPointX: 0.5,
        focalPointY: 0.5,
      },
    ],
  },
  {
    outfitId: '86000000-0000-4000-8000-000000000002',
    revisionId: '86000000-0000-4000-8000-000000000015',
    eventId: '86000000-0000-4000-8000-000000000025',
    supersedesRevisionId: '86000000-0000-4000-8000-000000000012',
    slug: 'camel-vest-set',
    name: 'ست وست شتری',
    description:
      'برای عصرهای خانوادگی و مهمانی‌های روز. وست پشمی شتری روی پیراهن لینن شیری، با شلوار فندقی و کفش چرمی عسلی؛ آراسته به اندازه، بی‌آنکه سنگین شود، و راحت برای ساعت‌هایی که کودک یک‌جا نمی‌نشیند.',
    seoTitle: 'ست وست شتری | KELE',
    seoDescription: 'ست کامل وست پشمی شتری، پیراهن لینن شیری، شلوار فندقی و کفش چرمی عسلی KELE.',
    categoryIds: [occasionCategoryId],
    homepage: 'featured',
    pieces: [4, 2, 1, 6],
    sizePricesRial: [68_000_000n, 72_500_000n],
    media: [
      {
        id: '87000000-0000-4000-8000-000000000021',
        url: '/media/outfits/camel-vest-set-look.webp',
        altText: 'کودک با وست شتری، پیراهن شیری و شلوار فندقی در یک عصر خانوادگی',
        focalPointX: 0.5,
        focalPointY: 0.42,
      },
      {
        id: '87000000-0000-4000-8000-000000000022',
        url: '/media/outfits/camel-vest-set-detail.webp',
        altText: 'جزئیات بافت پشمی وست شتری روی پیراهن لینن شیری',
        focalPointX: 0.5,
        focalPointY: 0.5,
      },
      {
        id: '87000000-0000-4000-8000-000000000023',
        url: '/media/outfits/camel-vest-set-scene.webp',
        width: 1500,
        height: 1200,
        altText: 'کودک با وست شتری کنار حوض حیاط، در کنار پدربزرگش در یک عصر خانوادگی',
        focalPointX: 0.5,
        focalPointY: 0.45,
      },
    ],
  },
  {
    outfitId: '86000000-0000-4000-8000-000000000003',
    revisionId: '86000000-0000-4000-8000-000000000013',
    eventId: '86000000-0000-4000-8000-000000000023',
    slug: 'olive-summer-set',
    name: 'ست تابستان زیتونی',
    description:
      'برای روزهای بلند تابستان و مهمانی‌هایی که در باغ برگزار می‌شوند. تیشرت پنبه‌ای خاکی، شلوارک لینن زیتونی و کفش چرمی عسلی؛ سبک و آراسته، برای روزی که قرار است پر از بازی و حرکت باشد.',
    seoTitle: 'ست تابستان زیتونی | KELE',
    seoDescription: 'ست کامل تیشرت پنبه‌ای خاکی، شلوارک لینن زیتونی و کفش چرمی عسلی KELE.',
    categoryIds: ['80000000-0000-4000-8000-000000000006'],
    homepage: 'featured',
    pieces: [3, 5, 6],
    sizePricesRial: [41_000_000n, 44_500_000n],
    media: [
      {
        id: '87000000-0000-4000-8000-000000000031',
        url: '/media/outfits/olive-summer-set-look.webp',
        altText: 'کودک با تیشرت خاکی و شلوارک زیتونی در باغی آفتابی',
        focalPointX: 0.5,
        focalPointY: 0.42,
      },
      {
        id: '87000000-0000-4000-8000-000000000032',
        url: '/media/outfits/olive-summer-set-detail.webp',
        altText: 'جزئیات بافت لینن شلوارک زیتونی و کفش چرمی عسلی',
        focalPointX: 0.5,
        focalPointY: 0.55,
      },
    ],
  },
  {
    outfitId: '86000000-0000-4000-8000-000000000004',
    revisionId: '86000000-0000-4000-8000-000000000014',
    eventId: '86000000-0000-4000-8000-000000000024',
    slug: 'beige-linen-set',
    name: 'ست لینن بژ',
    description:
      'برای مراسم روز و عکس‌هایی که سال‌ها می‌مانند. کت‌وشلوار لینن بژ روی پیراهن لینن شیری با یقهٔ باز؛ روشن، سبک و رسمی، بی‌آنکه کودک را در قالبی خشک نگه دارد.',
    seoTitle: 'ست لینن بژ | KELE',
    seoDescription: 'ست کامل کت‌وشلوار لینن بژ و پیراهن لینن شیری KELE.',
    categoryIds: [categoryId, occasionCategoryId],
    homepage: 'hero',
    pieces: ['beige-linen-suit', 2],
    sizePricesRial: [52_000_000n, 54_500_000n],
    media: [
      {
        id: '87000000-0000-4000-8000-000000000041',
        url: '/media/outfits/beige-linen-set-look.webp',
        altText: 'کودک با کت‌وشلوار لینن بژ و پیراهن شیری در حیاطی سنگی و آفتابی',
        focalPointX: 0.5,
        focalPointY: 0.42,
      },
      {
        id: '87000000-0000-4000-8000-000000000042',
        url: '/media/outfits/beige-linen-set-detail.webp',
        altText: 'جزئیات بافت لینن کت بژ روی یقهٔ باز پیراهن شیری',
        focalPointX: 0.5,
        focalPointY: 0.5,
      },
    ],
  },
] as const;

type DemoPiece = (typeof demoOutfits)[number]['pieces'][number];

function demoHeroOutfit(): (typeof demoOutfits)[number] {
  const hero = demoOutfits.find((outfit) => outfit.homepage === 'hero');
  if (hero === undefined) throw new Error('A demo Outfit must be marked for the Homepage Hero.');
  return hero;
}

/** Resolves a demo piece to its product, default colour and the 5Y/6Y SKUs. */
function demoPiece(piece: DemoPiece): {
  productId: string;
  variantId: string;
  skuIds: readonly [string, string];
} {
  if (piece === 'beige-linen-suit') {
    const [fiveYears, sixYears] = skuInputs;
    return { productId, variantId, skuIds: [fiveYears.id, sixYears.id] };
  }
  const group = productGroups.at(piece);
  if (group === undefined) throw new Error('Demo outfit references a missing product group.');
  return {
    productId: group.productId,
    variantId: group.variantId,
    skuIds: [productGroupSkuId(piece, 0), productGroupSkuId(piece, 1)],
  };
}
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

async function reconcileDemoOutfits(transaction: Prisma.TransactionClient): Promise<void> {
  for (const [outfitIndex, outfit] of demoOutfits.entries()) {
    for (const media of outfit.media) {
      const asset = {
        url: media.url,
        width: 'width' in media ? media.width : 1200,
        height: 'height' in media ? media.height : 1500,
        altText: media.altText,
        focalPointX: media.focalPointX,
        focalPointY: media.focalPointY,
        format: MediaFormat.WEBP,
        group: MediaGroup.OUTFIT_EDITORIAL,
      };
      await transaction.mediaAsset.upsert({
        where: { id: media.id },
        create: { id: media.id, ...asset },
        update: { ...asset, archivedAt: null },
      });
    }
    await transaction.outfit.upsert({
      where: { id: outfit.outfitId },
      create: { id: outfit.outfitId, slug: outfit.slug },
      update: {},
    });
    for (const outfitCategoryId of outfit.categoryIds) {
      await transaction.outfitCategory.upsert({
        where: { outfitId_categoryId: { outfitId: outfit.outfitId, categoryId: outfitCategoryId } },
        create: { outfitId: outfit.outfitId, categoryId: outfitCategoryId },
        update: {},
      });
    }

    // Published revisions are immutable, so each composition is written once. A
    // changed demo composition gets a new revision that supersedes only the
    // seed's own earlier revision, never one an editor published.
    const existing = await transaction.outfitRevision.findUnique({
      where: { id: outfit.revisionId },
    });
    if (existing !== null) continue;
    const current = await transaction.outfitRevision.findFirst({
      where: { outfitId: outfit.outfitId, state: OutfitRevisionState.PUBLISHED },
      orderBy: { revisionNumber: 'desc' },
    });
    const supersedesRevisionId =
      'supersedesRevisionId' in outfit ? outfit.supersedesRevisionId : null;
    if (current !== null && current.id !== supersedesRevisionId) continue;
    const latest = await transaction.outfitRevision.findFirst({
      where: { outfitId: outfit.outfitId },
      orderBy: { revisionNumber: 'desc' },
    });
    const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
    const revisionPublishedAt = current === null ? publishedAt : revisedDemoOutfitPublishedAt;

    await transaction.outfitRevision.create({
      data: {
        id: outfit.revisionId,
        outfitId: outfit.outfitId,
        revisionNumber,
        sourceRevisionId: current?.id ?? null,
        createdAt: revisionPublishedAt,
        state: OutfitRevisionState.DRAFT,
        name: outfit.name,
        description: outfit.description,
        seoTitle: outfit.seoTitle,
        seoDescription: outfit.seoDescription,
      },
    });
    const itemIds: string[] = [];
    const pieces = outfit.pieces.map(demoPiece);
    for (const [displayOrder, piece] of pieces.entries()) {
      const itemSequence = (revisionNumber - 1) * 1000 + 100 + outfitIndex * 10 + displayOrder;
      const itemId = `86000000-0000-4000-8000-${String(itemSequence).padStart(12, '0')}`;
      itemIds.push(itemId);
      await transaction.outfitItem.create({
        data: {
          id: itemId,
          outfitRevisionId: outfit.revisionId,
          productId: piece.productId,
          defaultColorVariantId: piece.variantId,
          quantity: 1,
          displayOrder,
        },
      });
    }
    for (const [displayOrder, media] of outfit.media.entries()) {
      await transaction.outfitRevisionMedia.create({
        data: {
          outfitRevisionId: outfit.revisionId,
          mediaAssetId: media.id,
          displayOrder,
          featured: displayOrder === 0,
        },
      });
    }
    for (const [sizeIndex, size] of productGroupSizes.entries()) {
      const amountRial = outfit.sizePricesRial[sizeIndex];
      if (amountRial === undefined) throw new Error('Demo outfit size price is missing.');
      const outfitSize = await transaction.outfitSize.create({
        data: {
          outfitRevisionId: outfit.revisionId,
          code: size.toUpperCase(),
          label: sizeIndex === 0 ? '۵ سال' : '۶ سال',
          amountRial,
          displayOrder: sizeIndex,
        },
      });
      for (const [displayOrder, piece] of pieces.entries()) {
        const outfitItemId = itemIds[displayOrder];
        const skuId = piece.skuIds[sizeIndex];
        if (outfitItemId === undefined || skuId === undefined)
          throw new Error('Demo outfit item mapping is incomplete.');
        await transaction.outfitSizeComponent.create({
          data: {
            outfitSizeId: outfitSize.id,
            outfitItemId,
            skuId,
            quantity: 1,
            displayOrder,
          },
        });
      }
    }
    if (current !== null) {
      await transaction.outfitRevision.update({
        where: { id: current.id },
        data: { state: OutfitRevisionState.HISTORICAL, supersededAt: revisionPublishedAt },
      });
    }
    await transaction.outfitRevision.update({
      where: { id: outfit.revisionId },
      data: { state: OutfitRevisionState.PUBLISHED, publishedAt: revisionPublishedAt },
    });
    await transaction.outfit.update({
      where: { id: outfit.outfitId },
      data: {
        status: PublicationStatus.PUBLISHED,
        publishedAt,
        archivedAt: null,
        version: current === null ? 2 : { increment: 1 },
      },
    });
    await transaction.businessEvent.create({
      data: {
        id: outfit.eventId,
        type: 'OutfitPublished',
        actorId: 'seed',
        entityType: 'Outfit',
        entityId: outfit.outfitId,
        correlationId,
        payload: {
          revisionId: outfit.revisionId,
          sourceRevisionId: current?.id ?? null,
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
    for (const [sizeIndex, size] of productGroupSizes.entries()) {
      const skuId = productGroupSkuId(groupIndex, sizeIndex);
      const priceRecordId = skuId.replace(/^83/u, '84');
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

async function reconcileEditorial(
  transaction: Prisma.TransactionClient,
  composition: Readonly<{ featuredOutfitIds: readonly string[]; heroOutfitId: string }>,
): Promise<void> {
  const editorialMedia = [
    {
      id: editorialMediaIds.homepageHero,
      url: '/media/editorial/home-hero-wide.webp',
      width: 3200,
      height: 1400,
      altText: 'پسربچه با کت‌وشلوار لینن روشن در حیاط سنگی آفتاب‌گیر',
      group: MediaGroup.HOMEPAGE,
      focalPointX: 0.28,
      focalPointY: 0.5,
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
        title: 'برای لحظه‌هایی که تکرار نمی‌شوند.',
        subtitle: 'انتخاب‌هایی برای روزهایی که قرار است بیشتر از یک روز معمولی باشند.',
        mediaId: editorialMediaIds.homepageHero,
        ctaLabel: 'مشاهده ست',
        href: null,
        outfitId: composition.heroOutfitId,
      },
    },
    {
      id: '71000000-0000-4000-8000-000000000005',
      type: 'featured_outfits',
      enabled: true,
      order: 2,
      content: { title: 'ست‌های فصل', referenceIds: [...composition.featuredOutfitIds] },
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
  // Re-running the seed re-applies this composition only to revisions the seed
  // still owns. Once an editor saves or publishes the Homepage, their revision
  // carries their actor id and survives re-seeding, including the UAT start-up
  // reconciliation. Superseded revisions stay untouched: published history is
  // immutable.
  await transaction.homepageRevision.updateMany({
    where: {
      state: { in: [EditorialRevisionState.PUBLISHED, EditorialRevisionState.DRAFT] },
      actorId: 'seed',
    },
    data: { sections: homepageSections },
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
      mediaAssetId: editorialMediaIds.homepageHero,
      ownerType: 'homepage_revision',
      ownerId: homepageDraftId,
      field: 'media.0',
    },
    {
      mediaAssetId: editorialMediaIds.journalTailoring,
      ownerType: 'journal_publication',
      ownerId: journalPublicationId,
      field: 'media.0',
    },
  ];
  // The seed composition carries only the hero image, so any other reference held
  // by a revision the seed still owns would wrongly block that media from deletion.
  const seedOwnedHomepageIds = (
    await transaction.homepageRevision.findMany({
      where: { id: { in: [homepagePublishedId, homepageDraftId] }, actorId: 'seed' },
      select: { id: true },
    })
  ).map((revision) => revision.id);
  await transaction.editorialMediaReference.deleteMany({
    where: {
      ownerType: 'homepage_revision',
      ownerId: { in: seedOwnedHomepageIds },
      field: { not: 'media.0' },
    },
  });
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
    await reconcileEditorial(
      transaction,
      resetForE2E
        ? { featuredOutfitIds: [outfitId], heroOutfitId: outfitId }
        : {
            featuredOutfitIds: demoOutfits
              .filter((outfit) => outfit.homepage === 'featured')
              .map((outfit) => outfit.outfitId),
            heroOutfitId: demoHeroOutfit().outfitId,
          },
    );
    // Demo Outfits reuse the demo product groups and the occasion category.
    if (!resetForE2E) await reconcileDemoOutfits(transaction);
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
