export type CustomerValue = Readonly<{
  id: string;
  mobile: string;
  firstName: string | null;
  lastName: string | null;
}>;

export type OtpChallengeValue = Readonly<{
  id: string;
  mobile: string;
  codeSalt: string;
  codeVerifier: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export type CustomerSessionValue = Readonly<{
  id: string;
  customer: CustomerValue;
  csrfHash: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}>;

export type AddressInput = Readonly<{
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}>;

export type AddressValue = AddressInput &
  Readonly<{
    id: string;
  }>;
