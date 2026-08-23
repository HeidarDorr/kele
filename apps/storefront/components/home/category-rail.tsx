import Link from 'next/link';
import { productNavigation } from '../../lib/store-navigation';
import { EditorialMedia } from '../editorial-media';

/** Derives the briefed tile artwork from the approved CAT-007 navigation target. */
function tileArtwork(href: string): string {
  const slug = href === '/outfits' ? 'set' : href.replace('/category/', '');
  return `/media/editorial/category-${slug}.webp`;
}

export function CategoryRail() {
  return (
    <section className="home-categories" aria-labelledby="home-categories-title">
      <div className="shell">
        <header className="home-heading home-heading-split">
          <div>
            <p className="home-eyebrow">فهرست محصولات</p>
            <h2 id="home-categories-title">از کجا شروع کنیم</h2>
          </div>
          <Link className="home-heading-link" href="/catalog">
            همهٔ محصولات
          </Link>
        </header>
        <ul className="home-category-grid">
          {productNavigation.map((item) => (
            <li key={item.href}>
              <Link className="home-category-tile" href={item.href}>
                <span className="home-category-media">
                  <EditorialMedia
                    src={tileArtwork(item.href)}
                    alt=""
                    sizes="(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 22vw"
                  />
                </span>
                <span className="home-category-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
