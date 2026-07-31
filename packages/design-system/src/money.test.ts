import { describe, expect, it } from 'vitest';
import { formatIrrAsToman, irrToToman } from './money.js';

describe('IRR to toman presentation contract', () => {
  it('[PRC-011][PRC-012][HRD-002] converts exactly through one formatter', () => {
    expect(irrToToman(39_800_000)).toBe(3_980_000);
    expect(formatIrrAsToman(39_800_000)).toBe('۳٬۹۸۰٬۰۰۰ تومان');
    expect(formatIrrAsToman(11)).toBe('۱٫۱ تومان');
  });

  it('rejects negative, fractional, and unsafe IRR values', () => {
    expect(() => irrToToman(-10)).toThrow(RangeError);
    expect(() => irrToToman(10.5)).toThrow(RangeError);
    expect(() => irrToToman(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
