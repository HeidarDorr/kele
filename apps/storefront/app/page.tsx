import type { Metadata } from 'next';
import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import {
  getCategories,
  getOutfit,
  getOutfits,
  getProducts,
  type OutfitDetail,
} from '../lib/catalog-api';
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
import { ClosingBand } from '../components/home/closing-band';
import { HomeHero } from '../components/home/home-hero';
import { HomeSets } from '../components/home/home-sets';
import { JournalHighlights } from '../components/home/journal-highlights';
import { OccasionShowcase } from '../components/home/occasion-showcase';
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
    outfitId?: string | null;
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
  const published = homepage?.sections ?? [];

  // Set spreads need the description, gallery and pieces that only the Outfit
  // detail carries. A set that fails to load is left out rather than half drawn.
  const featuredOutfitIds = new Set(
    published.flatMap((section) =>
      section.type === 'featured_outfits' && 'referenceIds' in section.content
        ? section.content.referenceIds
        : [],
    ),
  );
  const outfitDetails = new Map<string, OutfitDetail>();
  const detailResults = await Promise.allSettled(
    outfits.filter((item) => featuredOutfitIds.has(item.id)).map((item) => getOutfit(item.slug)),
  );
  for (const result of detailResults) {
    if (result.status === 'fulfilled') outfitDetails.set(result.value.id, result.value);
  }

  function heroMediaOf(section: MediaSection) {
    const asset = media.get(section.content.mediaId);
    return asset ? { url: asset.url, alt: asset.alt, focalPoint: asset.focalPoint } : null;
  }

  // A Hero that presents an Outfit opens it by its current slug. If that Outfit
  // has since left the catalogue, the Hero stays editorial rather than linking
  // to a missing page.
  function heroHrefOf(section: MediaSection): string | null {
    const outfitId = section.content.outfitId ?? null;
    if (outfitId === null) return section.content.href ?? null;
    const outfit = outfits.find((item) => item.id === outfitId);
    return outfit ? `/outfits/${outfit.slug}` : null;
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
          href={heroHrefOf(section)}
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
      return (
        <HomeSets
          key={section.id}
          titleId={titleId}
          title={section.content.title}
          items={section.content.referenceIds
            .map((id) => outfitDetails.get(id))
            .filter((item): item is OutfitDetail => item !== undefined)}
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
                  {/* The brand promise is brand-owned copy, anchored under the hero. */}
                  {section.type === 'hero' ? <BrandPromise /> : null}
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
              </>
            )}
            <ClosingBand />
          </>
        )}
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
