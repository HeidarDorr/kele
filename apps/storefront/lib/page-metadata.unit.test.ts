import { describe, expect, it } from 'vitest';
import { resolvePageTitle, resolveSiteTitle } from './page-metadata';

describe('resolvePageTitle', () => {
  it('uses absolute title when CMS SEO title is provided', () => {
    expect(resolvePageTitle('ست مخمل شب | KELE', 'ست مخمل شب')).toEqual({
      absolute: 'ست مخمل شب | KELE',
    });
  });

  it('returns fallback for layout template when SEO title is empty', () => {
    expect(resolvePageTitle(null, 'ست مخمل شب')).toBe('ست مخمل شب');
    expect(resolvePageTitle('   ', 'ست مخمل شب')).toBe('ست مخمل شب');
  });
});

describe('resolveSiteTitle', () => {
  it('uses absolute title for configured homepage SEO title', () => {
    expect(resolveSiteTitle('KELE | پوشش کودک')).toEqual({
      absolute: 'KELE | پوشش کودک',
    });
  });

  it('returns undefined so the root default title is used', () => {
    expect(resolveSiteTitle(null)).toBeUndefined();
    expect(resolveSiteTitle('   ')).toBeUndefined();
  });
});
