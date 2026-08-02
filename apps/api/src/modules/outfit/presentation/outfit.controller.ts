import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { CatalogAdminRequest } from '../../catalog/presentation/admin-session.guard.js';
import {
  actorFromRequest,
  AdminSessionGuard,
  RequireAdminRoles,
} from '../../catalog/presentation/admin-session.guard.js';
import { ApplicationError } from '../../../shared/application-error.js';
import { OutfitService } from '../application/outfit.service.js';
import { AdminOutfitDto } from './outfit.dto.js';

function requiredHeader(value: string | undefined, name: string): string {
  if (value === undefined || value.length < 1) {
    throw new ApplicationError('validation', 'REQUIRED_HEADER_MISSING', `${name} is required.`);
  }
  return value;
}

function expectedVersion(value: string | undefined): number {
  const raw = requiredHeader(value, 'If-Match');
  if (!/^"[1-9][0-9]*"$/.test(raw)) {
    throw new ApplicationError(
      'validation',
      'INVALID_IF_MATCH',
      'If-Match must be a quoted positive Outfit version.',
    );
  }
  return Number(raw.slice(1, -1));
}

@Controller('catalog/outfits')
export class PublicOutfitController {
  constructor(private readonly outfits: OutfitService) {}

  @Get()
  list(@Query('category') category?: string) {
    return this.outfits.listPublic(category ?? null);
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.outfits.getPublic(slug);
  }
}

@Controller('admin/outfits')
@UseGuards(AdminSessionGuard)
@RequireAdminRoles('super_admin')
export class AdminOutfitController {
  constructor(private readonly outfits: OutfitService) {}

  @Get()
  list(@Query('status') status?: 'draft' | 'published' | 'archived') {
    return this.outfits.listAdmin(status ?? null);
  }

  @Post()
  create(@Body() body: AdminOutfitDto, @Req() request: CatalogAdminRequest) {
    return this.outfits.create(body.toDomain(), actorFromRequest(request));
  }

  @Get(':outfitId')
  get(@Param('outfitId', new ParseUUIDPipe()) outfitId: string) {
    return this.outfits.getAdmin(outfitId);
  }

  @Patch(':outfitId')
  update(
    @Param('outfitId', new ParseUUIDPipe()) outfitId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() body: AdminOutfitDto,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.outfits.update(
      outfitId,
      body.toDomain(),
      expectedVersion(ifMatch),
      actorFromRequest(request),
    );
  }

  @Get(':outfitId/validation')
  validate(@Param('outfitId', new ParseUUIDPipe()) outfitId: string) {
    return this.outfits.validate(outfitId);
  }

  @Get(':outfitId/preview')
  preview(@Param('outfitId', new ParseUUIDPipe()) outfitId: string) {
    return this.outfits.preview(outfitId);
  }

  @Get(':outfitId/revisions')
  revisions(@Param('outfitId', new ParseUUIDPipe()) outfitId: string) {
    return this.outfits.listRevisions(outfitId);
  }

  @Post(':outfitId/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @Param('outfitId', new ParseUUIDPipe()) outfitId: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.outfits.publish(
      outfitId,
      expectedVersion(ifMatch),
      requiredHeader(idempotencyKey, 'Idempotency-Key'),
      actorFromRequest(request),
    );
  }

  @Post(':outfitId/archive')
  @HttpCode(HttpStatus.OK)
  archive(
    @Param('outfitId', new ParseUUIDPipe()) outfitId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() request: CatalogAdminRequest,
  ) {
    return this.outfits.archive(
      outfitId,
      requiredHeader(idempotencyKey, 'Idempotency-Key'),
      actorFromRequest(request),
    );
  }
}
