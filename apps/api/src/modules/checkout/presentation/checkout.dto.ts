import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  FakePaymentCallbackPayload,
  ShippingMethodCodeValue,
} from '../domain/checkout.types.js';

export class CheckoutSessionDto {
  @IsUUID()
  cartId!: string;

  @IsUUID()
  addressId!: string;

  @IsIn(['iran_post', 'tipax', 'tehran_local_courier'])
  deliveryMethod!: ShippingMethodCodeValue;
}

export class FakePaymentCompletionDto {
  @IsIn(['success', 'failed', 'cancelled', 'pending', 'tampered_amount'])
  outcome!: 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount';
}

export class FakePaymentCallbackDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  providerReference!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  providerTransactionId!: string;

  @IsIn(['success', 'failed', 'cancelled', 'pending'])
  status!: 'success' | 'failed' | 'cancelled' | 'pending';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountRial!: number;

  @IsIn(['IRR'])
  currency!: 'IRR';

  @IsISO8601({ strict: true })
  issuedAt!: string;

  @IsString()
  @MinLength(16)
  @MaxLength(120)
  nonce!: string;

  toDomain(): FakePaymentCallbackPayload {
    return {
      providerReference: this.providerReference,
      providerTransactionId: this.providerTransactionId,
      status: this.status,
      amountRial: this.amountRial,
      currency: this.currency,
      issuedAt: this.issuedAt,
      nonce: this.nonce,
    };
  }
}

export class ShippingMethodSettingDto {
  @IsIn(['iran_post', 'tipax', 'tehran_local_courier'])
  code!: ShippingMethodCodeValue;

  @IsBoolean()
  enabled!: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  fixedPriceRial!: number;
}

export class ShippingSettingsDto {
  @IsIn(['order_subtotal'])
  eligibilityBasis!: 'order_subtotal';

  @ValidateNested({ each: true })
  @Type(() => ShippingMethodSettingDto)
  methods!: ShippingMethodSettingDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeShippingThresholdRial?: number | null;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
