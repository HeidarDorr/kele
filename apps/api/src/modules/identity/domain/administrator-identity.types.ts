export type AdministratorRoleValue = 'super_admin' | 'inventory_admin' | 'instagram_admin';

export type AdministratorValue = Readonly<{
  id: string;
  displayName: string;
  role: AdministratorRoleValue;
  enabled: boolean;
  version: number;
}>;

export type AdministratorChallengeValue = Readonly<{
  id: string;
  administrator: AdministratorValue | null;
  codeSalt: string;
  codeVerifier: string;
  failedAttempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
}>;

export type AdministratorSessionValue = Readonly<{
  id: string;
  administrator: AdministratorValue;
  csrfHash: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}>;
