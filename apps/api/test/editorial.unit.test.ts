import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CatalogService } from '../src/modules/catalog/application/catalog.service.js';
import type { CatalogRepository } from '../src/modules/catalog/application/catalog.repository.js';
import {
  isSafeExternalHref,
  validateHomepage,
  validateJournal,
  validateSiteSettings,
} from '../src/modules/editorial/domain/editorial.validator.js';

describe('Milestone 7 editorial validation', () => {
  it('[CMS-006][CMS-007] accepts only one publishable typed Hero and safe internal links', () => {
    const mediaId = randomUUID();
    const valid = validateHomepage(
      {
        sections: [
          {
            id: randomUUID(),
            type: 'hero',
            enabled: true,
            order: 0,
            content: {
              title: 'روایت تازه کله',
              subtitle: null,
              mediaId,
              ctaLabel: 'دیدن کالکشن',
              href: '/catalog',
            },
          },
        ],
      },
      true,
    );
    expect(valid).toEqual([]);
    const unsafe = validateHomepage(
      {
        sections: [
          {
            id: randomUUID(),
            type: 'hero',
            enabled: true,
            order: 0,
            content: {
              title: 'ناامن',
              subtitle: null,
              mediaId,
              ctaLabel: 'باز کردن',
              href: 'javascript:alert(1)',
            },
          },
        ],
      },
      true,
    );
    expect(unsafe.map((issue) => issue.code)).toContain('UNSAFE_LINK');
  });

  it('[CMS-006][CMS-007] lets only the Hero present an Outfit as its single destination', () => {
    const mediaId = randomUUID();
    const outfitId = randomUUID();
    const hero = (
      content: Partial<Parameters<typeof validateHomepage>[0]['sections'][0]['content']>,
    ) =>
      validateHomepage(
        {
          sections: [
            {
              id: randomUUID(),
              type: 'hero',
              enabled: true,
              order: 0,
              content: {
                title: 'ست فصل',
                subtitle: null,
                mediaId,
                ctaLabel: 'مشاهده ست',
                href: null,
                outfitId,
                ...content,
              },
            },
          ],
        },
        true,
      ).map((issue) => issue.code);

    expect(hero({})).toEqual([]);
    expect(hero({ href: '/catalog' })).toContain('DESTINATION_CONFLICT');
    expect(hero({ ctaLabel: null })).toContain('CTA_PAIR_REQUIRED');
    expect(hero({ outfitId: 'not-an-outfit' })).toContain('INVALID_REFERENCE');
    expect(hero({ outfitId: null, ctaLabel: null })).toEqual([]);

    const story = validateHomepage(
      {
        sections: [
          {
            id: randomUUID(),
            type: 'brand_story',
            enabled: true,
            order: 1,
            content: {
              title: 'روایت',
              subtitle: null,
              mediaId,
              ctaLabel: 'مشاهده',
              href: null,
              outfitId,
            },
          },
        ],
      },
      false,
    );
    expect(story.map((issue) => issue.code)).toContain('UNSUPPORTED_FIELD');
  });

  it('[CMS-011][CMS-013] rejects arbitrary blocks and non-HTTPS external links', () => {
    expect(isSafeExternalHref('https://example.com/story')).toBe(true);
    expect(isSafeExternalHref('data:text/html,unsafe')).toBe(false);
    const issues = validateJournal(
      {
        slug: 'unsafe-story',
        title: 'روایت ناامن',
        excerpt: 'چکیده',
        coverMediaId: randomUUID(),
        seoTitle: 'عنوان',
        seoDescription: 'توضیح',
        blocks: [
          { id: randomUUID(), type: 'external_link', label: 'لینک', href: 'http://example.com' },
          { id: randomUUID(), type: 'script' as 'paragraph', text: '<script>alert(1)</script>' },
        ],
      },
      true,
    );
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['UNSAFE_LINK', 'UNSUPPORTED_BLOCK']),
    );
  });

  it('[CMS-012] requires explicit approval before sensitive public copy can publish', () => {
    const issues = validateSiteSettings(
      {
        configuration: {
          brandName: 'KELE',
          brandTagline: 'پوشاک معاصر پسرانه',
          contactEmail: null,
          primaryNavigation: [{ label: 'ژورنال', href: '/journal' }],
          footerNavigation: [],
          announcement: 'ارسال رایگان برای سفارش‌های واجد شرایط',
          announcementKind: 'shipping',
          seoDefaults: { title: 'کله', description: 'پوشاک معاصر پسرانه' },
        },
        contentApprovedBy: null,
        contentApprovedAt: null,
      },
      true,
    );
    expect(issues.map((issue) => issue.code)).toContain('CONTENT_APPROVAL_REQUIRED');
  });
});

describe('Milestone 7 Occasion publication validation', () => {
  it('[CMS-010] rejects a published Occasion without complete editorial and SEO content', () => {
    const service = new CatalogService({} as CatalogRepository);
    expect(() =>
      service.createCategory(
        {
          name: 'مراسم',
          slug: 'occasion',
          description: null,
          displayOrder: 1,
          status: 'published',
          discoveryKind: 'occasion',
          editorialTitle: null,
          editorialDescription: null,
          heroMediaId: null,
          seoTitle: null,
          seoDescription: null,
        },
        {
          actorId: 'admin-super',
          role: 'super_admin',
          correlationId: '00000000-0000-4000-8000-000000000001',
        },
      ),
    ).toThrow(/editorialTitle/u);
  });
});
