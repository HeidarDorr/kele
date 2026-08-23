import Link from 'next/link';
import type { Category } from '../lib/catalog-api';
import type { PublishedSiteSettings } from '../lib/editorial-api';
import { BrandWordmark } from './brand-wordmark';
import { DesktopNavigation } from './desktop-navigation';
import { HeaderCommerceActions } from './header-commerce-actions';
import { HeaderSearchLink } from './header-search-link';
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
  const announcement = settings?.configuration.announcement;
  return (
    <>
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <header className={announcement ? 'site-header has-announcement' : 'site-header'}>
        {announcement ? <div className="announcement">{announcement}</div> : null}
        <div className="shell header-row">
          <MobileNavigation navigation={navigation} />
          <DesktopNavigation navigation={navigation} />
          <Link className="wordmark" href="/" aria-label="صفحهٔ اصلی KELE">
            <span className="visually-hidden">صفحهٔ اصلی</span>
            <BrandWordmark priority />
          </Link>
          <div className="header-end">
            <HeaderSearchLink />
            <HeaderCommerceActions />
          </div>
        </div>
      </header>
      <div className="site-header-spacer" aria-hidden="true">
        {announcement ? <div className="announcement">{announcement}</div> : null}
        <div className="site-header-row-spacer" />
      </div>
    </>
  );
}
