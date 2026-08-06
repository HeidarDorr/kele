import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductCard } from '../../../components/product-card';
import { PurchaseControls } from '../../../components/purchase-controls';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getProduct, getProducts } from '../../../lib/catalog-api';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: { absolute: product.seo.title ?? `${product.name} | KELE` },
      description: product.seo.description ?? product.description,
      alternates: { canonical: `/products/${slug}` },
      openGraph: {
        title: product.seo.title ?? product.name,
        description: product.seo.description ?? product.description,
        type: 'website',
        images: [
          {
            url: product.selectedVariant.featuredMedia.url,
            width: product.selectedVariant.featuredMedia.width,
            height: product.selectedVariant.featuredMedia.height,
            alt: product.selectedVariant.featuredMedia.alt,
          },
        ],
      },
    };
  } catch {
    return { title: 'محصول' };
  }
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const categories = await getCategories().catch(() => ({ items: [] }));
  let product;
  try {
    product = await getProduct(slug, query.color);
  } catch (error: unknown) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
    throw error;
  }
  const selected =
    product.variants.find((variant) => variant.id === product.selectedVariant.id) ??
    product.variants[0];
  if (!selected) notFound();
  const relatedProducts = (
    await getProducts({
      ...(product.categories[0] ? { category: product.categories[0].slug } : {}),
      limit: 6,
    }).catch(() => ({ items: [] }))
  ).items
    .filter((item) => item.productId !== product.productId)
    .slice(0, 4);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: selected.gallery.map((media) => media.url),
    sku: selected.skus[0]?.code,
    color: selected.name,
    offers: selected.skus.map((sku) => ({
      '@type': 'Offer',
      priceCurrency: 'IRR',
      price: sku.price.amountRial,
      availability: sku.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      sku: sku.code,
    })),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'خانه', item: '/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.categories[0]?.name ?? 'کاتالوگ',
        item: product.categories[0] ? `/category/${product.categories[0].slug}` : '/catalog',
      },
      { '@type': 'ListItem', position: 3, name: product.name },
    ],
  };

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell product-page">
        <nav className="breadcrumbs" aria-label="مسیر صفحه">
          <Link href="/">خانه</Link>
          <span aria-hidden="true">/</span>
          {product.categories[0] ? (
            <Link href={`/category/${product.categories[0].slug}`}>
              {product.categories[0].name}
            </Link>
          ) : (
            <Link href="/catalog">کاتالوگ</Link>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{product.name}</span>
        </nav>
        <div className="product-detail-grid">
          <ProductGallery media={selected.gallery} />
          <section className="purchase-panel" aria-labelledby="product-title">
            <p className="product-label">منتخب تازه</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-price">{product.price.display}</p>
            <p className="product-description">{product.description}</p>

            <div className="option-group">
              <h2>رنگ</h2>
              <div className="color-options">
                {product.availableColors.map((color) => (
                  <Link
                    key={color.variantId}
                    href={`/products/${product.slug}?color=${color.variantId}`}
                    aria-current={
                      color.variantId === product.selectedVariant.id ? 'true' : undefined
                    }
                    className={color.available ? 'color-option' : 'color-option unavailable'}
                  >
                    <span style={{ backgroundColor: color.hex ?? 'transparent' }} />
                    <span>{color.name}</span>
                    {!color.available ? <small>ناموجود</small> : null}
                  </Link>
                ))}
              </div>
            </div>

            <PurchaseControls skus={selected.skus} />

            <div className={product.available ? 'stock-note' : 'stock-note unavailable'}>
              {product.available
                ? 'حداقل یک اندازه برای این رنگ موجود است.'
                : 'این رنگ در حال حاضر موجود نیست.'}
            </div>
            <div className="pdp-disclosures">
              <details>
                <summary>ارسال و دریافت</summary>
                <p>
                  روش‌ها و مبالغ قابل انتخاب پس از ثبت نشانی در تسویه از فروشگاه دریافت می‌شوند.
                </p>
              </details>
              <details>
                <summary>راهنمای مرجوعی</summary>
                <p>
                  وضعیت امکان ثبت درخواست پس از تحویل تأییدشده، در جزئیات همان سفارش نمایش داده
                  می‌شود.
                </p>
              </details>
            </div>
          </section>
        </div>

        <section className="product-information" aria-labelledby="details-title">
          <div>
            <h2 id="details-title">دربارهٔ محصول</h2>
            <p>{product.description}</p>
          </div>
          <div>
            <h2>جزئیات</h2>
            <ul>
              {product.details?.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>
        </section>
        <section className="product-related" aria-labelledby="related-products-title">
          <header className="editorial-section-heading editorial-heading-split">
            <div>
              <p>ادامهٔ انتخاب</p>
              <h2 id="related-products-title">محصولات مرتبط</h2>
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
              <h3>محصول مرتبطی برای نمایش نیست</h3>
              <p>با بازگشت به کاتالوگ می‌توانید همهٔ انتخاب‌های منتشرشده را ببینید.</p>
            </div>
          )}
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd).replaceAll('<', '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd).replaceAll('<', '\\u003c'),
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
