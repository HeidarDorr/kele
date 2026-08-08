import { IsUUID, Matches } from 'class-validator';

export class AdministratorOtpChallengeDto {
  @Matches(/^\+98[0-9]{10}$/)
  mobile!: string;
}

export class AdministratorOtpVerificationDto {
  @IsUUID()
  challengeId!: string;

  @Matches(/^[0-9]{6}$/)
  code!: string;
}
