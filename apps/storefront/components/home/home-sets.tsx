import Link from 'next/link';
import type { OutfitDetail } from '../../lib/catalog-api';
import { EditorialMedia } from '../editorial-media';

function SetFeature({ outfit, position }: { outfit: OutfitDetail; position: number }) {
  const titleId = `home-set-${outfit.id}`;
  const href = `/outfits/${outfit.slug}`;
  const [detail, scene] = outfit.gallery.filter((media) => media.url !== outfit.featuredMedia.url);
  const classNames = ['home-set'];
  if (position % 2 === 0) classNames.push('is-mirrored');
  if (scene) classNames.push('has-scene');

  return (
    <article className={classNames.join(' ')} aria-labelledby={titleId}>
      <div className="shell home-set-inner">
        <div className="home-set-media">
          <div className="home-set-look">
            <EditorialMedia
              src={outfit.featuredMedia.url}
              alt={outfit.featuredMedia.alt}
              sizes="(max-width: 1023px) 92vw, 40vw"
              focalPoint={outfit.featuredMedia.focalPoint}
            />
          </div>
          {detail ? (
            <div className="home-set-aside">
              <div className="home-set-detail">
                <EditorialMedia
                  src={detail.url}
                  alt={detail.alt}
                  sizes="(max-width: 1023px) 34vw, 24vw"
                  focalPoint={detail.focalPoint}
                />
              </div>
              {scene ? (
                <div className="home-set-scene">
                  <EditorialMedia
                    src={scene.url}
                    alt={scene.alt}
                    sizes="(max-width: 1023px) 34vw, 24vw"
                    focalPoint={scene.focalPoint}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="home-set-copy">
          {outfit.items.length > 0 ? (
            <p className="home-eyebrow">ترکیب {outfit.items.length.toLocaleString('fa-IR')} تکه</p>
          ) : null}
          <h3 id={titleId}>{outfit.name}</h3>
          <p className="home-set-lede">{outfit.description}</p>

          <div className="home-set-meta">
            <p className="home-set-price">از {outfit.startingPrice.display}</p>
            <span className={outfit.available ? 'availability' : 'availability unavailable'}>
              {outfit.available ? 'موجود' : 'فعلاً ناموجود'}
            </span>
          </div>
          <Link className="home-button" href={href} aria-label={`مشاهده ${outfit.name}`}>
            مشاهده ست
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Each featured Outfit gets a full editorial spread of its own, alternating
 * sides, so complete looks carry the page rather than sitting in a grid.
 */
export function HomeSets({
  title,
  items,
  titleId,
}: {
  title: string;
  items: readonly OutfitDetail[];
  titleId: string;
}) {
  return (
    <section className="home-sets" aria-labelledby={titleId}>
      <h2 className="visually-hidden" id={titleId}>
        {title}
      </h2>
      {items.length > 0 ? (
        items.map((outfit, index) => (
          <SetFeature key={outfit.id} outfit={outfit} position={index + 1} />
        ))
      ) : (
        <div className="shell home-sets-empty">
          <div className="state-panel">
            <h3>ستی برای نمایش وجود ندارد</h3>
            <p>ست‌های منتشرشده پس از تأیید در این بخش دیده می‌شوند.</p>
            <Link className="home-text-link" href="/outfits">
              مشاهده مجموعه ست‌ها
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
