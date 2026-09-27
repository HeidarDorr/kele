export type NavigationItem = Readonly<{ label: string; href: string }>;

export type ProductNavigationItem = NavigationItem &
  Readonly<{
    slug: string;
    iconSrc: string;
    bannerSrc: string;
  }>;

export const productNavigation: readonly ProductNavigationItem[] = [
  {
    label: 'ست',
    href: '/outfits',
    slug: 'set',
    iconSrc: '/media/navigation/category-icons/set.webp',
    bannerSrc: '/media/catalog/category-banners/set.webp',
  },
  {
    label: 'کت',
    href: '/category/jackets',
    slug: 'jackets',
    iconSrc: '/media/navigation/category-icons/jackets.webp',
    bannerSrc: '/media/catalog/category-banners/jackets.webp',
  },
  {
    label: 'شلوار',
    href: '/category/trousers',
    slug: 'trousers',
    iconSrc: '/media/navigation/category-icons/trousers.webp',
    bannerSrc: '/media/catalog/category-banners/trousers.webp',
  },
  {
    label: 'پیراهن',
    href: '/category/shirts',
    slug: 'shirts',
    iconSrc: '/media/navigation/category-icons/shirts.webp',
    bannerSrc: '/media/catalog/category-banners/shirts.webp',
  },
  {
    label: 'تیشرت',
    href: '/category/t-shirts',
    slug: 't-shirts',
    iconSrc: '/media/navigation/category-icons/t-shirts.webp',
    bannerSrc: '/media/catalog/category-banners/t-shirts.webp',
  },
  {
    label: 'وست',
    href: '/category/vests',
    slug: 'vests',
    iconSrc: '/media/navigation/category-icons/vests.webp',
    bannerSrc: '/media/catalog/category-banners/vests.webp',
  },
  {
    label: 'شلوارک',
    href: '/category/shorts',
    slug: 'shorts',
    iconSrc: '/media/navigation/category-icons/shorts.webp',
    bannerSrc: '/media/catalog/category-banners/shorts.webp',
  },
  {
    label: 'کفش',
    href: '/category/shoes',
    slug: 'shoes',
    iconSrc: '/media/navigation/category-icons/shoes.webp',
    bannerSrc: '/media/catalog/category-banners/shoes.webp',
  },
] as const;

export const productsMenuPromo = {
  href: '/catalog',
  imageSrc: '/media/navigation/products-promo.webp',
  imageAlt: 'ست کودک با پیراهن و کت کنار گلدان',
  title: 'انتخاب‌های KELE',
  action: 'مشاهدهٔ همهٔ محصولات',
} as const;

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
