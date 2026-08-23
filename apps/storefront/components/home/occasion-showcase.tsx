import Link from 'next/link';
import type { Occasion } from '../../lib/editorial-api';
import { EditorialMedia } from '../editorial-media';

/**
 * Occasion discovery, composed so that a single published occasion still reads as
 * an intentional editorial statement rather than a half-empty grid.
 */
export function OccasionShowcase({
  title,
  items,
  titleId,
}: {
  title: string;
  items: readonly Occasion[];
  titleId: string;
}) {
  const [lead, ...rest] = items;

  return (
    <section className="home-occasions" aria-labelledby={titleId}>
      <div className="shell">
        <header className="home-heading home-heading-split">
          <div>
            <p className="home-eyebrow">بر اساس لحظه</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Link className="home-heading-link" href="/occasions">
            همهٔ موقعیت‌ها
          </Link>
        </header>

        {lead ? (
          <div
            className={rest.length > 0 ? 'home-occasion-layout' : 'home-occasion-layout is-solo'}
          >
            <OccasionTile occasion={lead} featured priority />
            {rest.length > 0 ? (
              <div className="home-occasion-rest">
                {rest.map((occasion) => (
                  <OccasionTile key={occasion.id} occasion={occasion} />
                ))}
              </div>
            ) : (
              <div className="home-occasion-aside">
                <p>
                  هر موقعیت، یک انتخاب سنجیده است: از مهمانی خانوادگی تا مراسم رسمی و عکس یادگاری.
                </p>
                <Link className="home-text-link" href="/occasions">
                  دیدن همهٔ موقعیت‌ها
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="state-panel">
            <h3>موقعیتی منتشر نشده است</h3>
            <p>این بخش پس از انتشار نخستین روایت موقعیتی تکمیل می‌شود.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function OccasionTile({
  occasion,
  featured = false,
  priority = false,
}: {
  occasion: Occasion;
  featured?: boolean | undefined;
  priority?: boolean | undefined;
}) {
  return (
    <Link
      className={featured ? 'home-occasion-tile is-featured' : 'home-occasion-tile'}
      href={`/occasion/${occasion.slug}`}
    >
      <span className="home-occasion-media">
        <EditorialMedia
          src={occasion.heroMedia?.url}
          alt=""
          sizes={featured ? '(max-width: 767px) 92vw, 58vw' : '(max-width: 767px) 92vw, 30vw'}
          focalPoint={occasion.heroMedia?.focalPoint}
          priority={priority}
          slotVariant="backdrop"
        />
      </span>
      <span className="home-occasion-copy">
        <strong>{occasion.editorialTitle ?? occasion.name}</strong>
        <small>{occasion.editorialDescription ?? occasion.description}</small>
      </span>
    </Link>
  );
}
