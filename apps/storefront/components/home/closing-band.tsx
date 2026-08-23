import Link from 'next/link';
import { EditorialMedia } from '../editorial-media';

export function ClosingBand() {
  return (
    <section className="home-closing" aria-labelledby="home-closing-title">
      <div className="home-closing-media" aria-hidden="true">
        <EditorialMedia
          src="/media/editorial/home-closing.webp"
          alt=""
          sizes="100vw"
          slotVariant="backdrop"
        />
      </div>
      <div className="home-closing-copy">
        <p className="home-eyebrow">KELE</p>
        <h2 id="home-closing-title">لباسی که در خاطره می‌ماند</h2>
        <p>
          مجموعه‌ای کوچک و انتخاب‌شده، برای روزهایی که قرار است سال‌ها بعد هم در عکس‌ها دیده شوند.
        </p>
        <div className="home-closing-actions">
          <Link className="home-button" href="/catalog">
            دیدن مجموعه
          </Link>
          <Link className="home-text-link home-text-link-inverse" href="/occasions">
            انتخاب بر اساس موقعیت
          </Link>
        </div>
      </div>
    </section>
  );
}
