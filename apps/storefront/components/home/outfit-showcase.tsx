import Link from 'next/link';
import type { OutfitCardValue } from '../../lib/catalog-api';
import { OutfitCard } from '../outfit-card';
import { EditorialMedia } from '../editorial-media';

/**
 * Styling is the core of the KELE proposition, so the outfit row is introduced by
 * an editorial column rather than dropped in as another product grid.
 */
export function OutfitShowcase({
  title,
  items,
  titleId,
}: {
  title: string;
  items: readonly OutfitCardValue[];
  titleId: string;
}) {
  return (
    <section className="home-outfits" aria-labelledby={titleId}>
      <div className="shell">
        <div className="home-outfits-intro">
          <div className="home-outfits-copy">
            <p className="home-eyebrow">ست‌بندی</p>
            <h2 id={titleId}>{title}</h2>
            <p>
              هر ست را تیم ما کامل بسته است: کت، پیراهن، شلوار و جزئیات، با تناسبی که کنار هم درست
              دیده می‌شوند. می‌توانید ست را کامل بردارید یا هر تکه را جدا انتخاب کنید.
            </p>
            <Link className="home-text-link" href="/outfits">
              همهٔ ست‌ها
            </Link>
          </div>
          <div className="home-outfits-media">
            <EditorialMedia
              src="/media/editorial/styling-duo.webp"
              alt="دو کودک با ست‌های هماهنگ KELE"
              sizes="(max-width: 767px) 92vw, 46vw"
            />
          </div>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="home-product-rail">
          {items.map((outfit) => (
            <li key={outfit.id}>
              <OutfitCard outfit={outfit} />
            </li>
          ))}
          <li className="home-product-rail-end">
            <Link href="/outfits">
              <span aria-hidden="true">→</span>
              <strong>همهٔ ست‌ها</strong>
              <small>ترکیب‌های کامل فصل</small>
            </Link>
          </li>
        </ul>
      ) : (
        <div className="shell">
          <div className="state-panel">
            <h3>ستی برای نمایش وجود ندارد</h3>
            <p>ترکیب‌های منتشرشده پس از تأیید در این بخش دیده می‌شوند.</p>
          </div>
        </div>
      )}
    </section>
  );
}
