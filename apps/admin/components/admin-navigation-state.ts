export const adminNavigationLinks = [
  { label: 'محصولات', href: '/', section: 'products' },
  { label: 'محصول تازه', href: '/products/new', section: 'product-new' },
  { label: 'ست‌ها', href: '/outfits', section: 'outfits' },
  { label: 'ست تازه', href: '/outfits/new', section: 'outfit-new' },
  { label: 'تحریریه', href: '/editorial', section: 'editorial' },
  { label: 'صفحهٔ اصلی', href: '/editorial/homepage', section: 'homepage' },
  { label: 'ژورنال', href: '/editorial/journal', section: 'journal' },
  { label: 'کشف موقعیتی', href: '/editorial/discovery', section: 'discovery' },
  { label: 'تنظیمات سایت', href: '/editorial/settings', section: 'settings' },
  { label: 'رسانه‌ها', href: '/editorial/media', section: 'media' },
  { label: 'سفارش‌ها', href: '/operations/orders', section: 'orders' },
  { label: 'مرجوعی‌ها', href: '/operations/returns', section: 'returns' },
  { label: 'عملیات گروهی', href: '/operations/bulk', section: 'bulk' },
  { label: 'رویدادها', href: '/operations/audit', section: 'audit' },
] as const;

export function activeAdminSection(pathname: string): string {
  if (pathname === '/products/new') return 'product-new';
  if (pathname.startsWith('/products/')) return 'products';
  if (pathname === '/outfits/new') return 'outfit-new';
  if (pathname.startsWith('/outfits/')) return 'outfits';
  if (pathname === '/') return 'products';
  const match = adminNavigationLinks
    .filter((item) => item.href !== '/' && pathname.startsWith(item.href))
    .sort((left, right) => right.href.length - left.href.length)[0];
  return match?.section ?? '';
}
