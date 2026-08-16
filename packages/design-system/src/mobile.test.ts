import { describe, expect, it } from 'vitest';
import { isIranianMobile, normalizeIranianMobile } from './mobile.js';

describe('Iranian mobile input normalization', () => {
  it.each([
    ['+989121234567', '+989121234567'],
    ['09121234567', '+989121234567'],
    ['9121234567', '+989121234567'],
    ['۰۹۱۲۱۲۳۴۵۶۷', '+989121234567'],
    ['٩١٢١٢٣٤٥٦٧', '+989121234567'],
    ['0912 123 4567', '+989121234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
    expect(isIranianMobile(input)).toBe(true);
  });

  it.each(['0912123456', '+9891212345678', '08121234567', '8121234567'])('rejects %s', (input) => {
    expect(isIranianMobile(input)).toBe(false);
  });
});
