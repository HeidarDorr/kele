CREATE TYPE "editorial_revision_state" AS ENUM ('DRAFT', 'PUBLISHED', 'HISTORICAL');
CREATE TYPE "discovery_kind" AS ENUM ('CATALOG', 'OCCASION');

ALTER TABLE "categories"
  ADD COLUMN "discovery_kind" "discovery_kind" NOT NULL DEFAULT 'CATALOG',
  ADD COLUMN "editorial_title" VARCHAR(180),
  ADD COLUMN "editorial_description" TEXT,
  ADD COLUMN "hero_media_id" UUID,
  ADD COLUMN "seo_title" VARCHAR(180),
  ADD COLUMN "seo_description" VARCHAR(320),
  ADD CONSTRAINT "categories_hero_media_id_fkey"
    FOREIGN KEY ("hero_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT;

CREATE TABLE "homepage_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "revision_number" INTEGER NOT NULL,
  "state" "editorial_revision_state" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "sections" JSONB NOT NULL,
  "actor_id" VARCHAR(120) NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "superseded_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "homepage_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "homepage_revisions_revision_number_key" UNIQUE ("revision_number"),
  CONSTRAINT "homepage_revisions_version_check" CHECK ("version" > 0)
);
CREATE UNIQUE INDEX "homepage_one_draft_idx" ON "homepage_revisions" ("state") WHERE "state" = 'DRAFT';
CREATE UNIQUE INDEX "homepage_one_published_idx" ON "homepage_revisions" ("state") WHERE "state" = 'PUBLISHED';
CREATE INDEX "homepage_revisions_state_revision_number_idx" ON "homepage_revisions" ("state", "revision_number");

CREATE TABLE "journal_articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(160) NOT NULL,
  "status" "publication_status" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(180) NOT NULL,
  "excerpt" VARCHAR(500),
  "cover_media_id" UUID,
  "blocks" JSONB NOT NULL,
  "seo_title" VARCHAR(180),
  "seo_description" VARCHAR(320),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archived_at" TIMESTAMPTZ(6),
  CONSTRAINT "journal_articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_articles_slug_key" UNIQUE ("slug"),
  CONSTRAINT "journal_articles_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "journal_articles_version_check" CHECK ("version" > 0)
);
CREATE INDEX "journal_articles_status_updated_at_idx" ON "journal_articles" ("status", "updated_at");

CREATE TABLE "journal_publications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "article_id" UUID NOT NULL,
  "publication_number" INTEGER NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "excerpt" VARCHAR(500) NOT NULL,
  "cover_media_id" UUID NOT NULL,
  "blocks" JSONB NOT NULL,
  "seo_title" VARCHAR(180) NOT NULL,
  "seo_description" VARCHAR(320) NOT NULL,
  "actor_id" VARCHAR(120) NOT NULL,
  "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "journal_publications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "journal_publications_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "journal_articles"("id") ON DELETE RESTRICT,
  CONSTRAINT "journal_publications_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "journal_publications_article_id_publication_number_key" UNIQUE ("article_id", "publication_number")
);
CREATE INDEX "journal_publications_slug_published_at_idx" ON "journal_publications" ("slug", "published_at");

CREATE TABLE "site_settings_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "revision_number" INTEGER NOT NULL,
  "state" "editorial_revision_state" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "configuration" JSONB NOT NULL,
  "content_approved_by" VARCHAR(120),
  "content_approved_at" TIMESTAMPTZ(6),
  "actor_id" VARCHAR(120) NOT NULL,
  "published_at" TIMESTAMPTZ(6),
  "superseded_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "site_settings_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "site_settings_versions_revision_number_key" UNIQUE ("revision_number"),
  CONSTRAINT "site_settings_versions_version_check" CHECK ("version" > 0),
  CONSTRAINT "site_settings_approval_pair_check" CHECK (("content_approved_by" IS NULL) = ("content_approved_at" IS NULL))
);
CREATE UNIQUE INDEX "site_settings_one_draft_idx" ON "site_settings_versions" ("state") WHERE "state" = 'DRAFT';
CREATE UNIQUE INDEX "site_settings_one_published_idx" ON "site_settings_versions" ("state") WHERE "state" = 'PUBLISHED';
CREATE INDEX "site_settings_versions_state_revision_number_idx" ON "site_settings_versions" ("state", "revision_number");

CREATE TABLE "editorial_media_references" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "media_asset_id" UUID NOT NULL,
  "owner_type" VARCHAR(40) NOT NULL,
  "owner_id" UUID NOT NULL,
  "field" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "editorial_media_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "editorial_media_references_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "editorial_media_references_media_asset_id_owner_type_owner_id_field_key" UNIQUE ("media_asset_id", "owner_type", "owner_id", "field")
);
CREATE INDEX "editorial_media_references_owner_type_owner_id_idx" ON "editorial_media_references" ("owner_type", "owner_id");

CREATE OR REPLACE FUNCTION reject_m7_immutable_update() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Milestone 7 published facts are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "journal_publications_reject_update"
BEFORE UPDATE OR DELETE ON "journal_publications"
FOR EACH ROW EXECUTE FUNCTION reject_m7_immutable_update();

CREATE TRIGGER "homepage_historical_reject_update"
BEFORE UPDATE OR DELETE ON "homepage_revisions"
FOR EACH ROW WHEN (OLD."state" = 'HISTORICAL') EXECUTE FUNCTION reject_m7_immutable_update();

CREATE TRIGGER "site_settings_historical_reject_update"
BEFORE UPDATE OR DELETE ON "site_settings_versions"
FOR EACH ROW WHEN (OLD."state" = 'HISTORICAL') EXECUTE FUNCTION reject_m7_immutable_update();
