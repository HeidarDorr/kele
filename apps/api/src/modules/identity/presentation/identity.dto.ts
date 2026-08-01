import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationError } from '../../../shared/application-error.js';
import type { AddressInput } from '../domain/identity.types.js';
import type { CartLineInput } from '../../cart/domain/cart.types.js';

export class OtpChallengeDto {
  @Matches(/^\+98[0-9]{10}$/)
  mobile!: string;
}

export class OtpVerificationDto {
  @IsUUID()
  challengeId!: string;

  @Matches(/^[0-9]{4,8}$/)
  code!: string;
}

export class ProfileUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;
}

export class AddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  recipientName!: string;

  @Matches(/^\+98[0-9]{10}$/)
  recipientMobile!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  province!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(500)
  addressLine!: string;

  @Matches(/^[0-9]{10}$/)
  postalCode!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  toDomain(): AddressInput {
    return {
      recipientName: this.recipientName,
      recipientMobile: this.recipientMobile,
      province: this.province,
      city: this.city,
      addressLine: this.addressLine,
      postalCode: this.postalCode,
      isDefault: this.isDefault ?? false,
    };
  }
}

export class CartLineDto {
  @IsIn(['product', 'outfit'])
  kind!: 'product' | 'outfit';

  @ValidateIf((value: CartLineDto) => value.kind === 'product')
  @IsUUID()
  skuId?: string;

  @ValidateIf((value: CartLineDto) => value.kind === 'outfit')
  @IsUUID()
  outfitRevisionId?: string;

  @ValidateIf((value: CartLineDto) => value.kind === 'outfit')
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  size?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;

  toDomain(): CartLineInput {
    if (this.kind === 'product' && this.skuId !== undefined) {
      return { kind: 'product', skuId: this.skuId, quantity: this.quantity };
    }
    if (this.kind === 'outfit' && this.outfitRevisionId !== undefined && this.size !== undefined) {
      return {
        kind: 'outfit',
        outfitRevisionId: this.outfitRevisionId,
        size: this.size,
        quantity: this.quantity,
      };
    }
    throw new ApplicationError(
      'validation',
      'CART_LINE_SELECTION_INVALID',
      'Cart line selection is incomplete.',
    );
  }
}

export class CartQuantityDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}
