import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';
import { getOccasions, getSiteSettings } from '../../lib/editorial-api';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'انتخاب بر اساس موقعیت',
  description: 'پوشش‌های کودک KELE برای مهمانی، مراسم و لحظه‌های به‌یادماندنی.',
  alternates: { canonical: '/occasions' },
};

export default async function OccasionsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: 'loading' | 'empty' | 'error' }>;
}) {
  const [parameters, occasionResult, categoryResult, settingsResult] = await Promise.allSettled([
    searchParams,
    getOccasions(),
    getCategories(),
    getSiteSettings(),
  ]);
  const state = parameters.status === 'fulfilled' ? parameters.value.state : undefined;
  const occasions =
    state === 'empty' || occasionResult.status === 'rejected' ? [] : occasionResult.value.items;
  const categories = categoryResult.status === 'fulfilled' ? categoryResult.value.items : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      <main id="main-content" className="occasion-index shell">
        <header>
          <p>کشف سنجیده</p>
          <h1>برای هر لحظه، انتخابی آرام</h1>
          <p>مجموعه‌هایی که بر اساس حال‌وهوای مراسم و آزادی حرکت کودک کنار هم قرار گرفته‌اند.</p>
        </header>
        {state === 'loading' ? (
          <section className="state-panel editorial-state-loading" role="status" aria-busy="true">
            <h2>در حال دریافت موقعیت‌ها</h2>
            <div className="editorial-loading-line" aria-hidden="true" />
            <p>روایت‌ها و تصاویر منتشرشده در حال آماده‌سازی‌اند.</p>
          </section>
        ) : state === 'error' || occasionResult.status === 'rejected' ? (
          <section className="state-panel" role="alert">
            <h2>موقعیت‌ها در دسترس نیستند</h2>
            <p>فروشگاه همچنان قابل استفاده است.</p>
            <Link href="/catalog" className="text-link">
              رفتن به فروشگاه
            </Link>
          </section>
        ) : occasions.length === 0 ? (
          <section className="state-panel">
            <h2>هنوز موقعیتی منتشر نشده است</h2>
            <p>محتوای پیش‌نویس در این صفحه نمایش داده نمی‌شود.</p>
          </section>
        ) : (
          <div className="occasion-index-list">
            {occasions.map((occasion, index) => (
              <article key={occasion.id}>
                <Link href={`/occasion/${occasion.slug}`}>
                  <span className="occasion-index-number">۰{String(index + 1)}</span>
                  <span className="occasion-index-media">
                    {occasion.heroMedia ? (
                      <Image
                        src={occasion.heroMedia.url}
                        alt={occasion.heroMedia.alt}
                        fill
                        priority={index === 0}
                        sizes="(max-width: 767px) 100vw, 54vw"
                        style={{
                          objectPosition: `${String(occasion.heroMedia.focalPoint.x * 100)}% ${String(occasion.heroMedia.focalPoint.y * 100)}%`,
                        }}
                      />
                    ) : null}
                  </span>
                  <span className="occasion-index-copy">
                    <small>{occasion.name}</small>
                    <h2>{occasion.editorialTitle ?? occasion.name}</h2>
                    <p>{occasion.editorialDescription ?? occasion.description}</p>
                    <span className="text-link">دیدن انتخاب‌ها</span>
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
