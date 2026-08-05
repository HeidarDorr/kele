import type {
  AdminJournalValue,
  EditorialActor,
  HomepageDraftInput,
  HomepageValue,
  JournalDraftInput,
  MediaReferenceValue,
  MediaValue,
  PublishedJournalValue,
  SiteSettingsDraftInput,
  SiteSettingsValue,
} from '../domain/editorial.types.js';

export const EDITORIAL_REPOSITORY = Symbol('EDITORIAL_REPOSITORY');

export interface EditorialRepository {
  getHomepageDraft(actor: EditorialActor): Promise<HomepageValue>;
  saveHomepageDraft(
    input: HomepageDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<HomepageValue>;
  previewHomepage(): Promise<HomepageValue>;
  publishHomepage(expectedVersion: number, actor: EditorialActor): Promise<HomepageValue>;
  getPublishedHomepage(): Promise<HomepageValue>;

  listJournalDrafts(): Promise<AdminJournalValue[]>;
  createJournal(input: JournalDraftInput, actor: EditorialActor): Promise<AdminJournalValue>;
  getJournalDraft(id: string): Promise<AdminJournalValue>;
  updateJournal(
    id: string,
    input: JournalDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<AdminJournalValue>;
  previewJournal(id: string): Promise<PublishedJournalValue>;
  publishJournal(
    id: string,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<PublishedJournalValue>;
  archiveJournal(id: string, expectedVersion: number, actor: EditorialActor): Promise<void>;
  listPublishedJournal(
    limit: number,
    cursor: string | null,
  ): Promise<{ items: PublishedJournalValue[]; nextCursor: string | null; hasMore: boolean }>;
  getPublishedJournal(slug: string): Promise<PublishedJournalValue>;

  getSiteSettingsDraft(actor: EditorialActor): Promise<SiteSettingsValue>;
  saveSiteSettingsDraft(
    input: SiteSettingsDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ): Promise<SiteSettingsValue>;
  publishSiteSettings(expectedVersion: number, actor: EditorialActor): Promise<SiteSettingsValue>;
  getPublishedSiteSettings(): Promise<SiteSettingsValue>;

  mediaReferences(id: string): Promise<{ media: MediaValue; references: MediaReferenceValue[] }>;
  deleteMedia(id: string, actor: EditorialActor): Promise<void>;
}
