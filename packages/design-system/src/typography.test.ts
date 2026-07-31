import { describe, expect, it } from 'vitest';
import { resolveTypographyVariant } from './typography.js';

describe('provisional typography variants', () => {
  it('keeps Elize as the safe default', () => {
    expect(resolveTypographyVariant(undefined)).toBe('elize');
    expect(resolveTypographyVariant('unknown')).toBe('elize');
  });

  it('selects the Markazi display variant explicitly', () => {
    expect(resolveTypographyVariant('markazi')).toBe('markazi');
  });
});
