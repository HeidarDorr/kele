import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EditorialService } from '../application/editorial.service.js';
import { EditorialError } from '../application/editorial.error.js';
import {
  EditorialPageQueryDto,
  HomepageDraftDto,
  JournalDraftDto,
  SiteSettingsDraftDto,
} from './editorial.dto.js';
import {
  actorFromRequest,
  AdminSessionGuard,
  RequireAdminRoles,
  type CatalogAdminRequest,
} from '../../catalog/presentation/admin-session.guard.js';
import type {
  EditorialActor,
  HomepageValue,
  SiteSettingsValue,
} from '../domain/editorial.types.js';

function versionHeader(value: string | undefined): number {
  if (!value || !/^"[1-9][0-9]*"$/.test(value))
    throw new EditorialError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match must be a fully quoted positive integer.',
    );
  const version = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(version))
    throw new EditorialError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match exceeds the safe integer range.',
    );
  return version;
}

function editorialActor(request: CatalogAdminRequest): EditorialActor {
  return actorFromRequest(request);
}
function publicHomepage(value: HomepageValue) {
  return {
    revisionNumber: value.revisionNumber,
    publishedAt: value.publishedAt ?? value.updatedAt,
    sections: value.sections,
    media: value.media,
  };
}
function publicSettings(value: SiteSettingsValue) {
  return {
    revisionNumber: value.revisionNumber,
    configuration: value.configuration,
    publishedAt: value.publishedAt ?? value.updatedAt,
  };
}

@Controller()
export class PublicEditorialController {
  constructor(private readonly editorial: EditorialService) {}
  @Get('homepage') async homepage() {
    return publicHomepage(await this.editorial.getPublishedHomepage());
  }
  @Get('journal') async journal(@Query() query: EditorialPageQueryDto) {
    const result = await this.editorial.listPublishedJournal(
      query.limit ?? 12,
      query.cursor ?? null,
    );
    return {
      items: result.items.map((item) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        coverMedia: item.coverMedia,
        publishedAt: item.publishedAt,
      })),
      page: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    };
  }
  @Get('journal/:slug') journalArticle(@Param('slug') slug: string) {
    return this.editorial.getPublishedJournal(slug);
  }
  @Get('settings/site') async settings() {
    return publicSettings(await this.editorial.getPublishedSiteSettings());
  }
}

@Controller('admin')
@UseGuards(AdminSessionGuard)
@RequireAdminRoles('super_admin')
export class AdminEditorialController {
  constructor(private readonly editorial: EditorialService) {}
  @Get('homepage') homepage(@Req() request: CatalogAdminRequest) {
    return this.editorial.getHomepageDraft(editorialActor(request));
  }
  @Put('homepage') saveHomepage(
    @Headers('if-match') match: string | undefined,
    @Body() body: HomepageDraftDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.saveHomepageDraft(
      body.toDomain(),
      versionHeader(match),
      editorialActor(request),
    );
  }
  @Get('homepage/preview') async previewHomepage() {
    return publicHomepage(await this.editorial.previewHomepage());
  }
  @Post('homepage/publish') @HttpCode(HttpStatus.OK) async publishHomepage(
    @Headers('if-match') match: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return publicHomepage(
      await this.editorial.publishHomepage(versionHeader(match), editorialActor(request)),
    );
  }

  @Get('journal') journal() {
    return this.editorial.listJournalDrafts();
  }
  @Post('journal') createJournal(
    @Body() body: JournalDraftDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.createJournal(body.toDomain(), editorialActor(request));
  }
  @Get('journal/:articleId') journalArticle(@Param('articleId') id: string) {
    return this.editorial.getJournalDraft(id);
  }
  @Put('journal/:articleId') updateJournal(
    @Param('articleId') id: string,
    @Headers('if-match') match: string | undefined,
    @Body() body: JournalDraftDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.updateJournal(
      id,
      body.toDomain(),
      versionHeader(match),
      editorialActor(request),
    );
  }
  @Get('journal/:articleId/preview') previewJournal(@Param('articleId') id: string) {
    return this.editorial.previewJournal(id);
  }
  @Post('journal/:articleId/publish') @HttpCode(HttpStatus.OK) publishJournal(
    @Param('articleId') id: string,
    @Headers('if-match') match: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.publishJournal(id, versionHeader(match), editorialActor(request));
  }
  @Post('journal/:articleId/archive') @HttpCode(HttpStatus.NO_CONTENT) archiveJournal(
    @Param('articleId') id: string,
    @Headers('if-match') match: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.archiveJournal(id, versionHeader(match), editorialActor(request));
  }

  @Get('settings/site') settings(@Req() request: CatalogAdminRequest) {
    return this.editorial.getSiteSettingsDraft(editorialActor(request));
  }
  @Put('settings/site') saveSettings(
    @Headers('if-match') match: string | undefined,
    @Body() body: SiteSettingsDraftDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.saveSiteSettingsDraft(
      body.toDomain(),
      versionHeader(match),
      editorialActor(request),
    );
  }
  @Post('settings/site/publish') @HttpCode(HttpStatus.OK) async publishSettings(
    @Headers('if-match') match: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return publicSettings(
      await this.editorial.publishSiteSettings(versionHeader(match), editorialActor(request)),
    );
  }

  @Get('media/:mediaId/references') mediaReferences(@Param('mediaId') id: string) {
    return this.editorial.mediaReferences(id);
  }
  @Delete('media/:mediaId/references') @HttpCode(HttpStatus.NO_CONTENT) deleteMedia(
    @Param('mediaId') id: string,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.editorial.deleteMedia(id, editorialActor(request));
  }
}
