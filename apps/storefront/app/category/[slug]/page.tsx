import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '../../../components/product-card';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getCategory } from '../../../lib/catalog-api';

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
  const { slug } = await params;
  const categories = await getCategories().catch(() => ({ items: [] }));
  let category;
  try {
    category = await getCategory(slug, { limit: 24 });
  } catch (error: unknown) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell category-page">
        <nav className="breadcrumbs" aria-label="مسیر صفحه">
          <a href="/">خانه</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{category.name}</span>
        </nav>
        <header className="category-heading">
          <h1>{category.name}</h1>
          {category.description ? <p>{category.description}</p> : null}
        </header>
        {category.products.items.length > 0 ? (
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
            <p>محصولات پس از انتشار و تکمیل تنوع رنگ و SKU در اینجا دیده می‌شوند.</p>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
