import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
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
import type { OutfitDraftInput } from '../domain/outfit.types.js';

class OutfitSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  description?: string | null;
}

class OutfitItemDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  productId!: string;

  @IsUUID()
  defaultColorVariantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

class OutfitComponentDto {
  @IsUUID()
  outfitItemId!: string;

  @IsUUID()
  skuId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;
}

class OutfitSizeDto {
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountRial!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutfitComponentDto)
  components!: OutfitComponentDto[];
}

export class AdminOutfitDto {
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
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds!: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  mediaIds!: string[];

  @IsUUID()
  featuredMediaId!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OutfitSeoDto)
  seo?: OutfitSeoDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutfitItemDto)
  items!: OutfitItemDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OutfitSizeDto)
  sizes!: OutfitSizeDto[];

  toDomain(): OutfitDraftInput {
    return {
      name: this.name,
      slug: this.slug,
      description: this.description,
      categoryIds: this.categoryIds,
      mediaIds: this.mediaIds,
      featuredMediaId: this.featuredMediaId,
      seo: { title: this.seo?.title ?? null, description: this.seo?.description ?? null },
      items: this.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        defaultColorVariantId: item.defaultColorVariantId,
        quantity: item.quantity,
        displayOrder: item.displayOrder,
      })),
      sizes: this.sizes.map((size) => ({
        code: size.code,
        label: size.label,
        amountRial: size.amountRial,
        displayOrder: size.displayOrder,
        components: size.components.map((component) => ({
          outfitItemId: component.outfitItemId,
          skuId: component.skuId,
          quantity: component.quantity,
          displayOrder: component.displayOrder,
        })),
      })),
    };
  }
}
