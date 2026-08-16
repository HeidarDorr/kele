import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductCard } from '../../components/product-card';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories, getProducts } from '../../lib/catalog-api';
import { getAcceptancePresentationState } from '../../lib/acceptance-presentation-state.server';
import CatalogLoading from './loading';
import { productNavigation } from '../../lib/store-navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'محصولات',
  description: 'ست‌ها و محصولات منتشرشدهٔ KELE بر اساس گروه محصول.',
  alternates: { canonical: '/catalog' },
};

type SearchParameters = Promise<{
  q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParameters }) {
  const parameters = await searchParams;
  const state = await getAcceptancePresentationState(['loading', 'empty', 'error'] as const);
  const categories = await getCategories().catch(() => ({ items: [] }));
  if (state === 'loading') {
    return (
      <>
        <SiteHeader categories={categories.items} />
        <CatalogLoading />
        <SiteFooter />
      </>
    );
  }
  const forcedError = state === 'error';
  const result = forcedError
    ? null
    : await getProducts({
        ...(parameters.q ? { search: parameters.q } : {}),
        ...(parameters.sort ? { sort: parameters.sort } : {}),
        limit: state === 'empty' ? 1 : 24,
      }).catch(() => null);
  const products = state === 'empty' ? [] : (result?.items ?? []);

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell catalog-page">
        <header className="catalog-heading">
          <p className="eyebrow">فروشگاه KELE</p>
          <h1>محصولات</h1>
          <p>محصولات منتشرشده را بر اساس نام، رنگ، اندازه یا دسته پیدا کنید.</p>
        </header>
        <nav className="product-category-index" aria-label="گروه‌های محصولات">
          {productNavigation.map((item, index) => (
            <Link href={item.href} key={item.href}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.label}</strong>
            </Link>
          ))}
        </nav>
        <form className="catalog-tools" role="search">
          <div>
            <label htmlFor="catalog-query">جست‌وجو</label>
            <input
              id="catalog-query"
              name="q"
              type="search"
              defaultValue={parameters.q}
              placeholder="برای نمونه: لینن یا بژ"
              maxLength={120}
            />
          </div>
          <div>
            <label htmlFor="catalog-sort">ترتیب نمایش</label>
            <select id="catalog-sort" name="sort" defaultValue={parameters.sort ?? 'newest'}>
              <option value="newest">تازه‌ترین</option>
              <option value="price_asc">قیمت از کم به زیاد</option>
              <option value="price_desc">قیمت از زیاد به کم</option>
            </select>
          </div>
          <button className="button-primary" type="submit">
            اعمال
          </button>
        </form>

        {result === null ? (
          <section className="state-panel state-error" role="alert">
            <h2>دریافت کاتالوگ ممکن نشد</h2>
            <p>اتصال را بررسی کنید و دوباره تلاش کنید. اطلاعات واردشده حفظ شده است.</p>
            <a className="button-secondary" href="/catalog">
              تلاش دوباره
            </a>
          </section>
        ) : products.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <h2>نتیجه‌ای پیدا نشد</h2>
            <p>عبارت کوتاه‌تری وارد کنید یا همهٔ محصولات را ببینید.</p>
            <a className="button-secondary" href="/catalog">
              پاک‌کردن جست‌وجو
            </a>
          </section>
        ) : (
          <>
            <p className="result-count" aria-live="polite">
              {products.length.toLocaleString('fa-IR')} نتیجه
            </p>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={`${product.productId}-${product.selectedVariant.id}`}
                  product={product}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
