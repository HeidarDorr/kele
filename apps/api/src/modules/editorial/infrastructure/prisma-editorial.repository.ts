import { Prisma } from '@prisma/client';
import type {
  PrismaTransactionContext,
  DatabaseClient,
} from '../../../infrastructure/prisma/prisma-transaction.context.js';
import type { EditorialRepository } from '../application/editorial.repository.js';
import { EditorialError } from '../application/editorial.error.js';
import type {
  AdminJournalValue,
  EditorialActor,
  HomepageDraftInput,
  HomepageSection,
  HomepageValue,
  JournalBlock,
  JournalDraftInput,
  MediaReferenceValue,
  MediaValue,
  PublishedJournalValue,
  SiteSettingsConfiguration,
  SiteSettingsDraftInput,
  SiteSettingsValue,
  ValidationIssue,
} from '../domain/editorial.types.js';
import {
  homepageMediaIds,
  journalMediaIds,
  validateHomepage,
  validateJournal,
  validateSiteSettings,
} from '../domain/editorial.validator.js';

type Client = DatabaseClient;

const defaultSettings: SiteSettingsConfiguration = {
  brandName: 'KELE',
  brandTagline: 'پوشاک معاصر پسرانه برای لحظه‌های ماندگار',
  contactEmail: null,
  primaryNavigation: [
    { label: 'تازه‌ها', href: '/catalog' },
    { label: 'کالکشن‌ها', href: '/outfits' },
    { label: 'مناسبت‌ها', href: '/occasions' },
    { label: 'ژورنال', href: '/journal' },
  ],
  footerNavigation: [
    { label: 'محصولات', href: '/catalog' },
    { label: 'استایل‌ها', href: '/outfits' },
    { label: 'حساب من', href: '/account' },
  ],
  announcement: null,
  announcementKind: null,
  seoDefaults: {
    title: 'کله | پوشاک معاصر پسرانه',
    description: 'کالکشن‌های گزیده و روایت‌های پوشاک معاصر پسرانه کله.',
  },
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapState(value: string): 'draft' | 'published' | 'historical' {
  return value.toLocaleLowerCase() as 'draft' | 'published' | 'historical';
}

function mapStatus(value: string): 'draft' | 'published' | 'archived' {
  return value.toLocaleLowerCase() as 'draft' | 'published' | 'archived';
}

function mapMedia(row: {
  id: string;
  url: string;
  width: number;
  height: number;
  altText: string;
  focalPointX: number;
  focalPointY: number;
}): MediaValue {
  return {
    id: row.id,
    url: row.url,
    width: row.width,
    height: row.height,
    alt: row.altText,
    focalPoint: { x: row.focalPointX, y: row.focalPointY },
  };
}

function issuesOrThrow(issues: ValidationIssue[]): void {
  if (issues.length > 0)
    throw new EditorialError(
      'validation',
      'EDITORIAL_PUBLICATION_INVALID',
      'Editorial publication validation failed.',
      issues,
    );
}

function notFound(message: string): never {
  throw new EditorialError('not_found', 'EDITORIAL_NOT_FOUND', message);
}

async function appendEvent(
  client: Client,
  actor: EditorialActor,
  type: string,
  entityType: string,
  entityId: string,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  await client.businessEvent.create({
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

export class PrismaEditorialRepository implements EditorialRepository {
  constructor(private readonly transactions: PrismaTransactionContext) {}

  private client(): Client {
    return this.transactions.client();
  }

  private async mediaFor(ids: string[]): Promise<MediaValue[]> {
    if (ids.length === 0) return [];
    return (
      await this.client().mediaAsset.findMany({ where: { id: { in: ids }, archivedAt: null } })
    ).map(mapMedia);
  }

  private async assertMedia(client: Client, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const found = await client.mediaAsset.findMany({
      where: { id: { in: ids }, archivedAt: null },
      select: { id: true },
    });
    const known = new Set(found.map((item) => item.id));
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length > 0)
      throw new EditorialError(
        'validation',
        'MEDIA_REFERENCE_INVALID',
        'One or more Media references are missing or archived.',
        missing.map((id) => ({
          path: 'mediaId',
          code: 'NOT_FOUND',
          message: `Media ${id} is unavailable.`,
        })),
      );
  }

  private async syncMediaReferences(
    client: Client,
    ownerType: string,
    ownerId: string,
    ids: string[],
  ): Promise<void> {
    await client.editorialMediaReference.deleteMany({ where: { ownerType, ownerId } });
    if (ids.length > 0)
      await client.editorialMediaReference.createMany({
        data: ids.map((mediaAssetId, index) => ({
          mediaAssetId,
          ownerType,
          ownerId,
          field: `media.${String(index)}`,
        })),
      });
  }

  private async mapHomepage(row: {
    id: string;
    revisionNumber: number;
    state: string;
    version: number;
    sections: Prisma.JsonValue;
    updatedAt: Date;
    publishedAt: Date | null;
  }): Promise<HomepageValue> {
    const sections = row.sections as unknown as HomepageSection[];
    const media = await this.mediaFor(homepageMediaIds({ sections }));
    return {
      id: row.id,
      revisionNumber: row.revisionNumber,
      state: mapState(row.state),
      version: row.version,
      sections,
      media,
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }

  async getHomepageDraft(actor: EditorialActor): Promise<HomepageValue> {
    let draft = await this.client().homepageRevision.findFirst({ where: { state: 'DRAFT' } });
    if (!draft) {
      draft = await this.transactions.run(async () => {
        const client = this.client();
        const maximum = await client.homepageRevision.aggregate({ _max: { revisionNumber: true } });
        return client.homepageRevision.create({
          data: {
            revisionNumber: (maximum._max.revisionNumber ?? 0) + 1,
            state: 'DRAFT',
            sections: [],
            actorId: actor.actorId,
          },
        });
      });
    }
    return this.mapHomepage(draft);
  }

  async saveHomepageDraft(
    input: HomepageDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<HomepageValue> {
    return this.transactions.run(async () => {
      const client = this.client();
      const draft = await client.homepageRevision.findFirst({ where: { state: 'DRAFT' } });
      if (!draft) notFound('Homepage draft does not exist.');
      await this.assertMedia(client, homepageMediaIds(input));
      const updated = await client.homepageRevision.updateMany({
        where: { id: draft.id, state: 'DRAFT', version: expectedVersion },
        data: {
          sections: asJson(input.sections),
          version: { increment: 1 },
          actorId: actor.actorId,
        },
      });
      if (updated.count !== 1)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Homepage draft changed. Reload before saving.',
        );
      await this.syncMediaReferences(
        client,
        'homepage_revision',
        draft.id,
        homepageMediaIds(input),
      );
      await appendEvent(client, actor, 'homepage.draft_saved', 'homepage', draft.id, {
        revisionNumber: draft.revisionNumber,
        sectionCount: input.sections.length,
      });
      const value = await client.homepageRevision.findUniqueOrThrow({ where: { id: draft.id } });
      return this.mapHomepage(value);
    });
  }

  async previewHomepage(): Promise<HomepageValue> {
    const draft = await this.client().homepageRevision.findFirst({ where: { state: 'DRAFT' } });
    if (!draft) notFound('Homepage draft does not exist.');
    return this.mapHomepage(draft);
  }

  private async validateHomepageReferences(
    client: Client,
    input: HomepageDraftInput,
  ): Promise<void> {
    issuesOrThrow(validateHomepage(input, true));
    await this.assertMedia(client, homepageMediaIds(input));
    for (const section of input.sections) {
      if (!('referenceIds' in section.content) || !section.enabled) continue;
      const ids = section.content.referenceIds;
      let count = ids.length;
      if (section.type === 'featured_products')
        count = await client.product.count({ where: { id: { in: ids }, status: 'PUBLISHED' } });
      if (section.type === 'featured_outfits')
        count = await client.outfit.count({ where: { id: { in: ids }, status: 'PUBLISHED' } });
      if (section.type === 'occasion_grid')
        count = await client.category.count({
          where: { id: { in: ids }, status: 'PUBLISHED', discoveryKind: 'OCCASION' },
        });
      if (section.type === 'journal_highlights')
        count = await client.journalArticle.count({
          where: { id: { in: ids }, status: 'PUBLISHED' },
        });
      if (count !== new Set(ids).size)
        throw new EditorialError(
          'validation',
          'EDITORIAL_REFERENCE_INVALID',
          'Homepage references must resolve to published content.',
          [
            {
              path: `sections.${section.id}.content.referenceIds`,
              code: 'NOT_PUBLISHED',
              message: 'One or more referenced items are unavailable.',
            },
          ],
        );
    }
  }

  async publishHomepage(expectedVersion: number, actor: EditorialActor): Promise<HomepageValue> {
    return this.transactions.run(async () => {
      const client = this.client();
      const draft = await client.homepageRevision.findFirst({ where: { state: 'DRAFT' } });
      if (!draft) notFound('Homepage draft does not exist.');
      if (draft.version !== expectedVersion)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Homepage draft changed. Reload before publishing.',
        );
      const input = { sections: draft.sections as unknown as HomepageSection[] };
      await this.validateHomepageReferences(client, input);
      const now = new Date();
      await client.homepageRevision.updateMany({
        where: { state: 'PUBLISHED' },
        data: { state: 'HISTORICAL', supersededAt: now },
      });
      const published = await client.homepageRevision.update({
        where: { id: draft.id },
        data: { state: 'PUBLISHED', publishedAt: now, actorId: actor.actorId },
      });
      const next = await client.homepageRevision.create({
        data: {
          revisionNumber: draft.revisionNumber + 1,
          state: 'DRAFT',
          sections: draft.sections as Prisma.InputJsonValue,
          actorId: actor.actorId,
        },
      });
      await this.syncMediaReferences(client, 'homepage_revision', next.id, homepageMediaIds(input));
      await appendEvent(client, actor, 'homepage.published', 'homepage', published.id, {
        revisionNumber: published.revisionNumber,
      });
      return this.mapHomepage(published);
    });
  }

  async getPublishedHomepage(): Promise<HomepageValue> {
    const row = await this.client().homepageRevision.findFirst({ where: { state: 'PUBLISHED' } });
    if (!row) notFound('Published Homepage does not exist.');
    const value = await this.mapHomepage(row);
    return {
      ...value,
      sections: value.sections
        .filter((section) => section.enabled)
        .sort((a, b) => a.order - b.order),
    };
  }

  private mapJournal(row: {
    id: string;
    slug: string;
    status: string;
    title: string;
    excerpt: string | null;
    coverMediaId: string | null;
    blocks: Prisma.JsonValue;
    seoTitle: string | null;
    seoDescription: string | null;
    version: number;
    updatedAt: Date;
    _count: { publications: number };
  }): AdminJournalValue {
    return {
      id: row.id,
      slug: row.slug,
      status: mapStatus(row.status),
      title: row.title,
      excerpt: row.excerpt,
      coverMediaId: row.coverMediaId,
      blocks: row.blocks as unknown as JournalBlock[],
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      version: row.version,
      publicationCount: row._count.publications,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listJournalDrafts(): Promise<AdminJournalValue[]> {
    const rows = await this.client().journalArticle.findMany({
      include: { _count: { select: { publications: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.mapJournal(row));
  }

  async createJournal(input: JournalDraftInput, actor: EditorialActor): Promise<AdminJournalValue> {
    try {
      return await this.transactions.run(async () => {
        const client = this.client();
        await this.assertMedia(client, journalMediaIds(input));
        const row = await client.journalArticle.create({
          data: {
            slug: input.slug,
            title: input.title,
            excerpt: input.excerpt,
            coverMediaId: input.coverMediaId,
            blocks: asJson(input.blocks),
            seoTitle: input.seoTitle,
            seoDescription: input.seoDescription,
          },
          include: { _count: { select: { publications: true } } },
        });
        await this.syncMediaReferences(client, 'journal_draft', row.id, journalMediaIds(input));
        await appendEvent(client, actor, 'journal.created', 'journal', row.id, { slug: row.slug });
        return this.mapJournal(row);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new EditorialError(
          'conflict',
          'JOURNAL_SLUG_CONFLICT',
          'Journal slug already exists.',
        );
      throw error;
    }
  }

  async getJournalDraft(id: string): Promise<AdminJournalValue> {
    const row = await this.client().journalArticle.findUnique({
      where: { id },
      include: { _count: { select: { publications: true } } },
    });
    if (!row) notFound('Journal article does not exist.');
    return this.mapJournal(row);
  }

  async updateJournal(
    id: string,
    input: JournalDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<AdminJournalValue> {
    try {
      return await this.transactions.run(async () => {
        const client = this.client();
        await this.assertMedia(client, journalMediaIds(input));
        const current = await client.journalArticle.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current) notFound('Journal article does not exist.');
        const result = await client.journalArticle.updateMany({
          where: { id, version: expectedVersion },
          data: {
            slug: input.slug,
            title: input.title,
            excerpt: input.excerpt,
            coverMediaId: input.coverMediaId,
            blocks: asJson(input.blocks),
            seoTitle: input.seoTitle,
            seoDescription: input.seoDescription,
            version: { increment: 1 },
            status: current.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
            archivedAt: null,
          },
        });
        if (result.count !== 1)
          throw new EditorialError(
            'conflict',
            'EDITORIAL_VERSION_CONFLICT',
            'Journal draft changed. Reload before saving.',
          );
        await this.syncMediaReferences(client, 'journal_draft', id, journalMediaIds(input));
        await appendEvent(client, actor, 'journal.draft_saved', 'journal', id, {
          slug: input.slug,
          blockCount: input.blocks.length,
        });
        return this.getJournalDraft(id);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new EditorialError(
          'conflict',
          'JOURNAL_SLUG_CONFLICT',
          'Journal slug already exists.',
        );
      throw error;
    }
  }

  private async validateJournalReferences(client: Client, input: JournalDraftInput): Promise<void> {
    issuesOrThrow(validateJournal(input, true));
    await this.assertMedia(client, journalMediaIds(input));
    for (const [index, block] of input.blocks.entries()) {
      if (
        block.type === 'product_reference' &&
        block.referenceId &&
        !(await client.product.findFirst({
          where: { id: block.referenceId, status: 'PUBLISHED' },
          select: { id: true },
        }))
      )
        throw new EditorialError(
          'validation',
          'JOURNAL_REFERENCE_INVALID',
          'Journal Product reference is unavailable.',
          [
            {
              path: `blocks.${String(index)}.referenceId`,
              code: 'NOT_PUBLISHED',
              message: 'Referenced Product is unavailable.',
            },
          ],
        );
      if (
        block.type === 'outfit_reference' &&
        block.referenceId &&
        !(await client.outfit.findFirst({
          where: { id: block.referenceId, status: 'PUBLISHED' },
          select: { id: true },
        }))
      )
        throw new EditorialError(
          'validation',
          'JOURNAL_REFERENCE_INVALID',
          'Journal Outfit reference is unavailable.',
          [
            {
              path: `blocks.${String(index)}.referenceId`,
              code: 'NOT_PUBLISHED',
              message: 'Referenced Outfit is unavailable.',
            },
          ],
        );
    }
  }

  private async publishedJournalValue(
    articleId: string,
    draftFallback = false,
  ): Promise<PublishedJournalValue> {
    const client = this.client();
    if (draftFallback) {
      const draft = await client.journalArticle.findUnique({
        where: { id: articleId },
        include: { coverMedia: true },
      });
      if (!draft || !draft.coverMedia || !draft.excerpt || !draft.seoTitle || !draft.seoDescription)
        notFound('Complete Journal preview does not exist.');
      const input: JournalDraftInput = {
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        coverMediaId: draft.coverMediaId,
        blocks: draft.blocks as unknown as JournalBlock[],
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
      };
      const media = await this.mediaFor(journalMediaIds(input));
      return {
        id: draft.id,
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        coverMedia: mapMedia(draft.coverMedia),
        blocks: input.blocks,
        media,
        seo: { title: draft.seoTitle, description: draft.seoDescription },
        publishedAt: draft.updatedAt.toISOString(),
      };
    }
    const publication = await client.journalPublication.findFirst({
      where: { articleId, article: { status: 'PUBLISHED' } },
      include: { coverMedia: true },
      orderBy: { publicationNumber: 'desc' },
    });
    if (!publication) notFound('Published Journal article does not exist.');
    const blocks = publication.blocks as unknown as JournalBlock[];
    const media = await this.mediaFor(
      journalMediaIds({
        slug: publication.slug,
        title: publication.title,
        excerpt: publication.excerpt,
        coverMediaId: publication.coverMediaId,
        blocks,
        seoTitle: publication.seoTitle,
        seoDescription: publication.seoDescription,
      }),
    );
    return {
      id: publication.articleId,
      slug: publication.slug,
      title: publication.title,
      excerpt: publication.excerpt,
      coverMedia: mapMedia(publication.coverMedia),
      blocks,
      media,
      seo: { title: publication.seoTitle, description: publication.seoDescription },
      publishedAt: publication.publishedAt.toISOString(),
    };
  }

  async previewJournal(id: string): Promise<PublishedJournalValue> {
    const draft = await this.getJournalDraft(id);
    issuesOrThrow(validateJournal(draft, true));
    await this.validateJournalReferences(this.client(), draft);
    return this.publishedJournalValue(id, true);
  }

  async publishJournal(
    id: string,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<PublishedJournalValue> {
    await this.transactions.run(async () => {
      const client = this.client();
      const draft = await client.journalArticle.findUnique({
        where: { id },
        include: { _count: { select: { publications: true } } },
      });
      if (!draft) notFound('Journal article does not exist.');
      if (draft.version !== expectedVersion)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Journal draft changed. Reload before publishing.',
        );
      const input: JournalDraftInput = {
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        coverMediaId: draft.coverMediaId,
        blocks: draft.blocks as unknown as JournalBlock[],
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
      };
      issuesOrThrow(validateJournal(input, true));
      if (
        input.excerpt === null ||
        input.coverMediaId === null ||
        input.seoTitle === null ||
        input.seoDescription === null
      )
        throw new EditorialError(
          'validation',
          'EDITORIAL_PUBLICATION_INVALID',
          'Journal publication fields are incomplete.',
        );
      const { excerpt, coverMediaId, seoTitle, seoDescription } = input;
      await this.validateJournalReferences(client, input);
      const publication = await client.journalPublication.create({
        data: {
          articleId: id,
          publicationNumber: draft._count.publications + 1,
          slug: draft.slug,
          title: draft.title,
          excerpt,
          coverMediaId,
          blocks: draft.blocks as Prisma.InputJsonValue,
          seoTitle,
          seoDescription,
          actorId: actor.actorId,
        },
      });
      await client.journalArticle.update({
        where: { id },
        data: { status: 'PUBLISHED', archivedAt: null },
      });
      await this.syncMediaReferences(
        client,
        'journal_publication',
        publication.id,
        journalMediaIds(input),
      );
      await appendEvent(client, actor, 'journal.published', 'journal', id, {
        publicationNumber: publication.publicationNumber,
        slug: publication.slug,
      });
    });
    return this.publishedJournalValue(id);
  }

  async archiveJournal(id: string, expectedVersion: number, actor: EditorialActor): Promise<void> {
    await this.transactions.run(async () => {
      const client = this.client();
      const result = await client.journalArticle.updateMany({
        where: { id, version: expectedVersion },
        data: { status: 'ARCHIVED', archivedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Journal article changed. Reload before archiving.',
        );
      await appendEvent(client, actor, 'journal.archived', 'journal', id, {});
    });
  }

  async listPublishedJournal(
    limit: number,
    cursor: string | null,
  ): Promise<{ items: PublishedJournalValue[]; nextCursor: string | null; hasMore: boolean }> {
    const articles = await this.client().journalArticle.findMany({
      where: { status: 'PUBLISHED', ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: { id: true },
    });
    const hasMore = articles.length > limit;
    const page = articles.slice(0, limit);
    return {
      items: await Promise.all(page.map((item) => this.publishedJournalValue(item.id))),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
      hasMore,
    };
  }

  async getPublishedJournal(slug: string): Promise<PublishedJournalValue> {
    const article = await this.client().journalArticle.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: { id: true },
    });
    if (!article) notFound('Published Journal article does not exist.');
    return this.publishedJournalValue(article.id);
  }

  private mapSettings(row: {
    id: string;
    revisionNumber: number;
    state: string;
    version: number;
    configuration: Prisma.JsonValue;
    contentApprovedBy: string | null;
    contentApprovedAt: Date | null;
    updatedAt: Date;
    publishedAt: Date | null;
  }): SiteSettingsValue {
    return {
      id: row.id,
      revisionNumber: row.revisionNumber,
      state: mapState(row.state),
      version: row.version,
      configuration: row.configuration as unknown as SiteSettingsConfiguration,
      contentApprovedBy: row.contentApprovedBy,
      contentApprovedAt: row.contentApprovedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }

  async getSiteSettingsDraft(actor: EditorialActor): Promise<SiteSettingsValue> {
    let row = await this.client().siteSettingsVersion.findFirst({ where: { state: 'DRAFT' } });
    if (!row)
      row = await this.client().siteSettingsVersion.create({
        data: {
          revisionNumber: 1,
          state: 'DRAFT',
          configuration: asJson(defaultSettings),
          actorId: actor.actorId,
        },
      });
    return this.mapSettings(row);
  }

  async saveSiteSettingsDraft(
    input: SiteSettingsDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<SiteSettingsValue> {
    return this.transactions.run(async () => {
      const client = this.client();
      const draft = await client.siteSettingsVersion.findFirst({ where: { state: 'DRAFT' } });
      if (!draft) notFound('Site Settings draft does not exist.');
      const result = await client.siteSettingsVersion.updateMany({
        where: { id: draft.id, version: expectedVersion },
        data: {
          configuration: asJson(input.configuration),
          contentApprovedBy: input.contentApprovedBy,
          contentApprovedAt: input.contentApprovedAt ? new Date(input.contentApprovedAt) : null,
          actorId: actor.actorId,
          version: { increment: 1 },
        },
      });
      if (result.count !== 1)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Site Settings changed. Reload before saving.',
        );
      await appendEvent(client, actor, 'site_settings.draft_saved', 'site_settings', draft.id, {
        revisionNumber: draft.revisionNumber,
      });
      return this.mapSettings(
        await client.siteSettingsVersion.findUniqueOrThrow({ where: { id: draft.id } }),
      );
    });
  }

  async publishSiteSettings(
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<SiteSettingsValue> {
    return this.transactions.run(async () => {
      const client = this.client();
      const draft = await client.siteSettingsVersion.findFirst({ where: { state: 'DRAFT' } });
      if (!draft) notFound('Site Settings draft does not exist.');
      if (draft.version !== expectedVersion)
        throw new EditorialError(
          'conflict',
          'EDITORIAL_VERSION_CONFLICT',
          'Site Settings changed. Reload before publishing.',
        );
      const input: SiteSettingsDraftInput = {
        configuration: draft.configuration as unknown as SiteSettingsConfiguration,
        contentApprovedBy: draft.contentApprovedBy,
        contentApprovedAt: draft.contentApprovedAt?.toISOString() ?? null,
      };
      issuesOrThrow(validateSiteSettings(input, true));
      const now = new Date();
      await client.siteSettingsVersion.updateMany({
        where: { state: 'PUBLISHED' },
        data: { state: 'HISTORICAL', supersededAt: now },
      });
      const published = await client.siteSettingsVersion.update({
        where: { id: draft.id },
        data: { state: 'PUBLISHED', publishedAt: now, actorId: actor.actorId },
      });
      await client.siteSettingsVersion.create({
        data: {
          revisionNumber: draft.revisionNumber + 1,
          state: 'DRAFT',
          configuration: draft.configuration as Prisma.InputJsonValue,
          contentApprovedBy: draft.contentApprovedBy,
          contentApprovedAt: draft.contentApprovedAt,
          actorId: actor.actorId,
        },
      });
      await appendEvent(client, actor, 'site_settings.published', 'site_settings', published.id, {
        revisionNumber: published.revisionNumber,
      });
      return this.mapSettings(published);
    });
  }

  async getPublishedSiteSettings(): Promise<SiteSettingsValue> {
    const row = await this.client().siteSettingsVersion.findFirst({
      where: { state: 'PUBLISHED' },
    });
    if (!row) notFound('Published Site Settings do not exist.');
    return this.mapSettings(row);
  }

  async mediaReferences(
    id: string,
  ): Promise<{ media: MediaValue; references: MediaReferenceValue[] }> {
    const media = await this.client().mediaAsset.findUnique({
      where: { id },
      include: {
        assignments: true,
        outfitRevisionMedia: { include: { outfitRevision: true } },
        categoryHeroes: true,
        journalDraftCovers: true,
        journalPublishedCovers: true,
        editorialReferences: true,
      },
    });
    if (!media) notFound('Media asset does not exist.');
    const homepageOwnerIds = media.editorialReferences
      .filter((item) => item.ownerType === 'homepage_revision')
      .map((item) => item.ownerId);
    const historicalHomepageIds = new Set(
      (
        await this.client().homepageRevision.findMany({
          where: { id: { in: homepageOwnerIds }, state: 'HISTORICAL' },
          select: { id: true },
        })
      ).map((item) => item.id),
    );
    const references: MediaReferenceValue[] = [
      ...media.assignments.map((item) => ({
        ownerType: 'color_variant',
        ownerId: item.colorVariantId,
        field: 'gallery',
        historical: false,
      })),
      ...media.outfitRevisionMedia.map((item) => ({
        ownerType: 'outfit_revision',
        ownerId: item.outfitRevisionId,
        field: 'media',
        historical: item.outfitRevision.state !== 'DRAFT',
      })),
      ...media.categoryHeroes.map((item) => ({
        ownerType: 'category',
        ownerId: item.id,
        field: 'heroMediaId',
        historical: false,
      })),
      ...media.journalDraftCovers.map((item) => ({
        ownerType: 'journal_draft',
        ownerId: item.id,
        field: 'coverMediaId',
        historical: false,
      })),
      ...media.journalPublishedCovers.map((item) => ({
        ownerType: 'journal_publication',
        ownerId: item.id,
        field: 'coverMediaId',
        historical: true,
      })),
      ...media.editorialReferences.map((item) => ({
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        field: item.field,
        historical:
          item.ownerType === 'journal_publication' || historicalHomepageIds.has(item.ownerId),
      })),
    ];
    return { media: mapMedia(media), references };
  }

  async deleteMedia(id: string, actor: EditorialActor): Promise<void> {
    const report = await this.mediaReferences(id);
    if (report.references.length > 0)
      throw new EditorialError(
        'conflict',
        'MEDIA_IN_USE',
        'Media asset is referenced and cannot be deleted.',
        report.references.map((reference) => ({
          path: `${reference.ownerType}.${reference.ownerId}.${reference.field}`,
          code: 'ACTIVE_REFERENCE',
          message: 'Remove this reference before deletion.',
        })),
      );
    try {
      await this.transactions.run(async () => {
        const client = this.client();
        await client.mediaAsset.delete({ where: { id } });
        await appendEvent(client, actor, 'media.deleted', 'media', id, {
          url: report.media.url,
          group: 'redacted-after-delete',
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003')
        throw new EditorialError(
          'conflict',
          'MEDIA_IN_USE',
          'Media gained a reference and cannot be deleted.',
        );
      throw error;
    }
  }
}
