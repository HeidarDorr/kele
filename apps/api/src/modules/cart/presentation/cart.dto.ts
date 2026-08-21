import { ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationError } from '../../../shared/application-error.js';

class ProductCartSelectionItemDto {
  @IsUUID()
  skuId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}

export class ProductCartSelectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductCartSelectionItemDto)
  items!: ProductCartSelectionItemDto[];

  toDomain(): ReadonlyArray<{ skuId: string; quantity: number }> {
    const skuIds = this.items.map((item) => item.skuId);
    if (new Set(skuIds).size !== skuIds.length) {
      throw new ApplicationError(
        'validation',
        'CART_PRODUCT_SELECTION_DUPLICATE_SKU',
        'A product selection must contain each product option at most once.',
      );
    }
    return this.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity }));
  }
}
