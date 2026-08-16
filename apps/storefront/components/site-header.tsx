import Link from 'next/link';
import type { Category } from '../lib/catalog-api';
import type { PublishedSiteSettings } from '../lib/editorial-api';
import { BrandWordmark } from './brand-wordmark';
import { DesktopNavigation } from './desktop-navigation';
import { HeaderCommerceActions } from './header-commerce-actions';
import { MobileNavigation } from './mobile-navigation';
import { storefrontNavigation } from '../lib/store-navigation';

export function SiteHeader({
  categories: _categories,
  settings,
}: {
  categories: Category[];
  settings?: PublishedSiteSettings | null;
}) {
  void _categories;
  const navigation = storefrontNavigation(settings?.configuration.primaryNavigation);
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
          <MobileNavigation navigation={navigation} />
          <DesktopNavigation navigation={navigation} />
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
