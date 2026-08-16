import { describe, expect, it } from 'vitest';
import { activeAdminSection } from './admin-navigation-state';

describe('admin navigation active state', () => {
  it.each([
    ['/', 'products'],
    ['/products/new', 'product-new'],
    ['/products/product-id/edit', 'products'],
    ['/outfits/new', 'outfit-new'],
    ['/outfits/outfit-id/edit', 'outfits'],
    ['/editorial/media', 'media'],
    ['/editorial/homepage/preview', 'homepage'],
    ['/operations/orders/KELE-1', 'orders'],
  ])('maps %s to %s', (pathname, section) => {
    expect(activeAdminSection(pathname)).toBe(section);
  });
});
