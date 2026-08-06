import Link from 'next/link';
import type { Category } from '../lib/catalog-api';
import type { PublishedSiteSettings } from '../lib/editorial-api';
import { BrandWordmark } from './brand-wordmark';
import { HeaderCommerceActions } from './header-commerce-actions';
import { MobileNavigation } from './mobile-navigation';

export function SiteHeader({
  categories,
  settings,
}: {
  categories: Category[];
  settings?: PublishedSiteSettings | null;
}) {
  const navigation = settings?.configuration.primaryNavigation ?? [
    { label: 'تازه‌ها', href: '/catalog' },
    { label: 'استایل‌ها', href: '/outfits' },
    { label: 'موقعیت‌ها', href: '/occasions' },
    { label: 'ژورنال', href: '/journal' },
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        {settings?.configuration.announcement ? (
          <div className="announcement">{settings.configuration.announcement}</div>
        ) : null}
        <div className="shell header-row">
          <MobileNavigation navigation={navigation} categories={categories} />
          <nav className="desktop-nav" aria-label="فهرست اصلی">
            {navigation.map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className="wordmark" href="/" aria-label="صفحهٔ اصلی KELE">
            <span className="visually-hidden">صفحهٔ اصلی</span>
            <BrandWordmark />
          </Link>
          <div className="header-end">
            <form className="header-search" action="/catalog" role="search">
              <label className="visually-hidden" htmlFor="header-search">
                جست‌وجوی کاتالوگ
              </label>
              <input id="header-search" name="q" type="search" placeholder="جستجو در محصولات" />
            </form>
            <HeaderCommerceActions />
          </div>
        </div>
      </header>
    </>
  );
}
