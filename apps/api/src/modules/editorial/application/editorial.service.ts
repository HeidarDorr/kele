import type { EditorialRepository } from './editorial.repository.js';
import { EditorialError } from './editorial.error.js';
import type {
  EditorialActor,
  HomepageDraftInput,
  JournalDraftInput,
  SiteSettingsDraftInput,
} from '../domain/editorial.types.js';
import {
  validateHomepage,
  validateJournal,
  validateSiteSettings,
} from '../domain/editorial.validator.js';

function rejectIssues(issues: ReturnType<typeof validateHomepage>): void {
  if (issues.length > 0) {
    throw new EditorialError(
      'validation',
      'EDITORIAL_VALIDATION_FAILED',
      'Editorial content is invalid.',
      issues,
    );
  }
}

export class EditorialService {
  constructor(private readonly repository: EditorialRepository) {}

  getHomepageDraft(actor: EditorialActor) {
    return this.repository.getHomepageDraft(actor);
  }
  saveHomepageDraft(input: HomepageDraftInput, expectedVersion: number, actor: EditorialActor) {
    rejectIssues(validateHomepage(input, false));
    return this.repository.saveHomepageDraft(input, expectedVersion, actor);
  }
  previewHomepage() {
    return this.repository.previewHomepage();
  }
  publishHomepage(expectedVersion: number, actor: EditorialActor) {
    return this.repository.publishHomepage(expectedVersion, actor);
  }
  getPublishedHomepage() {
    return this.repository.getPublishedHomepage();
  }

  listJournalDrafts() {
    return this.repository.listJournalDrafts();
  }
  createJournal(input: JournalDraftInput, actor: EditorialActor) {
    rejectIssues(validateJournal(input, false));
    return this.repository.createJournal(input, actor);
  }
  getJournalDraft(id: string) {
    return this.repository.getJournalDraft(id);
  }
  updateJournal(
    id: string,
    input: JournalDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ) {
    rejectIssues(validateJournal(input, false));
    return this.repository.updateJournal(id, input, expectedVersion, actor);
  }
  previewJournal(id: string) {
    return this.repository.previewJournal(id);
  }
  publishJournal(id: string, expectedVersion: number, actor: EditorialActor) {
    return this.repository.publishJournal(id, expectedVersion, actor);
  }
  archiveJournal(id: string, expectedVersion: number, actor: EditorialActor) {
    return this.repository.archiveJournal(id, expectedVersion, actor);
  }
  listPublishedJournal(limit: number, cursor: string | null) {
    return this.repository.listPublishedJournal(limit, cursor);
  }
  getPublishedJournal(slug: string) {
    return this.repository.getPublishedJournal(slug);
  }

  getSiteSettingsDraft(actor: EditorialActor) {
    return this.repository.getSiteSettingsDraft(actor);
  }
  saveSiteSettingsDraft(
    input: SiteSettingsDraftInput,
    expectedVersion: number,
    actor: EditorialActor,
  ) {
    rejectIssues(validateSiteSettings(input, false));
    return this.repository.saveSiteSettingsDraft(input, expectedVersion, actor);
  }
  publishSiteSettings(expectedVersion: number, actor: EditorialActor) {
    return this.repository.publishSiteSettings(expectedVersion, actor);
  }
  getPublishedSiteSettings() {
    return this.repository.getPublishedSiteSettings();
  }

  async mediaReferences(id: string) {
    const result = await this.repository.mediaReferences(id);
    return { ...result, canDelete: result.references.length === 0 };
  }
  deleteMedia(id: string, actor: EditorialActor) {
    return this.repository.deleteMedia(id, actor);
  }
}
