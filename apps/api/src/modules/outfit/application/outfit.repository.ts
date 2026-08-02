import type {
  OutfitDraftInput,
  OutfitRevisionRecord,
  OutfitRevisionSummary,
} from '../domain/outfit.types.js';

export const OUTFIT_REPOSITORY = Symbol('OUTFIT_REPOSITORY');

export type OutfitActor = Readonly<{ actorId: string; correlationId: string }>;

export interface OutfitRepository {
  listPublic(): Promise<OutfitRevisionRecord[]>;
  getPublicBySlug(slug: string): Promise<OutfitRevisionRecord | null>;
  getPurchasableRevision(revisionId: string): Promise<OutfitRevisionRecord | null>;
  listAdmin(status: 'draft' | 'published' | 'archived' | null): Promise<OutfitRevisionRecord[]>;
  getAdmin(outfitId: string, lock?: boolean): Promise<OutfitRevisionRecord | null>;
  create(input: OutfitDraftInput, actor: OutfitActor): Promise<OutfitRevisionRecord>;
  replaceDraft(
    outfitId: string,
    input: OutfitDraftInput,
    expectedVersion: number,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord>;
  publish(
    outfitId: string,
    revisionId: string,
    expectedVersion: number,
    idempotencyKey: string,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord>;
  archive(
    outfitId: string,
    idempotencyKey: string,
    actor: OutfitActor,
  ): Promise<OutfitRevisionRecord>;
  listRevisions(outfitId: string): Promise<OutfitRevisionSummary[]>;
}
