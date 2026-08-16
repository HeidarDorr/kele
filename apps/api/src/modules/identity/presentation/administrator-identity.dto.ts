import { IsUUID, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeIranianMobile } from '@kele/design-system/mobile';

export class AdministratorOtpChallengeDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeIranianMobile(value) : value,
  )
  @Matches(/^\+989[0-9]{9}$/)
  mobile!: string;
}

export class AdministratorOtpVerificationDto {
  @IsUUID()
  challengeId!: string;

  @Matches(/^[0-9]{6}$/)
  code!: string;
}
