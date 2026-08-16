import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OutfitPurchaseControls } from '../../../components/outfit-purchase-controls';
import { ProductGallery } from '../../../components/product-gallery';
import { ProductImage } from '../../../components/product-image';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { CatalogApiError, getCategories, getOutfit } from '../../../lib/catalog-api';

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
      title: outfit.seo.title ?? outfit.name,
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
          <ProductGallery media={outfit.gallery} />
          <div className="outfit-detail-copy">
            <p className="product-label">
              ست کامل، ویرایش {outfit.revisionNumber.toLocaleString('fa-IR')}
            </p>
            <h1 id="outfit-title">{outfit.name}</h1>
            <p className="outfit-starting-price">از {outfit.startingPrice.display}</p>
            <p className="product-description">{outfit.description}</p>
            <OutfitPurchaseControls outfit={outfit} />
            <p className="outfit-integrity-note">
              ترکیب انتخاب‌شده ثابت می‌ماند؛ هیچ جزء یا ویرایش دیگری خودکار جایگزین آن نمی‌شود.
            </p>
          </div>
        </section>

        <section className="outfit-composition" aria-labelledby="composition-title">
          <div className="outfit-composition-intro">
            <p>ساختار این ست</p>
            <h2 id="composition-title">هر جزء، همچنان یک محصول مستقل</h2>
            <span>رنگ پیش‌فرض و تعداد هر جزء توسط همین ویرایش تثبیت شده است.</span>
          </div>
          <ol>
            {outfit.items.map((item) => (
              <li key={item.id}>
                <Link href={`/products/${item.productSlug}`}>
                  <div className="outfit-component-media">
                    <ProductImage
                      media={item.featuredMedia}
                      sizes="(max-width: 767px) 88vw, 24vw"
                    />
                  </div>
                  <div>
                    <span>
                      {item.quantity.toLocaleString('fa-IR')} عدد، {item.colorName}
                    </span>
                    <h3>{item.name}</h3>
                    <p>مشاهده و خرید مستقل</p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
