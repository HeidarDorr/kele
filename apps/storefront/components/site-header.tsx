import Link from 'next/link';
import type { Category } from '../lib/catalog-api';
import { BrandWordmark } from './brand-wordmark';
import { HeaderCommerceActions } from './header-commerce-actions';

export function SiteHeader({ categories }: { categories: Category[] }) {
  return (
    <>
      <a className="skip-link" href="#main-content">
        رفتن به محتوای اصلی
      </a>
      <header className="site-header">
        <div className="announcement">فروشگاه KELE</div>
        <div className="shell header-row">
          <details className="mobile-menu">
            <summary aria-label="باز کردن فهرست">فهرست</summary>
            <nav aria-label="فهرست موبایل">
              <Link href="/catalog">محصولات</Link>
              <Link href="/outfits">استایل‌ها</Link>
              {categories.map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  {category.name}
                </Link>
              ))}
            </nav>
          </details>
          <nav className="desktop-nav" aria-label="فهرست اصلی">
            <Link href="/catalog">تازه‌ها</Link>
            <Link href="/outfits">استایل‌ها</Link>
            {categories.slice(0, 3).map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                {category.name}
              </Link>
            ))}
          </nav>
          <Link className="wordmark" href="/">
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
