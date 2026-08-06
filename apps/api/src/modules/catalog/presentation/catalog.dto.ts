import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsHexColor,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
  AdminCategoryInput,
  AdminMediaInput,
  AdminProductInput,
  CatalogQuery,
  InventoryActionInput,
  PublicationStatus,
} from '../domain/catalog.types.js';

const publicationStatuses = ['draft', 'published', 'archived'] as const;

export class CatalogQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['newest', 'price_asc', 'price_desc'])
  sort?: CatalogQuery['sort'];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string;

  toDomain(): CatalogQuery {
    return {
      category: this.category ?? null,
      search: this.search ?? null,
      sort: this.sort ?? 'newest',
      limit: this.limit ?? 24,
      cursor: this.cursor ?? null,
    };
  }
}

export class AdminCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(160)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsOptional()
  @IsEnum(publicationStatuses)
  status?: PublicationStatus;

  @IsOptional()
  @IsIn(['catalog', 'occasion'])
  discoveryKind?: AdminCategoryInput['discoveryKind'];

  @IsOptional()
  @IsString()
  @MaxLength(180)
  editorialTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  editorialDescription?: string | null;

  @IsOptional()
  @IsUUID()
  heroMediaId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  seoDescription?: string | null;

  toDomain(): AdminCategoryInput {
    return {
      name: this.name,
      slug: this.slug,
      description: this.description ?? null,
      displayOrder: this.displayOrder,
      status: this.status ?? 'draft',
      discoveryKind: this.discoveryKind ?? 'catalog',
      editorialTitle: this.editorialTitle ?? null,
      editorialDescription: this.editorialDescription ?? null,
      heroMediaId: this.heroMediaId ?? null,
      seoTitle: this.seoTitle ?? null,
      seoDescription: this.seoDescription ?? null,
    };
  }
}

class FocalPointDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;
}

export class AdminMediaDto {
  @Matches(/^\/media\/[A-Za-z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/)
  @MaxLength(500)
  url!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12000)
  width!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12000)
  height!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  alt!: string;

  @IsIn(['jpg', 'png', 'webp'])
  format!: AdminMediaInput['format'];

  @IsIn(['product_images', 'outfit_editorial', 'homepage', 'journal', 'shared_assets'])
  group!: AdminMediaInput['group'];

  @ValidateNested()
  @Type(() => FocalPointDto)
  focalPoint!: FocalPointDto;

  toDomain(): AdminMediaInput {
    return {
      url: this.url,
      width: this.width,
      height: this.height,
      alt: this.alt,
      format: this.format,
      group: this.group,
      focalPoint: { x: this.focalPoint.x, y: this.focalPoint.y },
    };
  }
}

class SeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  description?: string | null;
}

class AdminSkuDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  normalizedSize!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  displaySize!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountRial!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  physicalQuantity!: number;

  @IsOptional()
  @IsEnum(publicationStatuses)
  status?: PublicationStatus;
}

class AdminColorVariantDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @Matches(/^[a-z0-9][a-z0-9_-]{0,39}$/)
  normalizedColorCode!: string;

  @IsOptional()
  @IsHexColor()
  hex?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  mediaIds!: string[];

  @IsUUID()
  featuredMediaId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminSkuDto)
  skus!: AdminSkuDto[];

  @IsOptional()
  @IsEnum(publicationStatuses)
  status?: PublicationStatus;
}

export class AdminProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(160)
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  description!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  details: string[] = [];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminColorVariantDto)
  variants!: AdminColorVariantDto[];

  toDomain(): AdminProductInput {
    return {
      name: this.name,
      slug: this.slug,
      description: this.description,
      details: this.details,
      categoryIds: this.categoryIds,
      seo: {
        title: this.seo?.title ?? null,
        description: this.seo?.description ?? null,
      },
      variants: this.variants.map((variant) => ({
        ...(variant.id === undefined ? {} : { id: variant.id }),
        name: variant.name,
        normalizedColorCode: variant.normalizedColorCode,
        hex: variant.hex ?? null,
        displayOrder: variant.displayOrder,
        mediaIds: variant.mediaIds,
        featuredMediaId: variant.featuredMediaId,
        skus: variant.skus.map((sku) => ({
          ...(sku.id === undefined ? {} : { id: sku.id }),
          code: sku.code,
          normalizedSize: sku.normalizedSize,
          displaySize: sku.displaySize,
          amountRial: sku.amountRial,
          physicalQuantity: sku.physicalQuantity,
          ...(sku.status === undefined ? {} : { status: sku.status }),
        })),
        ...(variant.status === undefined ? {} : { status: variant.status }),
      })),
    };
  }
}

export class AdminPriceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountRial!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class InventoryActionDto {
  @IsIn(['production', 'manual_correction', 'damaged_goods', 'instagram_sale', 'instagram_return'])
  action!: InventoryActionInput['action'];

  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  toDomain(): InventoryActionInput {
    return { action: this.action, quantity: this.quantity, reason: this.reason };
  }
}
