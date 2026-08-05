import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getCategories, getProducts } from '../lib/catalog-api';
import {
  getHomepage,
  getJournal,
  getOccasions,
  getSiteSettings,
  type PublishedHomepage,
} from '../lib/editorial-api';
import { ProductCard } from '../components/product-card';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings().catch(() => null);
  return settings
    ? {
        title: settings.configuration.seoDefaults.title ?? settings.configuration.brandName,
        description:
          settings.configuration.seoDefaults.description ?? settings.configuration.brandTagline,
        alternates: { canonical: '/' },
      }
    : {};
}

type Section = PublishedHomepage['sections'][number];

function isMediaSection(section: Section): section is Section & {
  content: {
    title: string;
    subtitle?: string | null;
    mediaId: string;
    ctaLabel?: string | null;
    href?: string | null;
  };
} {
  return 'mediaId' in section.content;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ state?: 'loading' | 'unavailable' }>;
}) {
  const [
    parameters,
    homepageResult,
    categoryResult,
    productResult,
    occasionResult,
    journalResult,
    settingsResult,
  ] = await Promise.allSettled([
    searchParams,
    getHomepage(),
    getCategories(),
    getProducts({ limit: 24 }),
    getOccasions(),
    getJournal(6),
    getSiteSettings(),
  ]);
  const state = parameters.status === 'fulfilled' ? parameters.value.state : undefined;
  const homepage =
    state === 'unavailable' || homepageResult.status === 'rejected' ? null : homepageResult.value;
  const categories = categoryResult.status === 'fulfilled' ? categoryResult.value.items : [];
  const products = productResult.status === 'fulfilled' ? productResult.value.items : [];
  const occasions = occasionResult.status === 'fulfilled' ? occasionResult.value.items : [];
  const journal = journalResult.status === 'fulfilled' ? journalResult.value.items : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const media = new Map(homepage?.media.map((item) => [item.id, item]) ?? []);

  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      <main id="main-content" className="editorial-home">
        {state === 'loading' ? (
          <section
            className="shell editorial-unavailable editorial-loading-state"
            role="status"
            aria-busy="true"
          >
            <p className="eyebrow">صفحهٔ اصلی</p>
            <h1>در حال دریافت روایت تازهٔ KELE</h1>
            <div className="editorial-loading-line" aria-hidden="true" />
            <p>چیدمان منتشرشده و رسانه‌های آن در حال آماده‌سازی‌اند.</p>
          </section>
        ) : !homepage ? (
          <section className="shell editorial-unavailable" role="status">
            <p className="eyebrow">صفحهٔ اصلی</p>
            <h1>روایت تازهٔ KELE در دسترس نیست</h1>
            <p>کاتالوگ همچنان در دسترس است و محتوای منتشرشده با بازیابی ارتباط بازمی‌گردد.</p>
            <Link className="button-primary" href="/catalog">
              رفتن به فروشگاه
            </Link>
          </section>
        ) : (
          homepage.sections.map((section) => {
            if (section.type === 'hero' && isMediaSection(section)) {
              const asset = media.get(section.content.mediaId);
              return (
                <section
                  className="editorial-hero"
                  aria-labelledby={`section-${section.id}`}
                  key={section.id}
                >
                  {asset ? (
                    <Image
                      src={asset.url}
                      alt={asset.alt}
                      fill
                      priority
                      sizes="100vw"
                      style={{
                        objectPosition: `${String(asset.focalPoint.x * 100)}% ${String(asset.focalPoint.y * 100)}%`,
                      }}
                    />
                  ) : null}
                  <div className="editorial-hero-shade" />
                  <div className="shell editorial-hero-copy">
                    <p className="editorial-index">۰۱ / روایت فصل</p>
                    <h1 id={`section-${section.id}`}>{section.content.title}</h1>
                    {section.content.subtitle ? <p>{section.content.subtitle}</p> : null}
                    {section.content.ctaLabel && section.content.href ? (
                      <Link className="editorial-cta" href={section.content.href}>
                        {section.content.ctaLabel}
                        <span aria-hidden="true">←</span>
                      </Link>
                    ) : null}
                  </div>
                  <span className="editorial-scroll" aria-hidden="true">
                    پایین
                  </span>
                </section>
              );
            }

            if (section.type === 'occasion_grid' && 'referenceIds' in section.content) {
              const referenceIds = section.content.referenceIds;
              const items = occasions.filter((item) => referenceIds.includes(item.id));
              return (
                <section
                  className="shell editorial-occasions"
                  aria-labelledby={`section-${section.id}`}
                  key={section.id}
                >
                  <header className="editorial-section-heading">
                    <p>بر اساس لحظه</p>
                    <h2 id={`section-${section.id}`}>{section.content.title}</h2>
                    <Link href="/occasions">همهٔ موقعیت‌ها</Link>
                  </header>
                  {items.length > 0 ? (
                    <div className="occasion-editorial-grid">
                      {items.map((occasion, index) => (
                        <Link
                          className="occasion-editorial-card"
                          href={`/occasion/${occasion.slug}`}
                          key={occasion.id}
                        >
                          {occasion.heroMedia ? (
                            <Image
                              src={occasion.heroMedia.url}
                              alt={occasion.heroMedia.alt}
                              fill
                              priority={index === 0}
                              sizes="(max-width: 767px) 100vw, 52vw"
                              style={{
                                objectPosition: `${String(occasion.heroMedia.focalPoint.x * 100)}% ${String(occasion.heroMedia.focalPoint.y * 100)}%`,
                              }}
                            />
                          ) : null}
                          <span className="occasion-card-number">۰{String(index + 1)}</span>
                          <span className="occasion-card-copy">
                            <strong>{occasion.editorialTitle ?? occasion.name}</strong>
                            <small>{occasion.editorialDescription ?? occasion.description}</small>
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="state-panel">
                      <h3>موقعیتی منتشر نشده است</h3>
                      <p>این بخش پس از انتشار نخستین روایت موقعیتی تکمیل می‌شود.</p>
                    </div>
                  )}
                </section>
              );
            }

            if (section.type === 'featured_products' && 'referenceIds' in section.content) {
              const referenceIds = section.content.referenceIds;
              const items = products.filter((item) => referenceIds.includes(item.productId));
              return (
                <section
                  className="shell editorial-products"
                  aria-labelledby={`section-${section.id}`}
                  key={section.id}
                >
                  <header className="editorial-section-heading editorial-heading-split">
                    <div>
                      <p>انتخاب تحریریه</p>
                      <h2 id={`section-${section.id}`}>{section.content.title}</h2>
                    </div>
                    <Link href="/catalog">مشاهدهٔ فروشگاه</Link>
                  </header>
                  {items.length > 0 ? (
                    <div className="product-grid">
                      {items.map((product) => (
                        <ProductCard
                          key={`${product.productId}-${product.selectedVariant.id}`}
                          product={product}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="state-panel">
                      <h3>انتخابی برای نمایش وجود ندارد</h3>
                      <p>محصولات پیش‌نویس تا زمان انتشار در این بخش دیده نمی‌شوند.</p>
                    </div>
                  )}
                </section>
              );
            }

            if (section.type === 'journal_highlights' && 'referenceIds' in section.content) {
              const referenceIds = section.content.referenceIds;
              const items = journal.filter((item) => referenceIds.includes(item.id));
              return (
                <JournalHighlights
                  key={section.id}
                  title={section.content.title}
                  items={items}
                  sectionId={section.id}
                />
              );
            }

            if (
              (section.type === 'brand_story' || section.type === 'editorial_banner') &&
              isMediaSection(section)
            ) {
              const asset = media.get(section.content.mediaId);
              return (
                <section
                  className="editorial-story"
                  aria-labelledby={`section-${section.id}`}
                  key={section.id}
                >
                  <div className="editorial-story-media">
                    {asset ? (
                      <Image
                        src={asset.url}
                        alt={asset.alt}
                        fill
                        sizes="(max-width: 767px) 100vw, 50vw"
                        style={{
                          objectPosition: `${String(asset.focalPoint.x * 100)}% ${String(asset.focalPoint.y * 100)}%`,
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="editorial-story-copy">
                    <p>دربارهٔ نگاه ما</p>
                    <h2 id={`section-${section.id}`}>{section.content.title}</h2>
                    {section.content.subtitle ? <p>{section.content.subtitle}</p> : null}
                    {section.content.ctaLabel && section.content.href ? (
                      <Link className="text-link" href={section.content.href}>
                        {section.content.ctaLabel}
                      </Link>
                    ) : null}
                  </div>
                </section>
              );
            }
            return null;
          })
        )}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}

function JournalHighlights({
  title,
  items,
  sectionId,
}: {
  title: string;
  items: Awaited<ReturnType<typeof getJournal>>['items'];
  sectionId: string;
}) {
  return (
    <section className="shell editorial-journal" aria-labelledby={`section-${sectionId}`}>
      <header className="editorial-section-heading">
        <p>از ژورنال</p>
        <h2 id={`section-${sectionId}`}>{title}</h2>
        <Link href="/journal">همهٔ مقاله‌ها</Link>
      </header>
      <div className="journal-card-grid">
        {items.map((item) => (
          <Link href={`/journal/${item.slug}`} key={item.id}>
            <span className="journal-card-media">
              <Image
                src={item.coverMedia.url}
                alt={item.coverMedia.alt}
                fill
                sizes="(max-width: 767px) 100vw, 33vw"
              />
            </span>
            <strong>{item.title}</strong>
            <small>{item.excerpt}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
