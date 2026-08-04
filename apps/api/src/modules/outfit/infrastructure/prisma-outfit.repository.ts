import { randomUUID } from 'node:crypto';
import {
  OutfitRevisionState,
  Prisma,
  PublicationStatus,
  type Outfit,
  type OutfitCategory,
  type OutfitItem,
  type OutfitRevision,
  type OutfitRevisionMedia,
  type OutfitSize,
  type OutfitSizeComponent,
} from '@prisma/client';
import { PrismaTransactionContext } from '../../../infrastructure/prisma/prisma-transaction.context.js';
import { ApplicationError } from '../../../shared/application-error.js';
import type { Clock } from '../../../shared/deterministic-runtime.js';
import type { OutfitActor, OutfitRepository } from '../application/outfit.repository.js';
import type {
  OutfitDraftInput,
  OutfitRevisionRecord,
  OutfitRevisionSummary,
} from '../domain/outfit.types.js';

type RevisionWithRelations = OutfitRevision & {
  outfit: Outfit & { categories: OutfitCategory[] };
  items: OutfitItem[];
  sizes: Array<OutfitSize & { components: OutfitSizeComponent[] }>;
  media: OutfitRevisionMedia[];
};

const revisionInclude = {
  outfit: { include: { categories: true } },
  items: { orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }] },
  sizes: {
    orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
    include: {
      components: { orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }] },
    },
  },
  media: { orderBy: [{ displayOrder: 'asc' as const }, { mediaAssetId: 'asc' as const }] },
} satisfies Prisma.OutfitRevisionInclude;

function status(value: PublicationStatus): OutfitRevisionRecord['outfitStatus'] {
  return value === PublicationStatus.DRAFT
    ? 'draft'
    : value === PublicationStatus.PUBLISHED
      ? 'published'
      : 'archived';
}

function revisionState(value: OutfitRevisionState): OutfitRevisionRecord['revisionState'] {
  return value === OutfitRevisionState.DRAFT
    ? 'draft'
    : value === OutfitRevisionState.PUBLISHED
      ? 'published'
      : 'historical';
}

function safeMoney(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) throw new Error('Outfit price exceeds safe integer range.');
  return result;
}

function mapRevision(revision: RevisionWithRelations): OutfitRevisionRecord {
  return {
    outfitId: revision.outfitId,
    slug: revision.outfit.slug,
    outfitStatus: status(revision.outfit.status),
    outfitVersion: revision.outfit.version,
    revisionId: revision.id,
    revisionNumber: revision.revisionNumber,
    revisionState: revisionState(revision.state),
    revisionVersion: revision.version,
    name: revision.name,
    description: revision.description,
    categoryIds: revision.outfit.categories.map((item) => item.categoryId),
    media: revision.media.map((item) => ({
      mediaId: item.mediaAssetId,
      displayOrder: item.displayOrder,
      featured: item.featured,
    })),
    seo: { title: revision.seoTitle, description: revision.seoDescription },
    items: revision.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      defaultColorVariantId: item.defaultColorVariantId,
      quantity: item.quantity,
      displayOrder: item.displayOrder,
    })),
    sizes: revision.sizes.map((size) => ({
      code: size.code,
      label: size.label,
      amountRial: safeMoney(size.amountRial),
      displayOrder: size.displayOrder,
      components: size.components.map((component) => ({
        outfitItemId: component.outfitItemId,
        skuId: component.skuId,
        quantity: component.quantity,
        displayOrder: component.displayOrder,
      })),
    })),
    publishedAt: revision.publishedAt,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
  };
}

export class PrismaOutfitRepository implements OutfitRepository {
  constructor(
    private readonly transactions: PrismaTransactionContext,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async listPublic(): Promise<OutfitRevisionRecord[]> {
    const revisions = await this.transactions.client().outfitRevision.findMany({
      where: {
        state: OutfitRevisionState.PUBLISHED,
        outfit: { status: PublicationStatus.PUBLISHED },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      include: revisionInclude,
    });
    return revisions.map((revision) => mapRevision(revision));
  }

  async getPublicBySlug(slug: string): Promise<OutfitRevisionRecord | null> {
    const revision = await this.transactions.client().outfitRevision.findFirst({
      where: {
        state: OutfitRevisionState.PUBLISHED,
        outfit: { slug, status: PublicationStatus.PUBLISHED },
      },
      include: revisionInclude,
    });
    return revision === null ? null : mapRevision(revision);
  }

  async getPurchasableRevision(revisionId: string): Promise<OutfitRevisionRecord | null> {
    const revision = await this.transactions.client().outfitRevision.findFirst({
      where: {
        id: revisionId,
        state: OutfitRevisionState.PUBLISHED,
        outfit: { status: PublicationStatus.PUBLISHED },
      },
      include: revisionInclude,
    });
    return revision === null ? null : mapRevision(revision);
  }

  async listAdmin(
    filter: 'draft' | 'published' | 'archived' | null,
  ): Promise<OutfitRevisionRecord[]> {
    const where =
      filter === null
        ? {}
        : {
            status:
              filter === 'draft'
                ? PublicationStatus.DRAFT
                : filter === 'published'
                  ? PublicationStatus.PUBLISHED
                  : PublicationStatus.ARCHIVED,
          };
    const outfits = await this.transactions.client().outfit.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: { id: true },
    });
    const records = await Promise.all(outfits.map(({ id }) => this.getAdmin(id)));
    return records.filter((record): record is OutfitRevisionRecord => record !== null);
  }

  async getAdmin(outfitId: string, lock = false): Promise<OutfitRevisionRecord | null> {
    if (lock) {
      await this.transactions
        .client()
        .$queryRaw(Prisma.sql`SELECT id FROM "outfits" WHERE id = ${outfitId}::uuid FOR UPDATE`);
    }
    const revision = await this.transactions.client().outfitRevision.findFirst({
      where: {
        outfitId,
        state: { in: [OutfitRevisionState.DRAFT, OutfitRevisionState.PUBLISHED] },
      },
      orderBy: [{ state: 'asc' }, { revisionNumber: 'desc' }],
      include: revisionInclude,
    });
    return revision === null ? null : mapRevision(revision);
  }

  async create(input: OutfitDraftInput, actor: OutfitActor): Promise<OutfitRevisionRecord> {
    const client = this.transactions.client();
    const outfit = await client.outfit.create({ data: { slug: input.slug } });
    await client.outfitCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({ outfitId: outfit.id, categoryId })),
    });
    const revision = await client.outfitRevision.create({
      data: {
        outfitId: outfit.id,
        revisionNumber: 1,
        name: input.name,
        description: input.description,
        seoTitle: input.seo.title,
        seoDescription: input.seo.description,
      },
    });
    await this.writeDraft(revision.id, input, new Map());
    await this.event(actor, 'OutfitDraftCreated', outfit.id, { revisionId: revision.id });
    return this.requireAdmin(outfit.id);
  }

  async replaceDraft(
    outfitId: string,
    input: OutfitDraftInput,
    expectedVersion: number,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord> {
    const client = this.transactions.client();
    await client.$queryRaw(
      Prisma.sql`SELECT id FROM "outfits" WHERE id = ${outfitId}::uuid FOR UPDATE`,
    );
    const outfit = await client.outfit.findUnique({ where: { id: outfitId } });
    if (outfit === null) this.notFound();
    if (outfit.version !== expectedVersion) this.versionConflict();
    const currentDraft = await client.outfitRevision.findFirst({
      where: { outfitId, state: OutfitRevisionState.DRAFT },
    });
    let revision = currentDraft;
    let idMap = new Map<string, string>();
    if (revision === null) {
      const published = await client.outfitRevision.findFirst({
        where: { outfitId, state: OutfitRevisionState.PUBLISHED },
        orderBy: { revisionNumber: 'desc' },
      });
      const latest = await client.outfitRevision.aggregate({
        where: { outfitId },
        _max: { revisionNumber: true },
      });
      revision = await client.outfitRevision.create({
        data: {
          outfitId,
          revisionNumber: (latest._max.revisionNumber ?? 0) + 1,
          sourceRevisionId: published?.id ?? null,
          name: input.name,
          description: input.description,
          seoTitle: input.seo.title,
          seoDescription: input.seo.description,
        },
      });
      idMap = new Map(input.items.map((item) => [item.id, randomUUID()]));
    } else {
      await client.outfitSizeComponent.deleteMany({
        where: { outfitSize: { outfitRevisionId: revision.id } },
      });
      await client.outfitSize.deleteMany({ where: { outfitRevisionId: revision.id } });
      await client.outfitRevisionMedia.deleteMany({ where: { outfitRevisionId: revision.id } });
      await client.outfitItem.deleteMany({ where: { outfitRevisionId: revision.id } });
      await client.outfitRevision.update({
        where: { id: revision.id },
        data: {
          name: input.name,
          description: input.description,
          seoTitle: input.seo.title,
          seoDescription: input.seo.description,
          version: { increment: 1 },
        },
      });
    }
    await client.outfitCategory.deleteMany({ where: { outfitId } });
    await client.outfitCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({ outfitId, categoryId })),
    });
    await client.outfit.update({
      where: { id: outfitId },
      data: { slug: input.slug, version: { increment: 1 } },
    });
    await this.writeDraft(revision.id, input, idMap);
    await this.event(actor, 'OutfitDraftUpdated', outfitId, { revisionId: revision.id });
    return this.requireAdmin(outfitId);
  }

  async publish(
    outfitId: string,
    revisionId: string,
    expectedVersion: number,
    idempotencyKey: string,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord> {
    const client = this.transactions.client();
    const replay = await client.commandReceipt.findUnique({ where: { idempotencyKey } });
    if (replay !== null) {
      if (replay.commandType !== 'OutfitPublish' || replay.entityId !== outfitId) {
        this.idempotencyConflict();
      }
      return this.requireAdmin(outfitId);
    }
    const outfit = await client.outfit.findUnique({ where: { id: outfitId } });
    if (outfit === null) this.notFound();
    if (outfit.version !== expectedVersion) this.versionConflict();
    const now = this.clock();
    await client.outfitRevision.updateMany({
      where: { outfitId, state: OutfitRevisionState.PUBLISHED },
      data: { state: OutfitRevisionState.HISTORICAL, supersededAt: now },
    });
    const published = await client.outfitRevision.updateMany({
      where: { id: revisionId, outfitId, state: OutfitRevisionState.DRAFT },
      data: { state: OutfitRevisionState.PUBLISHED, publishedAt: now },
    });
    if (published.count !== 1) {
      throw new ApplicationError('conflict', 'OUTFIT_DRAFT_CHANGED', 'Outfit draft changed.');
    }
    await client.outfit.update({
      where: { id: outfitId },
      data: {
        status: PublicationStatus.PUBLISHED,
        publishedAt: outfit.publishedAt ?? now,
        archivedAt: null,
        version: { increment: 1 },
      },
    });
    await client.commandReceipt.create({
      data: {
        idempotencyKey,
        commandType: 'OutfitPublish',
        requestHash: revisionId.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
        entityId: outfitId,
      },
    });
    await this.event(actor, 'OutfitPublished', outfitId, { revisionId });
    return this.requireAdmin(outfitId);
  }

  async archive(
    outfitId: string,
    idempotencyKey: string,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord> {
    const client = this.transactions.client();
    const replay = await client.commandReceipt.findUnique({ where: { idempotencyKey } });
    if (replay !== null) {
      if (replay.commandType !== 'OutfitArchive' || replay.entityId !== outfitId) {
        this.idempotencyConflict();
      }
      return this.requireAdmin(outfitId);
    }
    const updated = await client.outfit.updateMany({
      where: { id: outfitId },
      data: {
        status: PublicationStatus.ARCHIVED,
        archivedAt: this.clock(),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) this.notFound();
    await client.commandReceipt.create({
      data: {
        idempotencyKey,
        commandType: 'OutfitArchive',
        requestHash: outfitId.replaceAll('-', '').padEnd(64, '0').slice(0, 64),
        entityId: outfitId,
      },
    });
    await this.event(actor, 'OutfitArchived', outfitId, {});
    return this.requireAdmin(outfitId);
  }

  async listRevisions(outfitId: string): Promise<OutfitRevisionSummary[]> {
    const revisions = await this.transactions.client().outfitRevision.findMany({
      where: { outfitId },
      orderBy: { revisionNumber: 'desc' },
    });
    if (revisions.length === 0) this.notFound();
    return revisions.map((revision) => ({
      id: revision.id,
      revisionNumber: revision.revisionNumber,
      state: revisionState(revision.state),
      name: revision.name,
      publishedAt: revision.publishedAt?.toISOString() ?? null,
      createdAt: revision.createdAt.toISOString(),
    }));
  }

  private async writeDraft(
    revisionId: string,
    input: OutfitDraftInput,
    itemIdMap: ReadonlyMap<string, string>,
  ): Promise<void> {
    const client = this.transactions.client();
    const mappedItemId = (id: string) => itemIdMap.get(id) ?? id;
    await client.outfitItem.createMany({
      data: input.items.map((item) => ({
        id: mappedItemId(item.id),
        outfitRevisionId: revisionId,
        productId: item.productId,
        defaultColorVariantId: item.defaultColorVariantId,
        quantity: item.quantity,
        displayOrder: item.displayOrder,
      })),
    });
    await client.outfitRevisionMedia.createMany({
      data: input.mediaIds.map((mediaAssetId, displayOrder) => ({
        outfitRevisionId: revisionId,
        mediaAssetId,
        displayOrder,
        featured: mediaAssetId === input.featuredMediaId,
      })),
    });
    for (const size of input.sizes) {
      const created = await client.outfitSize.create({
        data: {
          outfitRevisionId: revisionId,
          code: size.code,
          label: size.label,
          amountRial: size.amountRial,
          displayOrder: size.displayOrder,
        },
      });
      await client.outfitSizeComponent.createMany({
        data: size.components.map((component) => ({
          outfitSizeId: created.id,
          outfitItemId: mappedItemId(component.outfitItemId),
          skuId: component.skuId,
          quantity: component.quantity,
          displayOrder: component.displayOrder,
        })),
      });
    }
  }

  private async requireAdmin(outfitId: string): Promise<OutfitRevisionRecord> {
    const value = await this.getAdmin(outfitId);
    if (value === null) this.notFound();
    return value;
  }

  private event(
    actor: OutfitActor,
    type: string,
    entityId: string,
    payload: Prisma.InputJsonObject,
  ) {
    return this.transactions.client().businessEvent.create({
      data: {
        type,
        actorId: actor.actorId,
        entityType: 'Outfit',
        entityId,
        correlationId: actor.correlationId,
        payload,
      },
    });
  }

  private notFound(): never {
    throw new ApplicationError('not_found', 'OUTFIT_NOT_FOUND', 'Outfit was not found.');
  }

  private versionConflict(): never {
    throw new ApplicationError(
      'conflict',
      'OUTFIT_VERSION_CONFLICT',
      'Outfit changed concurrently.',
    );
  }

  private idempotencyConflict(): never {
    throw new ApplicationError(
      'conflict',
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency key was reused for a different Outfit command.',
    );
  }
}
