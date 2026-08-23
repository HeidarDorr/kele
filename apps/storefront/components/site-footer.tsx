import Link from 'next/link';
import { BackToTopButton } from './back-to-top-button';
import { BrandWordmark } from './brand-wordmark';
import type { PublishedSiteSettings } from '../lib/editorial-api';

export function SiteFooter({ settings }: { settings?: PublishedSiteSettings | null }) {
  const configuration = settings?.configuration;
  const defaultStoreLinks = [
    { label: 'همهٔ محصولات', href: '/catalog' },
    { label: 'ست‌ها', href: '/outfits' },
    { label: 'موقعیت‌ها', href: '/occasions' },
    { label: 'ژورنال', href: '/journal' },
  ];
  const supportedStoreRoutes = new Set(defaultStoreLinks.map((item) => item.href));
  const storeLinks = new Map(defaultStoreLinks.map((item) => [item.href, item]));
  for (const item of configuration?.footerNavigation ?? []) {
    if (supportedStoreRoutes.has(item.href)) storeLinks.set(item.href, item);
  }
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <BrandWordmark className="footer-wordmark" alt="KELE" />
          <p>{configuration?.brandTagline ?? 'پوشش کودک با نگاهی آرام به فرم و جزئیات.'}</p>
        </div>
        <nav aria-label="راهنمای فروشگاه">
          <h2>فروشگاه</h2>
          {Array.from(storeLinks.values()).map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="مسیرهای مشتری">
          <h2>حساب مشتری</h2>
          <Link href="/account">پروفایل و نشانی‌ها</Link>
          <Link href="/orders">سفارش‌ها و مرجوعی</Link>
          <Link href="/cart">سبد خرید</Link>
        </nav>
      </div>
      <div className="shell footer-tail">
        <BackToTopButton />
      </div>
    </footer>
  );
}
