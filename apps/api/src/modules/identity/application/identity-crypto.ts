import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

export function randomOtp(): string {
  const value = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return value.toString().padStart(6, '0');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashMatches(value: string, expectedHash: string): boolean {
  const actual = Buffer.from(sha256(value), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function privacyHash(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function createOtpVerifier(code: string, salt: string, pepper: string): string {
  return scryptSync(`${code}:${pepper}`, Buffer.from(salt, 'hex'), 64).toString('hex');
}

export function otpMatches(
  code: string,
  salt: string,
  pepper: string,
  expectedVerifier: string,
): boolean {
  const actual = Buffer.from(createOtpVerifier(code, salt, pepper), 'hex');
  const expected = Buffer.from(expectedVerifier, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
