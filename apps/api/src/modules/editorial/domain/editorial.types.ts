export type EditorialRevisionState = 'draft' | 'published' | 'historical';
export type PublicationStatus = 'draft' | 'published' | 'archived';

export interface EditorialActor {
  actorId: string;
  role: 'super_admin' | 'inventory_admin' | 'instagram_admin';
  correlationId: string;
}

export interface MediaValue {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  focalPoint: { x: number; y: number };
}

export interface HomepageMediaContent {
  title: string;
  subtitle: string | null;
  mediaId: string;
  ctaLabel: string | null;
  href: string | null;
  /** Hero only; revisions saved before the field existed omit it. */
  outfitId?: string | null;
}

export interface HomepageReferenceContent {
  title: string;
  referenceIds: string[];
}

export type HomepageSectionType =
  | 'hero'
  | 'editorial_banner'
  | 'featured_products'
  | 'featured_outfits'
  | 'occasion_grid'
  | 'journal_highlights'
  | 'brand_story';

export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  enabled: boolean;
  order: number;
  content: HomepageMediaContent | HomepageReferenceContent;
}

export interface HomepageDraftInput {
  sections: HomepageSection[];
}

export interface HomepageValue {
  id: string;
  revisionNumber: number;
  state: EditorialRevisionState;
  version: number;
  sections: HomepageSection[];
  media: MediaValue[];
  updatedAt: string;
  publishedAt: string | null;
}

export type JournalBlockType =
  | 'heading'
  | 'paragraph'
  | 'quote'
  | 'ordered_list'
  | 'unordered_list'
  | 'image'
  | 'product_reference'
  | 'outfit_reference'
  | 'external_link'
  | 'divider';

export interface JournalBlock {
  id: string;
  type: JournalBlockType;
  text?: string;
  level?: 2 | 3;
  items?: string[];
  mediaId?: string;
  referenceId?: string;
  label?: string;
  href?: string;
}

export interface JournalDraftInput {
  slug: string;
  title: string;
  excerpt: string | null;
  coverMediaId: string | null;
  blocks: JournalBlock[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface AdminJournalValue extends JournalDraftInput {
  id: string;
  status: PublicationStatus;
  version: number;
  publicationCount: number;
  updatedAt: string;
}

export interface PublishedJournalValue {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverMedia: MediaValue;
  blocks: JournalBlock[];
  media: MediaValue[];
  seo: { title: string; description: string };
  publishedAt: string;
}

export interface SiteLink {
  label: string;
  href: string;
}

export type SensitiveContentKind = 'brand' | 'legal' | 'pricing' | 'shipping' | 'returns';

export interface SiteSettingsConfiguration {
  brandName: string;
  brandTagline: string;
  contactEmail: string | null;
  primaryNavigation: SiteLink[];
  footerNavigation: SiteLink[];
  announcement: string | null;
  announcementKind: SensitiveContentKind | null;
  seoDefaults: { title: string; description: string };
}

export interface SiteSettingsDraftInput {
  configuration: SiteSettingsConfiguration;
  contentApprovedBy: string | null;
  contentApprovedAt: string | null;
}

export interface SiteSettingsValue extends SiteSettingsDraftInput {
  id: string;
  revisionNumber: number;
  state: EditorialRevisionState;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface MediaReferenceValue {
  ownerType: string;
  ownerId: string;
  field: string;
  historical: boolean;
}
