import Link from 'next/link';
import type { JournalCard } from '../../lib/editorial-api';
import { EditorialMedia } from '../editorial-media';

export function JournalHighlights({
  title,
  items,
  titleId,
}: {
  title: string;
  items: readonly JournalCard[];
  titleId: string;
}) {
  return (
    <section className="home-journal" aria-labelledby={titleId}>
      <div className="shell">
        <header className="home-heading home-heading-split">
          <div>
            <p className="home-eyebrow">از ژورنال</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Link className="home-heading-link" href="/journal">
            همهٔ مقاله‌ها
          </Link>
        </header>

        {items.length > 0 ? (
          <ul className={items.length === 1 ? 'home-journal-grid is-solo' : 'home-journal-grid'}>
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/journal/${item.slug}`}>
                  <span className="home-journal-media">
                    <EditorialMedia
                      src={item.coverMedia.url}
                      alt=""
                      sizes="(max-width: 767px) 92vw, 31vw"
                      focalPoint={item.coverMedia.focalPoint}
                    />
                  </span>
                  <strong>{item.title}</strong>
                  <small>{item.excerpt}</small>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="state-panel">
            <h3>مقاله‌ای منتشر نشده است</h3>
            <p>نوشته‌های ژورنال پس از انتشار در این بخش دیده می‌شوند.</p>
          </div>
        )}
      </div>
    </section>
  );
}
