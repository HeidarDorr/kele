import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import type { PrismaTransactionContext } from '../src/infrastructure/prisma/prisma-transaction.context.js';
import { EditorialError } from '../src/modules/editorial/application/editorial.error.js';
import type {
  EditorialActor,
  JournalDraftInput,
} from '../src/modules/editorial/domain/editorial.types.js';
import { PrismaEditorialRepository } from '../src/modules/editorial/infrastructure/prisma-editorial.repository.js';

const prisma = new PrismaClient();
const rollback = new Error('ROLLBACK_EDITORIAL_INTEGRATION');

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

describe('Milestone 7 editorial persistence', () => {
  it('[PUB-002..004][PUB-011][CMS-006..013][CMS-016][EVT-008] isolates drafts, publishes immutable snapshots and retains Media', async () => {
    await inRollback(async (transaction) => {
      await transaction.$executeRawUnsafe(
        'TRUNCATE TABLE "homepage_revisions", "journal_articles", "site_settings_versions" CASCADE',
      );
      const context = {
        client: () => transaction,
        run: <T>(operation: () => Promise<T>) => operation(),
      } as PrismaTransactionContext;
      const repository = new PrismaEditorialRepository(context);
      const actor: EditorialActor = {
        actorId: 'editorial-integration-super',
        role: 'super_admin',
        correlationId: randomUUID(),
      };
      const media = await transaction.mediaAsset.create({
        data: {
          url: `/media/editorial/${randomUUID()}.webp`,
          width: 1600,
          height: 1200,
          altText: 'پسربچه با کت رسمی در فضای معماری روشن',
          format: 'WEBP',
          group: 'HOMEPAGE',
        },
      });

      const homepageDraft = await repository.getHomepageDraft(actor);
      const savedHomepage = await repository.saveHomepageDraft(
        {
          sections: [
            {
              id: randomUUID(),
              type: 'hero',
              enabled: true,
              order: 0,
              content: {
                title: 'برای لحظه‌های ماندگار',
                subtitle: 'روایتی آرام از پوشاک معاصر پسرانه',
                mediaId: media.id,
                ctaLabel: 'دیدن کالکشن',
                href: '/catalog',
              },
            },
          ],
        },
        homepageDraft.version,
        actor,
      );
      await expect(repository.getPublishedHomepage()).rejects.toMatchObject({
        code: 'EDITORIAL_NOT_FOUND',
      });
      const publishedHomepage = await repository.publishHomepage(savedHomepage.version, actor);
      expect((await repository.getPublishedHomepage()).revisionNumber).toBe(
        publishedHomepage.revisionNumber,
      );
      const nextDraft = await repository.getHomepageDraft(actor);
      const firstSection = nextDraft.sections[0];
      if (!firstSection) throw new Error('Seeded Homepage draft must contain a section.');
      await repository.saveHomepageDraft(
        {
          sections: [
            {
              ...firstSection,
              content: {
                ...(firstSection.content as {
                  title: string;
                  subtitle: string | null;
                  mediaId: string;
                  ctaLabel: string | null;
                  href: string | null;
                }),
                title: 'عنوان منتشرنشده',
              },
            },
          ],
        },
        nextDraft.version,
        actor,
      );
      expect((await repository.getPublishedHomepage()).sections[0]?.content).toMatchObject({
        title: 'برای لحظه‌های ماندگار',
      });

      const slug = `journal-${randomUUID()}`;
      const journalInput: JournalDraftInput = {
        slug,
        title: 'هنر انتخاب برای یک مناسبت',
        excerpt: 'نگاهی به تناسب، پارچه و جزئیاتی که یک ست را کامل می‌کنند.',
        coverMediaId: media.id,
        blocks: [
          { id: randomUUID(), type: 'heading', level: 2, text: 'تناسب از جزئیات آغاز می‌شود' },
          {
            id: randomUUID(),
            type: 'paragraph',
            text: 'انتخاب سنجیده با شناخت موقعیت و حرکت کودک شکل می‌گیرد.',
          },
        ],
        seoTitle: 'راهنمای انتخاب پوشاک رسمی پسرانه',
        seoDescription: 'راهنمای ادیتوریال کله برای انتخاب پوشاک رسمی پسرانه.',
      };
      const article = await repository.createJournal(journalInput, actor);
      const publication = await repository.publishJournal(article.id, article.version, actor);
      expect((await repository.getPublishedJournal(slug)).title).toBe(publication.title);
      const updated = await repository.updateJournal(
        article.id,
        { ...journalInput, title: 'عنوان پیش‌نویس تازه' },
        article.version,
        actor,
      );
      expect(updated.title).toBe('عنوان پیش‌نویس تازه');
      expect((await repository.getPublishedJournal(slug)).title).toBe('هنر انتخاب برای یک مناسبت');

      const references = await repository.mediaReferences(media.id);
      expect(references.references.some((reference) => reference.historical)).toBe(true);
      await expect(repository.deleteMedia(media.id, actor)).rejects.toBeInstanceOf(EditorialError);

      const settingsDraft = await repository.getSiteSettingsDraft(actor);
      const savedSettings = await repository.saveSiteSettingsDraft(
        {
          configuration: {
            ...settingsDraft.configuration,
            announcement: 'روایت تازه کله منتشر شد',
            announcementKind: 'brand',
          },
          contentApprovedBy: null,
          contentApprovedAt: null,
        },
        settingsDraft.version,
        actor,
      );
      await repository.publishSiteSettings(savedSettings.version, actor);
      const publicSettings = await repository.getPublishedSiteSettings();
      const isolatedDraft = await repository.getSiteSettingsDraft(actor);
      await repository.saveSiteSettingsDraft(
        {
          configuration: { ...isolatedDraft.configuration, brandTagline: 'متن منتشرنشده' },
          contentApprovedBy: null,
          contentApprovedAt: null,
        },
        isolatedDraft.version,
        actor,
      );
      expect((await repository.getPublishedSiteSettings()).configuration.brandTagline).toBe(
        publicSettings.configuration.brandTagline,
      );

      const events = await transaction.businessEvent.findMany({
        where: { actorId: actor.actorId },
      });
      expect(events.map((event) => event.type)).toEqual(
        expect.arrayContaining([
          'homepage.published',
          'journal.published',
          'site_settings.published',
        ]),
      );
      await expect(repository.createJournal(journalInput, actor)).rejects.toMatchObject({
        code: 'JOURNAL_SLUG_CONFLICT',
      });
    });
  });

  it('[CMS-006][CMS-007] publishes a Hero Outfit only while that Outfit is published', async () => {
    await inRollback(async (transaction) => {
      await transaction.$executeRawUnsafe('TRUNCATE TABLE "homepage_revisions" CASCADE');
      const context = {
        client: () => transaction,
        run: <T>(operation: () => Promise<T>) => operation(),
      } as PrismaTransactionContext;
      const repository = new PrismaEditorialRepository(context);
      const actor: EditorialActor = {
        actorId: 'editorial-integration-hero-outfit',
        role: 'super_admin',
        correlationId: randomUUID(),
      };
      const media = await transaction.mediaAsset.create({
        data: {
          url: `/media/editorial/${randomUUID()}.webp`,
          width: 3200,
          height: 1400,
          altText: 'پسربچه با ست لینن در حیاطی آفتابی',
          format: 'WEBP',
          group: 'HOMEPAGE',
        },
      });
      const outfit = await transaction.outfit.create({
        data: { slug: `hero-outfit-${randomUUID()}`, status: 'DRAFT' },
      });
      const heroInput = {
        sections: [
          {
            id: randomUUID(),
            type: 'hero' as const,
            enabled: true,
            order: 0,
            content: {
              title: 'برای لحظه‌هایی که تکرار نمی‌شوند.',
              subtitle: null,
              mediaId: media.id,
              ctaLabel: 'مشاهده ست',
              href: null,
              outfitId: outfit.id,
            },
          },
        ],
      };

      const draft = await repository.getHomepageDraft(actor);
      const saved = await repository.saveHomepageDraft(heroInput, draft.version, actor);
      await expect(repository.publishHomepage(saved.version, actor)).rejects.toMatchObject({
        code: 'EDITORIAL_REFERENCE_INVALID',
      });

      await transaction.outfit.update({
        where: { id: outfit.id },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      await repository.publishHomepage(saved.version, actor);
      expect((await repository.getPublishedHomepage()).sections[0]?.content).toMatchObject({
        outfitId: outfit.id,
        href: null,
      });
    });
  });
});
