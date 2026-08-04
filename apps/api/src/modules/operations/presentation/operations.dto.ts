import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { BulkFilters, ReturnSubmission, TrackingInput } from '../domain/operations.types.js';

export class TrackingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  carrier!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  trackingNumber!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1000)
  trackingUrl?: string | null;

  toDomain(): TrackingInput {
    return {
      carrier: this.carrier,
      trackingNumber: this.trackingNumber,
      trackingUrl: this.trackingUrl ?? null,
    };
  }
}

export class OrderTransitionDto {
  @IsIn(['preparing', 'shipped', 'delivered', 'cancelled'])
  toStatus!: 'preparing' | 'shipped' | 'delivered' | 'cancelled';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TrackingDto)
  tracking?: TrackingDto;
}

export class TrackingRevisionDto extends TrackingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class ReturnItemDto {
  @IsUUID()
  orderItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReturnSubmissionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  orderNumber!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items!: ReturnItemDto[];

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @IsBoolean()
  @IsIn([true])
  unused!: true;

  @IsBoolean()
  @IsIn([true])
  unwashed!: true;

  @IsBoolean()
  @IsIn([true])
  tagsAttached!: true;

  toDomain(): ReturnSubmission {
    return {
      orderNumber: this.orderNumber,
      items: this.items.map((item) => ({ orderItemId: item.orderItemId, quantity: item.quantity })),
      reason: this.reason,
      unused: true,
      unwashed: true,
      tagsAttached: true,
    };
  }
}

export class DecisionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;
}

export class OrdersQueryDto {
  @IsOptional()
  @IsIn(['paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'])
  status?: 'paid' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class ReturnsQueryDto {
  @IsOptional()
  @IsIn(['submitted', 'approved', 'rejected', 'refund_pending', 'completed'])
  status?: 'submitted' | 'approved' | 'rejected' | 'refund_pending' | 'completed';
}

export class AuditQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  eventType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  entityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class BulkFiltersDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  skuIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(['draft', 'published', 'archived'], { each: true })
  statuses?: ('draft' | 'published' | 'archived')[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  sizes?: string[];

  toDomain(): BulkFilters {
    return {
      skuIds: this.skuIds ?? [],
      productIds: this.productIds ?? [],
      categoryIds: this.categoryIds ?? [],
      statuses: this.statuses ?? [],
      sizes: this.sizes ?? [],
    };
  }
}

export class PriceAdjustmentDto {
  @IsIn(['fixed_amount', 'percentage_increase', 'percentage_decrease'])
  type!: 'fixed_amount' | 'percentage_increase' | 'percentage_decrease';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  value!: number;
}

export class PriceBulkPreviewDto {
  @ValidateNested()
  @Type(() => BulkFiltersDto)
  filters!: BulkFiltersDto;

  @ValidateNested()
  @Type(() => PriceAdjustmentDto)
  adjustment!: PriceAdjustmentDto;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class InventoryBulkPreviewDto {
  @ValidateNested()
  @Type(() => BulkFiltersDto)
  filters!: BulkFiltersDto;

  @IsIn(['production', 'manual_correction', 'damaged_goods'])
  action!: 'production' | 'manual_correction' | 'damaged_goods';

  @Type(() => Number)
  @IsInt()
  quantity!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
