import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { getCategories } from '../../../lib/catalog-api';
import { EditorialApiError, getJournalArticle, getSiteSettings } from '../../../lib/editorial-api';
import { resolvePageTitle } from '../../../lib/page-metadata';

export const dynamic = 'force-dynamic';

function ArticleStructuredData({ json }: { json: string }) {
  return (
    <script
      id="kele-journal-article-json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

async function articleOrNull(slug: string) {
  try {
    return await getJournalArticle(slug);
  } catch (error) {
    if (error instanceof EditorialApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await articleOrNull(slug).catch(() => null);
  return article
    ? {
        title: resolvePageTitle(article.seo.title, article.title),
        description: article.seo.description ?? article.excerpt,
        alternates: { canonical: `/journal/${article.slug}` },
        openGraph: {
          title: article.seo.title ?? article.title,
          description: article.seo.description ?? article.excerpt,
          images: [{ url: article.coverMedia.url, alt: article.coverMedia.alt }],
        },
      }
    : { title: 'مقاله پیدا نشد' };
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [article, categoryResult, settingsResult] = await Promise.all([
    articleOrNull(slug),
    Promise.resolve(getCategories())
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const })),
    Promise.resolve(getSiteSettings())
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const })),
  ]);
  if (!article) notFound();
  const categories = categoryResult.ok ? categoryResult.value.items : [];
  const settings = settingsResult.ok ? settingsResult.value : null;
  const media = new Map(article.media.map((item) => [item.id, item]));
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    image: article.coverMedia.url,
    datePublished: article.publishedAt,
    inLanguage: 'fa-IR',
    publisher: { '@type': 'Organization', name: settings?.configuration.brandName ?? 'KELE' },
    mainEntityOfPage: `/journal/${article.slug}`,
  }).replaceAll('<', '\\u003c');

  return (
    <>
      <SiteHeader categories={categories} settings={settings} />
      <main id="main-content">
        <ArticleStructuredData json={jsonLd} />
        <article className="journal-article">
          <header className="journal-article-header shell">
            <p>ژورنال KELE</p>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
            <time dateTime={article.publishedAt}>
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(
                new Date(article.publishedAt),
              )}
            </time>
          </header>
          <figure className="journal-article-cover">
            <Image
              src={article.coverMedia.url}
              alt={article.coverMedia.alt}
              fill
              priority
              sizes="100vw"
              style={{
                objectPosition: `${String(article.coverMedia.focalPoint.x * 100)}% ${String(article.coverMedia.focalPoint.y * 100)}%`,
              }}
            />
          </figure>
          <div className="journal-prose shell">
            {article.blocks.map((block) => {
              switch (block.type) {
                case 'heading':
                  return block.level === 3 ? (
                    <h3 key={block.id}>{block.text}</h3>
                  ) : (
                    <h2 key={block.id}>{block.text}</h2>
                  );
                case 'paragraph':
                  return <p key={block.id}>{block.text}</p>;
                case 'quote':
                  return <blockquote key={block.id}>{block.text}</blockquote>;
                case 'ordered_list':
                  return (
                    <ol key={block.id}>
                      {block.items?.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ol>
                  );
                case 'unordered_list':
                  return (
                    <ul key={block.id}>
                      {block.items?.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                case 'divider':
                  return <hr key={block.id} />;
                case 'image': {
                  const asset = block.mediaId ? media.get(block.mediaId) : null;
                  return asset ? (
                    <figure className="journal-inline-image" key={block.id}>
                      <Image
                        src={asset.url}
                        alt={asset.alt}
                        width={asset.width}
                        height={asset.height}
                        sizes="(max-width: 767px) 100vw, 760px"
                        loading="eager"
                      />
                    </figure>
                  ) : (
                    <figure className="journal-inline-image journal-media-missing" key={block.id}>
                      <div role="img" aria-label="تصویر این بخش در دسترس نیست">
                        تصویر این بخش در دسترس نیست
                      </div>
                    </figure>
                  );
                }
                case 'external_link':
                  return block.href && block.label ? (
                    <p key={block.id}>
                      <a className="text-link" href={block.href} rel="noreferrer" target="_blank">
                        {block.label}
                      </a>
                    </p>
                  ) : null;
                case 'product_reference':
                case 'outfit_reference':
                  return (
                    <aside className="journal-reference" key={block.id}>
                      <span>انتخاب مرتبط</span>
                      <strong>{block.label ?? 'مشاهده در فروشگاه'}</strong>
                      <Link href={block.type === 'outfit_reference' ? '/outfits' : '/catalog'}>
                        مشاهده
                      </Link>
                    </aside>
                  );
              }
            })}
          </div>
        </article>
      </main>
      <SiteFooter settings={settings} />
    </>
  );
}
