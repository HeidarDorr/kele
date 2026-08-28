import { describe, expect, it } from 'vitest';
import { filterReferenceOptions, normalizeReferenceSearch } from './editorial-reference-search';

describe('editorial reference selection', () => {
  it('normalizes Arabic Persian letter variants for search', () => {
    expect(normalizeReferenceSearch('  كت ی  ')).toBe('کت ی');
  });

  it('searches both the visible name and slug', () => {
    const options = [
      { id: '1', label: 'کت لینن', meta: 'linen-jacket' },
      { id: '2', label: 'ست رسمی', meta: 'formal-outfit' },
    ];

    expect(filterReferenceOptions(options, 'كت')).toEqual([options[0]]);
    expect(filterReferenceOptions(options, 'formal')).toEqual([options[1]]);
  });
});
