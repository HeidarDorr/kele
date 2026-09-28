import type {
  HomepageDraftInput,
  HomepageMediaContent,
  HomepageReferenceContent,
  JournalBlock,
  JournalDraftInput,
  SiteSettingsDraftInput,
  ValidationIssue,
} from './editorial.types.js';

const mediaTypes = new Set(['hero', 'editorial_banner', 'brand_story']);
const referenceTypes = new Set([
  'featured_products',
  'featured_outfits',
  'occasion_grid',
  'journal_highlights',
]);
const blockTypes = new Set([
  'heading',
  'paragraph',
  'quote',
  'ordered_list',
  'unordered_list',
  'image',
  'product_reference',
  'outfit_reference',
  'external_link',
  'divider',
]);

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function isSafeInternalHref(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

export function isSafeExternalHref(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateHomepage(
  input: HomepageDraftInput,
  publication: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const orders = new Set<number>();
  let enabledHeroCount = 0;
  input.sections.forEach((section, index) => {
    const path = `sections.${String(index)}`;
    if (ids.has(section.id))
      issues.push({
        path: `${path}.id`,
        code: 'DUPLICATE',
        message: 'Section identifiers must be unique.',
      });
    ids.add(section.id);
    if (orders.has(section.order))
      issues.push({
        path: `${path}.order`,
        code: 'DUPLICATE',
        message: 'Section order must be unique.',
      });
    orders.add(section.order);
    if (section.type === 'hero' && section.enabled) enabledHeroCount += 1;
    if (mediaTypes.has(section.type)) {
      const content = section.content as HomepageMediaContent;
      if (!content.title.trim())
        issues.push({
          path: `${path}.content.title`,
          code: 'REQUIRED',
          message: 'Title is required.',
        });
      if (!content.mediaId)
        issues.push({
          path: `${path}.content.mediaId`,
          code: 'REQUIRED',
          message: 'Media is required.',
        });
      const outfitId = content.outfitId ?? null;
      if (content.href !== null && !isSafeInternalHref(content.href))
        issues.push({
          path: `${path}.content.href`,
          code: 'UNSAFE_LINK',
          message: 'Homepage links must be safe internal paths.',
        });
      if (outfitId !== null && section.type !== 'hero')
        issues.push({
          path: `${path}.content.outfitId`,
          code: 'UNSUPPORTED_FIELD',
          message: 'Only the Hero can present an Outfit.',
        });
      if (outfitId !== null && !uuidPattern.test(outfitId))
        issues.push({
          path: `${path}.content.outfitId`,
          code: 'INVALID_REFERENCE',
          message: 'Hero Outfit must be an Outfit identifier.',
        });
      if (outfitId !== null && content.href !== null)
        issues.push({
          path: `${path}.content`,
          code: 'DESTINATION_CONFLICT',
          message: 'A Hero opens either its Outfit or an internal path, not both.',
        });
      if ((content.ctaLabel === null) !== (content.href === null && outfitId === null))
        issues.push({
          path: `${path}.content`,
          code: 'CTA_PAIR_REQUIRED',
          message: 'CTA label and destination must be supplied together.',
        });
    } else if (referenceTypes.has(section.type)) {
      const content = section.content as HomepageReferenceContent;
      if (!content.title.trim())
        issues.push({
          path: `${path}.content.title`,
          code: 'REQUIRED',
          message: 'Title is required.',
        });
      if (!Array.isArray(content.referenceIds))
        issues.push({
          path: `${path}.content.referenceIds`,
          code: 'REQUIRED',
          message: 'References must be an array.',
        });
    } else {
      issues.push({
        path: `${path}.type`,
        code: 'UNSUPPORTED_SECTION',
        message: 'Homepage section type is not supported.',
      });
    }
  });
  if (publication && enabledHeroCount !== 1)
    issues.push({
      path: 'sections',
      code: 'HERO_REQUIRED',
      message: 'A published Homepage requires exactly one enabled Hero.',
    });
  return issues;
}

export function homepageMediaIds(input: HomepageDraftInput): string[] {
  return [
    ...new Set(
      input.sections
        .filter((section) => mediaTypes.has(section.type))
        .map((section) => (section.content as HomepageMediaContent).mediaId)
        .filter(Boolean),
    ),
  ];
}

export function validateJournal(input: JournalDraftInput, publication: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  input.blocks.forEach((block, index) => {
    validateBlock(block, index, ids, issues);
  });
  if (publication) {
    if (!input.excerpt?.trim())
      issues.push({
        path: 'excerpt',
        code: 'REQUIRED',
        message: 'Published Journal articles require an excerpt.',
      });
    if (!input.coverMediaId)
      issues.push({
        path: 'coverMediaId',
        code: 'REQUIRED',
        message: 'Published Journal articles require cover Media.',
      });
    if (input.blocks.length === 0)
      issues.push({
        path: 'blocks',
        code: 'REQUIRED',
        message: 'Published Journal articles require content.',
      });
    if (!input.seoTitle?.trim())
      issues.push({ path: 'seoTitle', code: 'REQUIRED', message: 'SEO title is required.' });
    if (!input.seoDescription?.trim())
      issues.push({
        path: 'seoDescription',
        code: 'REQUIRED',
        message: 'SEO description is required.',
      });
  }
  return issues;
}

function validateBlock(
  block: JournalBlock,
  index: number,
  ids: Set<string>,
  issues: ValidationIssue[],
): void {
  const path = `blocks.${String(index)}`;
  if (ids.has(block.id))
    issues.push({
      path: `${path}.id`,
      code: 'DUPLICATE',
      message: 'Block identifiers must be unique.',
    });
  ids.add(block.id);
  if (!blockTypes.has(block.type)) {
    issues.push({
      path: `${path}.type`,
      code: 'UNSUPPORTED_BLOCK',
      message: 'Journal block type is not supported.',
    });
    return;
  }
  if (['heading', 'paragraph', 'quote'].includes(block.type) && !block.text?.trim())
    issues.push({ path: `${path}.text`, code: 'REQUIRED', message: 'Text is required.' });
  if (
    ['ordered_list', 'unordered_list'].includes(block.type) &&
    (!block.items || block.items.length === 0 || block.items.some((item) => !item.trim()))
  )
    issues.push({
      path: `${path}.items`,
      code: 'REQUIRED',
      message: 'List items must contain text.',
    });
  if (block.type === 'image' && !block.mediaId)
    issues.push({ path: `${path}.mediaId`, code: 'REQUIRED', message: 'Image Media is required.' });
  if (['product_reference', 'outfit_reference'].includes(block.type) && !block.referenceId)
    issues.push({
      path: `${path}.referenceId`,
      code: 'REQUIRED',
      message: 'Internal reference is required.',
    });
  if (
    block.type === 'external_link' &&
    (!block.label?.trim() || !block.href || !isSafeExternalHref(block.href))
  )
    issues.push({
      path,
      code: 'UNSAFE_LINK',
      message: 'External links require a label and HTTPS URL.',
    });
}

/** Outfits an enabled Hero presents; publication requires each to be published. */
export function homepageHeroOutfitIds(input: HomepageDraftInput): string[] {
  return [
    ...new Set(
      input.sections.flatMap((section) => {
        if (section.type !== 'hero' || !section.enabled) return [];
        const outfitId = (section.content as HomepageMediaContent).outfitId ?? null;
        return outfitId === null ? [] : [outfitId];
      }),
    ),
  ];
}

export function journalMediaIds(input: JournalDraftInput): string[] {
  const ids = input.blocks.flatMap((block) =>
    block.type === 'image' && block.mediaId ? [block.mediaId] : [],
  );
  if (input.coverMediaId) ids.push(input.coverMediaId);
  return [...new Set(ids)];
}

export function validateSiteSettings(
  input: SiteSettingsDraftInput,
  publication: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const config = input.configuration;
  if (!config.brandName.trim())
    issues.push({
      path: 'configuration.brandName',
      code: 'REQUIRED',
      message: 'Brand name is required.',
    });
  if (!config.brandTagline.trim())
    issues.push({
      path: 'configuration.brandTagline',
      code: 'REQUIRED',
      message: 'Brand tagline is required.',
    });
  for (const [group, links] of [
    ['primaryNavigation', config.primaryNavigation],
    ['footerNavigation', config.footerNavigation],
  ] as const) {
    links.forEach((link, index) => {
      if (!link.label.trim())
        issues.push({
          path: `configuration.${group}.${String(index)}.label`,
          code: 'REQUIRED',
          message: 'Link label is required.',
        });
      if (!isSafeInternalHref(link.href))
        issues.push({
          path: `configuration.${group}.${String(index)}.href`,
          code: 'UNSAFE_LINK',
          message: 'Navigation links must be safe internal paths.',
        });
    });
  }
  const sensitive =
    config.announcement !== null &&
    config.announcementKind !== null &&
    config.announcementKind !== 'brand';
  if (publication && sensitive && (!input.contentApprovedBy || !input.contentApprovedAt))
    issues.push({
      path: 'contentApprovedBy',
      code: 'CONTENT_APPROVAL_REQUIRED',
      message: 'Sensitive customer-facing copy requires explicit approval.',
    });
  if (input.contentApprovedAt !== null && Number.isNaN(Date.parse(input.contentApprovedAt)))
    issues.push({
      path: 'contentApprovedAt',
      code: 'INVALID_DATE',
      message: 'Approval time must be an ISO date-time.',
    });
  return issues;
}
