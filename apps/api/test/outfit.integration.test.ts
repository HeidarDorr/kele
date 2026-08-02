import { randomUUID } from 'node:crypto';
import { OutfitRevisionState, Prisma, PrismaClient, PublicationStatus } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import { PrismaOutfitCatalogAdapter } from '../src/modules/catalog/infrastructure/prisma-outfit-catalog.adapter.js';
import { OutfitService } from '../src/modules/outfit/application/outfit.service.js';
import type { OutfitDraftInput } from '../src/modules/outfit/domain/outfit.types.js';
import { PrismaOutfitRepository } from '../src/modules/outfit/infrastructure/prisma-outfit.repository.js';

const prisma = new PrismaClient();
const rollback = new Error('ROLLBACK_OUTFIT_INTEGRATION_FIXTURE');

async function inRollback(work: (transaction: Prisma.TransactionClient) => Promise<void>) {
  try {
    await prisma.$transaction(async (transaction) => {
      await work(transaction);
      throw rollback;
    });
  } catch (error: unknown) {
    if (error !== rollback) throw error;
  }
}

async function createComponentProduct(
  transaction: Prisma.TransactionClient,
  input: {
    suffix: string;
    mediaId: string;
    inventory: readonly [number, number];
  },
) {
  const product = await transaction.product.create({
    data: {
      name: `محصول جزء ${input.suffix}`,
      slug: `outfit-component-${input.suffix}`,
      description: 'جزء معتبر برای آزمون نگاشت دقیق Outfit',
      status: PublicationStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
  const variant = await transaction.colorVariant.create({
    data: {
      productId: product.id,
      name: `رنگ ${input.suffix}`,
      normalizedColorCode: `color-${input.suffix}`,
      status: PublicationStatus.PUBLISHED,
      mediaAssignments: {
        create: { mediaAssetId: input.mediaId, featured: true, displayOrder: 0 },
      },
    },
  });
  const skus = await Promise.all(
    input.inventory.map((physicalQuantity, index) =>
      transaction.sku.create({
        data: {
          colorVariantId: variant.id,
          code: `OTF-${input.suffix.toUpperCase()}-${String(index)}`,
          normalizedSize: index === 0 ? 'component-alpha' : 'component-beta',
          displaySize: index === 0 ? 'اندازهٔ جزء آلفا' : 'اندازهٔ جزء بتا',
          status: PublicationStatus.PUBLISHED,
          inventory: { create: { physicalQuantity } },
        },
      }),
    ),
  );
  return { product, variant, skus };
}

describe('Milestone 5 Outfit invariants on PostgreSQL', () => {
  it('[OTF-001][OTF-004][OTF-007][OTF-014..018][PUB-009] publishes exact immutable revisions and derives each size', async () => {
    await inRollback(async (transaction) => {
      const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
      const media = await transaction.mediaAsset.create({
        data: {
          url: `/media/outfits/integration-${suffix}.webp`,
          width: 1600,
          height: 2000,
          altText: 'استایل کامل آزمون Outfit با دو جزء',
          format: 'WEBP',
          group: 'OUTFIT_EDITORIAL',
          focalPointX: 0.5,
          focalPointY: 0.42,
        },
      });
      const category = await transaction.category.create({
        data: {
          name: `استایل آزمون ${suffix}`,
          slug: `outfit-category-${suffix}`,
          status: PublicationStatus.PUBLISHED,
        },
      });
      const jacket = await createComponentProduct(transaction, {
        suffix: `j${suffix}`,
        mediaId: media.id,
        inventory: [4, 3],
      });
      const trouser = await createComponentProduct(transaction, {
        suffix: `t${suffix}`,
        mediaId: media.id,
        inventory: [5, 1],
      });
      const [jacketMedium, jacketLarge] = jacket.skus;
      const [trouserMedium, trouserLarge] = trouser.skus;
      if (!jacketMedium || !jacketLarge || !trouserMedium || !trouserLarge) {
        throw new Error('Outfit integration component SKU fixture is incomplete.');
      }
      const itemIds = [randomUUID(), randomUUID()] as const;
      const input: OutfitDraftInput = {
        name: 'استایل آرام کتان',
        slug: `calm-linen-${suffix}`,
        description: 'یک ترکیب مستقل با نگاشت صریح سایز مشتری به سایز متفاوت اجزا.',
        categoryIds: [category.id],
        mediaIds: [media.id],
        featuredMediaId: media.id,
        seo: { title: 'استایل آرام کتان', description: 'ترکیب دو تکهٔ کتان برای آزمون' },
        items: [
          {
            id: itemIds[0],
            productId: jacket.product.id,
            defaultColorVariantId: jacket.variant.id,
            quantity: 1,
            displayOrder: 0,
          },
          {
            id: itemIds[1],
            productId: trouser.product.id,
            defaultColorVariantId: trouser.variant.id,
            quantity: 2,
            displayOrder: 1,
          },
        ],
        sizes: [
          {
            code: 'M',
            label: 'متوسط',
            amountRial: 48_000_000,
            displayOrder: 0,
            components: [
              {
                outfitItemId: itemIds[0],
                skuId: jacketMedium.id,
                quantity: 1,
                displayOrder: 0,
              },
              {
                outfitItemId: itemIds[1],
                skuId: trouserMedium.id,
                quantity: 2,
                displayOrder: 1,
              },
            ],
          },
          {
            code: 'L',
            label: 'بزرگ',
            amountRial: 51_000_000,
            displayOrder: 1,
            components: [
              {
                outfitItemId: itemIds[0],
                skuId: jacketLarge.id,
                quantity: 1,
                displayOrder: 0,
              },
              {
                outfitItemId: itemIds[1],
                skuId: trouserLarge.id,
                quantity: 2,
                displayOrder: 1,
              },
            ],
          },
        ],
      };
      const context = {
        client: () => transaction,
        run: <T>(operation: () => Promise<T>) => operation(),
      } as unknown as PrismaTransactionContext;
      const repository = new PrismaOutfitRepository(context);
      const service = new OutfitService(
        repository,
        new PrismaOutfitCatalogAdapter(context),
        context,
      );
      const actor = {
        actorId: 'outfit-integration-admin',
        correlationId: randomUUID(),
      };

      const draft = await service.create(input, actor);
      await expect(service.validate(draft.id)).resolves.toEqual({ valid: true, errors: [] });
      const first = await service.publish(draft.id, draft.version, `publish-${suffix}-1`, actor);
      expect(first).toMatchObject({ revisionNumber: 1, revisionState: 'published' });

      const publicDetail = await service.getPublic(input.slug);
      expect(publicDetail.sizes).toEqual([
        expect.objectContaining({ code: 'M', availableQuantity: 2, available: true }),
        expect.objectContaining({ code: 'L', availableQuantity: 0, available: false }),
      ]);
      const medium = await service.getOutfitForCheckout(first.revisionId, 'M');
      expect(medium).toMatchObject({
        unitPriceRial: 48_000_000,
        availableQuantity: 2,
        components: [
          expect.objectContaining({ skuId: jacketMedium.id, quantityPerOutfit: 1 }),
          expect.objectContaining({ skuId: trouserMedium.id, quantityPerOutfit: 2 }),
        ],
      });
      await expect(service.getOutfitForCheckout(first.revisionId, 'XL')).resolves.toBeNull();

      await transaction.$executeRawUnsafe('SAVEPOINT immutable_revision_check');
      await expect(
        transaction.outfitRevision.update({
          where: { id: first.revisionId },
          data: { name: 'تغییر غیرمجاز' },
        }),
      ).rejects.toThrow(/immutable/i);
      await transaction.$executeRawUnsafe('ROLLBACK TO SAVEPOINT immutable_revision_check');

      const secondInput: OutfitDraftInput = {
        ...input,
        name: 'استایل آرام کتان — ویرایش دوم',
        sizes: input.sizes.map((size) => ({
          ...size,
          amountRial: size.amountRial + 2_000_000,
        })),
      };
      const secondDraft = await service.update(first.id, secondInput, first.version, actor);
      expect(secondDraft).toMatchObject({ revisionNumber: 2, revisionState: 'draft' });
      const second = await service.publish(
        first.id,
        secondDraft.version,
        `publish-${suffix}-2`,
        actor,
      );
      expect(second).toMatchObject({ revisionNumber: 2, revisionState: 'published' });
      await expect(repository.getPurchasableRevision(first.revisionId)).resolves.toBeNull();
      expect(await service.listRevisions(first.id)).toEqual([
        expect.objectContaining({ revisionNumber: 2, state: 'published' }),
        expect.objectContaining({ revisionNumber: 1, state: 'historical' }),
      ]);
      expect(
        await transaction.outfitRevision.count({
          where: { outfitId: first.id, state: OutfitRevisionState.PUBLISHED },
        }),
      ).toBe(1);
      expect(
        await transaction.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'outfit_inventory'
        `,
      ).toEqual([{ count: 0n }]);
    });
  });
});

afterAll(async () => prisma.$disconnect());
