import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '../../../components/product-card';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getCategory } from '../../../lib/catalog-api';
import { getAcceptancePresentationState } from '../../../lib/acceptance-presentation-state.server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await getCategory(slug, { limit: 1 });
    return {
      title: category.seo.title ?? category.name,
      description: category.seo.description ?? category.description ?? undefined,
      alternates: { canonical: `/category/${slug}` },
      openGraph: {
        title: category.seo.title ?? category.name,
        description: category.seo.description ?? category.description ?? undefined,
        type: 'website',
      },
    };
  } catch {
    return { title: 'دسته‌بندی' };
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, state] = await Promise.all([
    params,
    getAcceptancePresentationState(['loading', 'empty', 'error'] as const),
  ]);
  const categories = await getCategories().catch(() => ({ items: [] }));
  if (state === 'loading') {
    return (
      <>
        <SiteHeader categories={categories.items} />
        <main id="main-content" className="shell category-page" aria-busy="true">
          <header className="category-heading">
            <p className="eyebrow">دسته‌بندی</p>
            <h1>در حال دریافت محصولات</h1>
          </header>
          <div className="product-grid" aria-hidden="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="skeleton-product" key={index}>
                <div className="skeleton skeleton-product-media" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line short" />
              </div>
            ))}
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }
  let category = null;
  try {
    category = state === 'error' ? null : await getCategory(slug, { limit: 24 });
  } catch (error: unknown) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
  }

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell category-page">
        {category ? (
          <nav className="breadcrumbs" aria-label="مسیر صفحه">
            <a href="/">خانه</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category.name}</span>
          </nav>
        ) : null}
        <header className="category-heading">
          <h1>{category?.name ?? 'دسته‌بندی'}</h1>
          {category?.description ? <p>{category.description}</p> : null}
        </header>
        {!category ? (
          <section className="state-panel state-error" role="alert">
            <h2>دریافت این دسته ممکن نشد</h2>
            <p>اتصال را بررسی کنید یا به کاتالوگ بازگردید.</p>
            <a className="button-secondary" href="/catalog">
              رفتن به کاتالوگ
            </a>
          </section>
        ) : state !== 'empty' && category.products.items.length > 0 ? (
          <div className="product-grid">
            {category.products.items.map((product) => (
              <ProductCard
                key={`${product.productId}-${product.selectedVariant.id}`}
                product={product}
              />
            ))}
          </div>
        ) : (
          <section className="state-panel">
            <h2>این دسته هنوز محصولی ندارد</h2>
            <p>محصولات پس از انتشار و تکمیل رنگ‌ها و اندازه‌ها در اینجا دیده می‌شوند.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
