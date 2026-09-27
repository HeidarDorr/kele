import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { OutfitCard } from '../../components/outfit-card';
import { ProductCard } from '../../components/product-card';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import {
  getCategories,
  getOutfits,
  getProducts,
  type OutfitCardValue,
  type ProductCardValue,
} from '../../lib/catalog-api';
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
  focus?: 'search';
}>;

type CatalogEntry =
  | Readonly<{ kind: 'outfit'; value: OutfitCardValue; priceRial: number }>
  | Readonly<{ kind: 'product'; value: ProductCardValue; priceRial: number }>;

function normalizedSearch(value: string): string {
  return value.trim().toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک');
}

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
  const [productResult, outfitResult] = forcedError
    ? ([null, null] as const)
    : await Promise.all([
        getProducts({
          ...(parameters.q ? { search: parameters.q } : {}),
          ...(parameters.sort ? { sort: parameters.sort } : {}),
          limit: state === 'empty' ? 1 : 24,
        }).catch(() => null),
        getOutfits().catch(() => null),
      ]);
  const query = parameters.q ? normalizedSearch(parameters.q) : '';
  const products = state === 'empty' ? [] : (productResult?.items ?? []);
  const outfits =
    state === 'empty'
      ? []
      : (outfitResult?.items ?? []).filter(
          (outfit) => query.length === 0 || normalizedSearch(outfit.name).includes(query),
        );
  const catalogUnavailable = productResult === null && outfitResult === null;
  const catalogPartiallyAvailable = (productResult === null) !== (outfitResult === null);
  const entries: CatalogEntry[] = [
    ...outfits.map((outfit) => ({
      kind: 'outfit' as const,
      value: outfit,
      priceRial: outfit.startingPrice.amountRial,
    })),
    ...products.map((product) => ({
      kind: 'product' as const,
      value: product,
      priceRial: product.price.amountRial,
    })),
  ];
  if (parameters.sort === 'price_asc' || parameters.sort === 'price_desc') {
    const direction = parameters.sort === 'price_asc' ? 1 : -1;
    entries.sort((left, right) => (left.priceRial - right.priceRial) * direction);
  }

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell catalog-page">
        <header className="catalog-heading">
          <p className="eyebrow">فروشگاه KELE</p>
          <h1>محصولات</h1>
          <p>محصولات و ست‌های منتشرشده را جست‌وجو کنید یا بر اساس گروه محصول پیش بروید.</p>
        </header>
        <nav className="product-category-index" aria-label="گروه‌های محصولات">
          {productNavigation.map((item) => (
            <Link className="product-category-card" href={item.href} key={item.href}>
              <Image
                src={item.bannerSrc}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 639px) calc(100vw - 2rem), 50vw"
              />
              <span className="product-category-card-copy">
                <small>گروه محصول</small>
                <strong>{item.label}</strong>
                <span>مشاهده</span>
              </span>
            </Link>
          ))}
        </nav>
        <form id="catalog-search" className="catalog-tools" role="search">
          <div>
            <label htmlFor="catalog-query">جست‌وجو</label>
            <input
              id="catalog-query"
              name="q"
              type="search"
              autoFocus={parameters.focus === 'search'}
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

        {catalogUnavailable ? (
          <section className="state-panel state-error" role="alert">
            <h2>دریافت کاتالوگ ممکن نشد</h2>
            <p>اتصال را بررسی کنید و دوباره تلاش کنید. اطلاعات واردشده حفظ شده است.</p>
            <a className="button-secondary" href="/catalog">
              تلاش دوباره
            </a>
          </section>
        ) : entries.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <h2>نتیجه‌ای پیدا نشد</h2>
            <p>عبارت کوتاه‌تری وارد کنید یا همهٔ محصولات را ببینید.</p>
            <a className="button-secondary" href="/catalog">
              پاک‌کردن جست‌وجو
            </a>
          </section>
        ) : (
          <>
            {catalogPartiallyAvailable ? (
              <p className="catalog-partial-notice" role="status">
                بخشی از کاتالوگ اکنون در دسترس نیست؛ نتایج موجود نمایش داده شده‌اند.
              </p>
            ) : null}
            <p className="result-count" aria-live="polite">
              {entries.length.toLocaleString('fa-IR')} نتیجه
            </p>
            <div className="product-grid">
              {entries.map((entry) =>
                entry.kind === 'outfit' ? (
                  <OutfitCard key={`outfit-${entry.value.revisionId}`} outfit={entry.value} />
                ) : (
                  <ProductCard
                    key={`product-${entry.value.productId}-${entry.value.selectedVariant.id}`}
                    product={entry.value}
                  />
                ),
              )}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
