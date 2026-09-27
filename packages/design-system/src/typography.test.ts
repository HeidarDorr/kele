import { describe, expect, it } from 'vitest';
import { resolveTypographyVariant } from './typography.js';

describe('provisional typography variants', () => {
  it('defaults to Estedad headings and Vazirmatn text', () => {
    expect(resolveTypographyVariant(undefined)).toBe('estedad-vazirmatn');
    expect(resolveTypographyVariant('unknown')).toBe('estedad-vazirmatn');
    expect(resolveTypographyVariant('estedad-vazirmatn')).toBe('estedad-vazirmatn');
  });

  it('selects the Markazi display variant explicitly', () => {
    expect(resolveTypographyVariant('markazi')).toBe('markazi');
  });

  it('retains Elize as an explicit rollback choice', () => {
    expect(resolveTypographyVariant('elize')).toBe('elize');
  });
});
