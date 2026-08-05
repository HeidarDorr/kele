import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ProductCard } from '../../../components/product-card';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getCategory } from '../../../lib/catalog-api';
import { getSiteSettings } from '../../../lib/editorial-api';

export const dynamic = 'force-dynamic';

async function occasionOrNull(slug: string) {
  try {
    const value = await getCategory(slug, { limit: 24 });
    return value.discoveryKind === 'occasion' ? value : null;
  } catch (error) {
    if (error instanceof CatalogApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const occasion = await occasionOrNull(slug).catch(() => null);
  return occasion
    ? {
        title: { absolute: occasion.seo.title ?? occasion.editorialTitle ?? occasion.name },
        description:
          occasion.seo.description ?? occasion.editorialDescription ?? occasion.description ?? '',
        alternates: { canonical: `/occasion/${occasion.slug}` },
        openGraph: occasion.heroMedia
          ? { images: [{ url: occasion.heroMedia.url, alt: occasion.heroMedia.alt }] }
          : undefined,
      }
    : { title: 'موقعیت پیدا نشد' };
}

export default async function OccasionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: 'unavailable' }>;
}) {
  const [{ slug }, parameters] = await Promise.all([params, searchParams]);
  const [occasion, categoryResult, settingsResult] = await Promise.all([
    occasionOrNull(slug),
    Promise.resolve(getCategories())
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const })),
    Promise.resolve(getSiteSettings())
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const })),
  ]);
  if (!occasion) notFound();
  const categories = categoryResult.ok ? categoryResult.value.items : [];
  const settings = settingsResult.ok ? settingsResult.value : null;
  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      <main id="main-content">
        <header className="occasion-detail-hero">
          {occasion.heroMedia ? (
            <Image
              src={occasion.heroMedia.url}
              alt={occasion.heroMedia.alt}
              fill
              priority
              sizes="100vw"
              style={{
                objectPosition: `${String(occasion.heroMedia.focalPoint.x * 100)}% ${String(occasion.heroMedia.focalPoint.y * 100)}%`,
              }}
            />
          ) : null}
          <div className="occasion-detail-shade" />
          <div className="shell">
            <p>{occasion.name}</p>
            <h1>{occasion.editorialTitle ?? occasion.name}</h1>
            <p>{occasion.editorialDescription ?? occasion.description}</p>
          </div>
        </header>
        <section className="shell occasion-products" aria-labelledby="occasion-products-title">
          <header className="editorial-section-heading">
            <p>انتخاب KELE</p>
            <h2 id="occasion-products-title">پوشش‌های این موقعیت</h2>
          </header>
          {parameters.state !== 'unavailable' && occasion.products.items.length > 0 ? (
            <div className="product-grid">
              {occasion.products.items.map((product) => (
                <ProductCard
                  key={`${product.productId}-${product.selectedVariant.id}`}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <h3>محصولی در این انتخاب موجود نیست</h3>
              <p>محتوای موقعیت منتشر است، اما محصول منتشرشده‌ای به آن متصل نشده است.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
