import type { Metadata } from 'next';
import Link from 'next/link';
import { OutfitCard } from '../../components/outfit-card';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories, getOutfits } from '../../lib/catalog-api';
import { getAcceptancePresentationState } from '../../lib/acceptance-presentation-state.server';
import OutfitsLoading from './loading';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ست‌های کامل',
  description: 'ست‌های مستقل و سنجیدهٔ KELE با قیمت و اندازهٔ یکپارچه.',
  alternates: { canonical: '/outfits' },
};

export default async function OutfitsPage() {
  const state = await getAcceptancePresentationState(['loading', 'empty', 'error'] as const);
  const categories = await getCategories().catch(() => ({ items: [] }));
  if (state === 'loading') {
    return (
      <>
        <SiteHeader categories={categories.items} />
        <OutfitsLoading />
        <SiteFooter />
      </>
    );
  }
  const result = state === 'error' ? null : await getOutfits().catch(() => null);
  const outfits = state === 'empty' ? [] : (result?.items ?? []);

  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="outfits-index">
        <header className="shell outfits-masthead">
          <p>ترکیب‌های سردبیری‌شده</p>
          <h1>یک انتخاب کامل، بدون حدس میان اندازه‌ها</h1>
          <span>
            هر ست هویت، قیمت و تصویر مستقل دارد؛ موجودی آن در همان لحظه از اجزای واقعی محاسبه
            می‌شود.
          </span>
        </header>
        <section className="shell outfits-collection" aria-labelledby="outfits-title">
          <div className="outfits-section-heading">
            <h2 id="outfits-title">ست‌های KELE</h2>
            <span>{outfits.length.toLocaleString('fa-IR')} انتخاب</span>
          </div>
          {result === null ? (
            <div className="state-panel state-error" role="alert">
              <h2>دریافت ست‌ها ممکن نشد</h2>
              <p>ارتباط را بررسی کنید؛ انتخاب‌های شما تغییری نکرده‌اند.</p>
              <Link className="button-secondary" href="/outfits">
                تلاش دوباره
              </Link>
            </div>
          ) : outfits.length === 0 ? (
            <div className="state-panel" aria-live="polite">
              <h2>ست منتشرشده‌ای وجود ندارد</h2>
              <p>پس از تعیین رنگ و اندازهٔ همهٔ اجزا، ست تازه در این صفحه دیده می‌شود.</p>
              <Link className="button-secondary" href="/catalog">
                دیدن محصولات مستقل
              </Link>
            </div>
          ) : (
            <div className="outfit-grid">
              {outfits.map((outfit) => (
                <OutfitCard key={outfit.revisionId} outfit={outfit} />
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
