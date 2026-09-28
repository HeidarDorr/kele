import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  HomepageDraftInput,
  HomepageMediaContent,
  HomepageReferenceContent,
  HomepageSection,
  HomepageSectionType,
  JournalBlock,
  JournalBlockType,
  JournalDraftInput,
  SensitiveContentKind,
  SiteSettingsDraftInput,
} from '../domain/editorial.types.js';

const sectionTypes = [
  'hero',
  'editorial_banner',
  'featured_products',
  'featured_outfits',
  'occasion_grid',
  'journal_highlights',
  'brand_story',
] as const;
const blockTypes = [
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
] as const;

class HomepageSectionDto {
  @IsUUID() id!: string;
  @IsIn(sectionTypes) type!: HomepageSectionType;
  @IsBoolean() enabled!: boolean;
  @Type(() => Number) @IsInt() @Min(0) order!: number;
  @IsObject() content!: Record<string, unknown>;

  toDomain(): HomepageSection {
    if (['hero', 'editorial_banner', 'brand_story'].includes(this.type)) {
      const content = this.content as Partial<HomepageMediaContent>;
      return {
        id: this.id,
        type: this.type,
        enabled: this.enabled,
        order: this.order,
        content: {
          title: content.title ?? '',
          subtitle: typeof content.subtitle === 'string' ? content.subtitle : null,
          mediaId: content.mediaId ?? '',
          ctaLabel: typeof content.ctaLabel === 'string' ? content.ctaLabel : null,
          href: typeof content.href === 'string' ? content.href : null,
          outfitId: typeof content.outfitId === 'string' ? content.outfitId : null,
        },
      };
    }
    const content = this.content as Partial<HomepageReferenceContent>;
    return {
      id: this.id,
      type: this.type,
      enabled: this.enabled,
      order: this.order,
      content: {
        title: content.title ?? '',
        referenceIds: Array.isArray(content.referenceIds)
          ? content.referenceIds.filter((value): value is string => typeof value === 'string')
          : [],
      },
    };
  }
}

export class HomepageDraftDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => HomepageSectionDto)
  sections!: HomepageSectionDto[];
  toDomain(): HomepageDraftInput {
    return { sections: this.sections.map((section) => section.toDomain()) };
  }
}

class JournalBlockDto {
  @IsUUID() id!: string;
  @IsIn(blockTypes) type!: JournalBlockType;
  @IsOptional() @IsString() @MaxLength(5000) text?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(3) level?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  items?: string[];
  @IsOptional() @IsUUID() mediaId?: string;
  @IsOptional() @IsUUID() referenceId?: string;
  @IsOptional() @IsString() @MaxLength(180) label?: string;
  @IsOptional() @IsString() @MaxLength(1000) href?: string;
  toDomain(): JournalBlock {
    return {
      id: this.id,
      type: this.type,
      ...(this.text === undefined ? {} : { text: this.text }),
      ...(this.level === undefined ? {} : { level: this.level as 2 | 3 }),
      ...(this.items === undefined ? {} : { items: this.items }),
      ...(this.mediaId === undefined ? {} : { mediaId: this.mediaId }),
      ...(this.referenceId === undefined ? {} : { referenceId: this.referenceId }),
      ...(this.label === undefined ? {} : { label: this.label }),
      ...(this.href === undefined ? {} : { href: this.href }),
    };
  }
}

export class JournalDraftDto {
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(160) slug!: string;
  @IsString() @MinLength(1) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(500) excerpt?: string | null;
  @IsOptional() @IsUUID() coverMediaId?: string | null;
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => JournalBlockDto)
  blocks!: JournalBlockDto[];
  @IsOptional() @IsString() @MaxLength(180) seoTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string | null;
  toDomain(): JournalDraftInput {
    return {
      slug: this.slug,
      title: this.title,
      excerpt: this.excerpt ?? null,
      coverMediaId: this.coverMediaId ?? null,
      blocks: this.blocks.map((block) => block.toDomain()),
      seoTitle: this.seoTitle ?? null,
      seoDescription: this.seoDescription ?? null,
    };
  }
}

class SiteLinkDto {
  @IsString() @MinLength(1) @MaxLength(80) label!: string;
  @IsString() @MinLength(1) @MaxLength(500) href!: string;
}

class SeoDefaultsDto {
  @IsString() @MinLength(1) @MaxLength(180) title!: string;
  @IsString() @MinLength(1) @MaxLength(320) description!: string;
}

class SiteSettingsConfigurationDto {
  @IsString() @MinLength(1) @MaxLength(120) brandName!: string;
  @IsString() @MinLength(1) @MaxLength(240) brandTagline!: string;
  @IsOptional() @IsEmail() contactEmail?: string | null;
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SiteLinkDto)
  primaryNavigation!: SiteLinkDto[];
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SiteLinkDto)
  footerNavigation!: SiteLinkDto[];
  @IsOptional() @IsString() @MaxLength(240) announcement?: string | null;
  @IsOptional()
  @IsIn(['brand', 'legal', 'pricing', 'shipping', 'returns'])
  announcementKind?: SensitiveContentKind | null;
  @ValidateNested() @Type(() => SeoDefaultsDto) seoDefaults!: SeoDefaultsDto;
}

export class SiteSettingsDraftDto {
  @ValidateNested()
  @Type(() => SiteSettingsConfigurationDto)
  configuration!: SiteSettingsConfigurationDto;
  @IsOptional() @IsString() @MaxLength(120) contentApprovedBy?: string | null;
  @IsOptional() @IsString() contentApprovedAt?: string | null;
  toDomain(): SiteSettingsDraftInput {
    return {
      configuration: {
        brandName: this.configuration.brandName,
        brandTagline: this.configuration.brandTagline,
        contactEmail: this.configuration.contactEmail ?? null,
        primaryNavigation: this.configuration.primaryNavigation.map((link) => ({
          label: link.label,
          href: link.href,
        })),
        footerNavigation: this.configuration.footerNavigation.map((link) => ({
          label: link.label,
          href: link.href,
        })),
        announcement: this.configuration.announcement ?? null,
        announcementKind: this.configuration.announcementKind ?? null,
        seoDefaults: {
          title: this.configuration.seoDefaults.title,
          description: this.configuration.seoDefaults.description,
        },
      },
      contentApprovedBy: this.contentApprovedBy ?? null,
      contentApprovedAt: this.contentApprovedAt ?? null,
    };
  }
}

export class EditorialPageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() @MaxLength(500) cursor?: string;
}
