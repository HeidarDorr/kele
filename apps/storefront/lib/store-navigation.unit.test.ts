import { describe, expect, it } from 'vitest';
import {
  navigationItemIsActive,
  productNavigation,
  storefrontNavigation,
} from './store-navigation';

describe('storefront product navigation', () => {
  it('exposes the approved product groups in their fixed order', () => {
    expect(productNavigation).toEqual([
      { label: 'ست', href: '/outfits' },
      { label: 'کت', href: '/category/jackets' },
      { label: 'شلوار', href: '/category/trousers' },
      { label: 'پیراهن', href: '/category/shirts' },
      { label: 'تیشرت', href: '/category/t-shirts' },
      { label: 'وست', href: '/category/vests' },
      { label: 'شلوارک', href: '/category/shorts' },
      { label: 'کفش', href: '/category/shoes' },
    ]);
  });

  it('replaces legacy catalog and outfit entries with one Products entry', () => {
    expect(
      storefrontNavigation([
        { label: 'فروشگاه قدیمی', href: '/catalog' },
        { label: 'ست‌ها', href: '/outfits' },
        { label: 'ژورنال', href: '/journal' },
      ]),
    ).toEqual([
      { label: 'محصولات', href: '/catalog' },
      { label: 'ژورنال', href: '/journal' },
    ]);
  });

  it.each(['/catalog', '/category/jackets', '/products/linen-shirt', '/outfits', '/outfits/day'])(
    'marks Products active for %s',
    (pathname) => {
      expect(navigationItemIsActive(pathname, '/catalog')).toBe(true);
    },
  );
});
