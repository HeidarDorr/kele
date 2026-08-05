import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';
import { getJournal, getSiteSettings } from '../../lib/editorial-api';
import JournalLoading from './loading';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'ژورنال',
  description: 'روایت‌های KELE دربارهٔ پارچه، تناسب، نگهداری و پوشش سنجیدهٔ کودک.',
  alternates: { canonical: '/journal' },
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: 'loading' | 'empty' | 'error' }>;
}) {
  const [parameters, journalResult, categoriesResult, settingsResult] = await Promise.allSettled([
    searchParams,
    getJournal(),
    getCategories(),
    getSiteSettings(),
  ]);
  const state = parameters.status === 'fulfilled' ? parameters.value.state : undefined;
  const articles =
    state === 'empty' || journalResult.status === 'rejected' ? [] : journalResult.value.items;
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : [];
  const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
  const unavailable = state === 'error' || journalResult.status === 'rejected';

  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      {state === 'loading' ? (
        <JournalLoading />
      ) : (
        <main id="main-content" className="journal-index shell">
          <header className="journal-index-heading">
            <p>یادداشت‌های KELE</p>
            <h1>ژورنال</h1>
            <p>روایت‌هایی از پارچه، تناسب و جزئیاتی که پوشش کودک را آرام و ماندگار می‌کنند.</p>
          </header>
          {unavailable ? (
            <section className="state-panel" role="alert">
              <h2>ژورنال اکنون در دسترس نیست</h2>
              <p>مقاله‌های منتشرشده پس از بازیابی ارتباط دوباره نمایش داده می‌شوند.</p>
              <Link className="text-link" href="/catalog">
                رفتن به فروشگاه
              </Link>
            </section>
          ) : articles.length === 0 ? (
            <section className="state-panel" role="status">
              <h2>هنوز روایتی منتشر نشده است</h2>
              <p>پیش‌نویس‌ها برای مشتری نمایش داده نمی‌شوند.</p>
            </section>
          ) : (
            <div className="journal-index-grid">
              {articles.map((article, index) => (
                <article className={index === 0 ? 'journal-featured' : ''} key={article.id}>
                  <Link href={`/journal/${article.slug}`}>
                    <span className="journal-index-media">
                      <Image
                        src={article.coverMedia.url}
                        alt={article.coverMedia.alt}
                        fill
                        priority={index === 0}
                        sizes={
                          index === 0
                            ? '(max-width: 767px) 100vw, 66vw'
                            : '(max-width: 767px) 100vw, 33vw'
                        }
                        style={{
                          objectPosition: `${String(article.coverMedia.focalPoint.x * 100)}% ${String(article.coverMedia.focalPoint.y * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="journal-index-copy">
                      <small>
                        {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(
                          new Date(article.publishedAt),
                        )}
                      </small>
                      <h2>{article.title}</h2>
                      <p>{article.excerpt}</p>
                      <span className="text-link">خواندن مقاله</span>
                    </span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </main>
      )}
      <SiteFooter settings={settings} />
    </>
  );
}
