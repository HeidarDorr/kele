import Link from 'next/link';
import { EditorialMedia } from '../editorial-media';

const frames = [
  {
    src: '/media/editorial/craft-fabric.webp',
    alt: 'پارچه‌های لینن و پنبهٔ طبیعی تاشده روی سطحی روشن',
    caption: 'پارچه',
    body: 'الیاف طبیعی با بافت باز، تا لباس روی پوست نفس بکشد.',
  },
  {
    src: '/media/editorial/craft-stitch.webp',
    alt: 'جزئیات یقه و جادکمهٔ یک کت کوچک لینن',
    caption: 'دوخت',
    body: 'درزهای تمیز و بدون زبری؛ جزئیاتی که از نزدیک هم درست‌اند.',
  },
  {
    src: '/media/editorial/craft-movement.webp',
    alt: 'کودکی در حال حرکت با کت لینن باز',
    caption: 'حرکت',
    body: 'فرمی که با کودک حرکت می‌کند و او را محدود نمی‌کند.',
  },
] as const;

export function CraftTriptych() {
  return (
    <section className="home-craft" aria-labelledby="home-craft-title">
      <div className="shell">
        <header className="home-heading">
          <p className="home-eyebrow">از نزدیک</p>
          <h2 id="home-craft-title">آنچه در دست حس می‌شود</h2>
          <p className="home-heading-lede">
            کیفیت لباس کودک را نمی‌شود از دور دید. این سه قاب همان چیزی است که هنگام پوشیدن اهمیت
            پیدا می‌کند.
          </p>
        </header>
        <div className="home-craft-grid">
          {frames.map((frame) => (
            <figure key={frame.caption}>
              <span className="home-craft-media">
                <EditorialMedia
                  src={frame.src}
                  alt={frame.alt}
                  sizes="(max-width: 767px) 84vw, 30vw"
                />
              </span>
              <figcaption>
                <h3>{frame.caption}</h3>
                <p>{frame.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <Link className="home-text-link" href="/journal">
          خواندن ژورنال
        </Link>
      </div>
    </section>
  );
}
