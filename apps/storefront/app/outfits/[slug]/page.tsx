import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OutfitPurchaseControls } from '../../../components/outfit-purchase-controls';
import { ProductCard } from '../../../components/product-card';
import { ProductGallery } from '../../../components/product-gallery';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getOutfit, getProducts } from '../../../lib/catalog-api';
import { resolvePageTitle } from '../../../lib/page-metadata';
import { standaloneGalleryItems } from '../../../lib/product-gallery-model';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const outfit = await getOutfit(slug);
    return {
      title: resolvePageTitle(outfit.seo.title, outfit.name),
      description: outfit.seo.description ?? outfit.description,
      alternates: { canonical: `/outfits/${slug}` },
      openGraph: {
        title: outfit.seo.title ?? outfit.name,
        description: outfit.seo.description ?? outfit.description,
        images: [
          {
            url: outfit.featuredMedia.url,
            width: outfit.featuredMedia.width,
            height: outfit.featuredMedia.height,
            alt: outfit.featuredMedia.alt,
          },
        ],
      },
    };
  } catch {
    return { title: 'ست' };
  }
}

export default async function OutfitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getCategories().catch(() => ({ items: [] }));
  let outfit;
  try {
    outfit = await getOutfit(slug);
  } catch (error: unknown) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
    throw error;
  }
  const componentProductIds = new Set(outfit.items.map((item) => item.productId));
  const relatedProducts = (
    await getProducts({
      ...(outfit.categories[0] ? { category: outfit.categories[0].slug } : {}),
      limit: 8,
    }).catch(() => ({ items: [] }))
  ).items
    .filter((item) => !componentProductIds.has(item.productId))
    .slice(0, 4);

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell outfit-detail-page">
        <nav className="breadcrumbs" aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span aria-hidden="true">/</span>
          <Link href="/outfits">ست‌ها</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{outfit.name}</span>
        </nav>

        <section className="outfit-detail-hero" aria-labelledby="outfit-title">
          <ProductGallery items={standaloneGalleryItems(outfit.gallery)} />
          <div className="outfit-detail-copy detail-purchase-panel">
            <header className="detail-purchase-header">
              <p className="product-label">ست کامل</p>
              <h1 id="outfit-title">{outfit.name}</h1>
            </header>
            <OutfitPurchaseControls outfit={outfit} description={outfit.description} />
          </div>
        </section>

        <section className="product-related" aria-labelledby="related-products-title">
          <header className="editorial-section-heading editorial-heading-split">
            <div>
              <p>ادامهٔ انتخاب</p>
              <h2 id="related-products-title">محصولات مشابه</h2>
            </div>
            <Link href="/catalog">مشاهدهٔ کاتالوگ</Link>
          </header>
          {relatedProducts.length > 0 ? (
            <div className="product-grid">
              {relatedProducts.map((item) => (
                <ProductCard key={`${item.productId}-${item.selectedVariant.id}`} product={item} />
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <h3>محصول مشابهی برای نمایش نیست</h3>
              <p>با بازگشت به کاتالوگ می‌توانید همهٔ انتخاب‌های منتشرشده را ببینید.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
