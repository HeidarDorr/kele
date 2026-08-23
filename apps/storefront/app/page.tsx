import type { Metadata } from 'next';
import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { getCategories, getOutfits, getProducts } from '../lib/catalog-api';
import {
  getHomepage,
  getJournal,
  getOccasions,
  getSiteSettings,
  type PublishedHomepage,
} from '../lib/editorial-api';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';
import { BrandPromise } from '../components/home/brand-promise';
import { BrandStory } from '../components/home/brand-story';
import { CategoryRail } from '../components/home/category-rail';
import { ClosingBand } from '../components/home/closing-band';
import { CraftTriptych } from '../components/home/craft-triptych';
import { HomeHero } from '../components/home/home-hero';
import { JournalHighlights } from '../components/home/journal-highlights';
import { OccasionShowcase } from '../components/home/occasion-showcase';
import { OutfitShowcase } from '../components/home/outfit-showcase';
import { ProductRail } from '../components/home/product-rail';
import { getAcceptancePresentationState } from '../lib/acceptance-presentation-state.server';

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
type MediaSection = Section & {
  content: {
    title: string;
    subtitle?: string | null;
    mediaId: string;
    ctaLabel?: string | null;
    href?: string | null;
  };
};

function isMediaSection(section: Section): section is MediaSection {
  return 'mediaId' in section.content;
}

export default async function HomePage() {
  const [
    stateResult,
    homepageResult,
    categoryResult,
    productResult,
    occasionResult,
    outfitResult,
    journalResult,
    settingsResult,
  ] = await Promise.allSettled([
    getAcceptancePresentationState(['loading', 'unavailable'] as const),
    getHomepage(),
    getCategories(),
    getProducts({ limit: 24 }),
    getOccasions(),
    getOutfits(),
    getJournal(6),
    getSiteSettings(),
  ]);
  const state = stateResult.status === 'fulfilled' ? stateResult.value : null;
  const homepage =
    state === 'unavailable' || homepageResult.status === 'rejected' ? null : homepageResult.value;
  const categories = categoryResult.status === 'fulfilled' ? categoryResult.value.items : [];
  const products = productResult.status === 'fulfilled' ? productResult.value.items : [];
  const occasions = occasionResult.status === 'fulfilled' ? occasionResult.value.items : [];
  const outfits = outfitResult.status === 'fulfilled' ? outfitResult.value.items : [];
  const journal = journalResult.status === 'fulfilled' ? journalResult.value.items : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const media = new Map(homepage?.media.map((item) => [item.id, item]) ?? []);

  function heroMediaOf(section: MediaSection) {
    const asset = media.get(section.content.mediaId);
    return asset ? { url: asset.url, alt: asset.alt, focalPoint: asset.focalPoint } : null;
  }

  function renderSection(section: Section): ReactNode {
    const titleId = `section-${section.id}`;

    if (section.type === 'hero' && isMediaSection(section)) {
      return (
        <HomeHero
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          subtitle={section.content.subtitle}
          ctaLabel={section.content.ctaLabel}
          href={section.content.href}
          media={heroMediaOf(section)}
        />
      );
    }

    if (section.type === 'occasion_grid' && 'referenceIds' in section.content) {
      const referenceIds = section.content.referenceIds;
      return (
        <OccasionShowcase
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          items={occasions.filter((item) => referenceIds.includes(item.id))}
        />
      );
    }

    if (section.type === 'featured_products' && 'referenceIds' in section.content) {
      const referenceIds = section.content.referenceIds;
      return (
        <ProductRail
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          items={products.filter((item) => referenceIds.includes(item.productId))}
        />
      );
    }

    if (section.type === 'featured_outfits' && 'referenceIds' in section.content) {
      const referenceIds = section.content.referenceIds;
      return (
        <OutfitShowcase
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          items={outfits.filter((item) => referenceIds.includes(item.id))}
        />
      );
    }

    if (section.type === 'journal_highlights' && 'referenceIds' in section.content) {
      const referenceIds = section.content.referenceIds;
      return (
        <JournalHighlights
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          items={journal.filter((item) => referenceIds.includes(item.id))}
        />
      );
    }

    if (
      (section.type === 'brand_story' || section.type === 'editorial_banner') &&
      isMediaSection(section)
    ) {
      return (
        <BrandStory
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          subtitle={section.content.subtitle}
          ctaLabel={section.content.ctaLabel}
          href={section.content.href}
          media={heroMediaOf(section)}
        />
      );
    }

    return null;
  }

  /**
   * Brand-owned sections that carry no published business content. They are
   * anchored to the section they follow so the page keeps a deliberate rhythm
   * whichever sections an editor has published.
   */
  function connectiveTissue(section: Section): ReactNode {
    if (section.type === 'hero') {
      return (
        <>
          <BrandPromise />
          <CategoryRail />
        </>
      );
    }
    if (section.type === 'featured_products') {
      return <CraftTriptych />;
    }
    return null;
  }

  const published = homepage?.sections ?? [];
  // The craft triptych normally follows the curated product row. Without that
  // anchor it still belongs on the page, just before the closing band.
  const craftNeedsFallbackSlot = !published.some((section) => section.type === 'featured_products');

  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      <main id="main-content" className="home">
        {state === 'loading' ? (
          <section className="shell home-notice" role="status" aria-busy="true">
            <p className="home-eyebrow">صفحهٔ اصلی</p>
            <h1>در حال دریافت روایت تازهٔ KELE</h1>
            <div className="home-notice-line" aria-hidden="true" />
            <p>چیدمان منتشرشده و رسانه‌های آن در حال آماده‌سازی‌اند.</p>
          </section>
        ) : (
          <>
            {homepage ? (
              published.map((section) => (
                <Fragment key={section.id}>
                  {renderSection(section)}
                  {connectiveTissue(section)}
                </Fragment>
              ))
            ) : (
              <>
                <section className="shell home-notice" role="status">
                  <p className="home-eyebrow">صفحهٔ اصلی</p>
                  <h1>روایت تازهٔ KELE در دسترس نیست</h1>
                  <p>
                    کاتالوگ و مجموعه همچنان در دسترس‌اند و محتوای منتشرشده با بازیابی ارتباط
                    بازمی‌گردد.
                  </p>
                  <Link className="home-button" href="/catalog">
                    رفتن به فروشگاه
                  </Link>
                </section>
                <BrandPromise />
                <CategoryRail />
              </>
            )}
            {craftNeedsFallbackSlot ? <CraftTriptych /> : null}
            <ClosingBand />
          </>
        )}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
