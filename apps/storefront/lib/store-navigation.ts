export type NavigationItem = Readonly<{ label: string; href: string }>;

export const productNavigation: readonly NavigationItem[] = [
  { label: 'ست', href: '/outfits' },
  { label: 'کت', href: '/category/jackets' },
  { label: 'شلوار', href: '/category/trousers' },
  { label: 'پیراهن', href: '/category/shirts' },
  { label: 'تیشرت', href: '/category/t-shirts' },
  { label: 'وست', href: '/category/vests' },
  { label: 'شلوارک', href: '/category/shorts' },
  { label: 'کفش', href: '/category/shoes' },
] as const;

export function storefrontNavigation(source?: readonly NavigationItem[]): NavigationItem[] {
  const fallback = [
    { label: 'موقعیت‌ها', href: '/occasions' },
    { label: 'ژورنال', href: '/journal' },
  ];
  const secondary = (source ?? fallback).filter(
    (item) => item.href !== '/catalog' && item.href !== '/outfits',
  );
  return [{ label: 'محصولات', href: '/catalog' }, ...secondary];
}

export function navigationItemIsActive(pathname: string, href: string): boolean {
  if (href === '/catalog') {
    return (
      pathname === '/catalog' ||
      pathname.startsWith('/category/') ||
      pathname.startsWith('/products/') ||
      pathname === '/outfits' ||
      pathname.startsWith('/outfits/')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
