import Image from 'next/image';
import Link from 'next/link';
import { getCategories, getProducts } from '../lib/catalog-api';
import { ProductCard } from '../components/product-card';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [categoryResult, productResult] = await Promise.allSettled([
    getCategories(),
    getProducts({ limit: 4 }),
  ]);
  const categories = categoryResult.status === 'fulfilled' ? categoryResult.value.items : [];
  const products = productResult.status === 'fulfilled' ? productResult.value.items : [];
  const heroProduct = products[0];

  return (
    <>
      <SiteHeader categories={categories} />
      <main id="main-content">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">انتخاب تازه</p>
            <h1 id="hero-title">پوششی سنجیده برای لحظه‌های ماندگار</h1>
            <p>فرم آرام، بافت طبیعی و جزئیاتی که برای یک حضور رسمی کنار هم نشسته‌اند.</p>
            <div className="hero-actions">
              <Link className="button-primary" href="/catalog">
                مشاهدهٔ مجموعه
              </Link>
              {categories[0] ? (
                <Link className="text-link" href={`/category/${categories[0].slug}`}>
                  ورود به دستهٔ {categories[0].name}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="hero-media">
            <Image
              src={
                heroProduct?.selectedVariant.featuredMedia.url ??
                '/media/catalog/linen-suit-front.webp'
              }
              alt={heroProduct?.selectedVariant.featuredMedia.alt ?? 'کت‌وشلوار لینن بژ بچگانه'}
              fill
              priority
              sizes="(max-width: 767px) 100vw, 55vw"
              style={{
                objectPosition: heroProduct
                  ? `${String(heroProduct.selectedVariant.featuredMedia.focalPoint.x * 100)}% ${String(heroProduct.selectedVariant.featuredMedia.focalPoint.y * 100)}%`
                  : '50% 48%',
              }}
            />
          </div>
        </section>

        <section className="values-strip" aria-label="ویژگی‌های تجربهٔ KELE">
          <div className="shell values-grid">
            <p>
              <strong>تصویر دقیق</strong>
              هر رنگ با گالری مستقل خود
            </p>
            <p>
              <strong>قیمت روشن</strong>
              نمایش یکپارچه و خوانای تومان
            </p>
            <p>
              <strong>موجودی واقعی</strong>
              وضعیت هر اندازه از منبع SKU
            </p>
            <p>
              <strong>انتخاب آرام</strong>
              بدون شلوغی و پیشنهادهای نامرتبط
            </p>
          </div>
        </section>

        <section className="shell discovery-section" aria-labelledby="category-title">
          <h2 id="category-title">کشف بر اساس دسته</h2>
          {categories.length > 0 ? (
            <div className="category-links">
              {categories.map((category) => (
                <Link key={category.id} href={`/category/${category.slug}`}>
                  <span>{category.name}</span>
                  <small>{category.description}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <h3>هنوز دسته‌ای منتشر نشده است</h3>
              <p>پس از انتشار نخستین دسته، مسیرهای کشف در این بخش ظاهر می‌شوند.</p>
            </div>
          )}
        </section>

        <section className="shell product-section" aria-labelledby="new-products-title">
          <div className="section-heading">
            <h2 id="new-products-title">تازه‌های کاتالوگ</h2>
            <Link className="text-link" href="/catalog">
              مشاهدهٔ همه
            </Link>
          </div>
          {products.length > 0 ? (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={`${product.productId}-${product.selectedVariant.id}`}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="state-panel">
              <h3>محصول منتشرشده‌ای پیدا نشد</h3>
              <p>محصول پس از گذر از اعتبارسنجی انتشار در این بخش دیده می‌شود.</p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
