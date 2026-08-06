import Link from 'next/link';
import type { OutfitCardValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function OutfitCard({ outfit }: { outfit: OutfitCardValue }) {
  return (
    <article className="outfit-card">
      <Link href={`/outfits/${outfit.slug}`} aria-label={`مشاهدهٔ استایل ${outfit.name}`}>
        <div className="outfit-card-media">
          <ProductImage media={outfit.featuredMedia} sizes="(max-width: 767px) 92vw, 42vw" />
        </div>
        <div className="outfit-card-copy">
          <p>استایل کامل</p>
          <h2>{outfit.name}</h2>
          <div>
            <strong>از {outfit.startingPrice.display}</strong>
            <span className={outfit.available ? 'availability' : 'availability unavailable'}>
              {outfit.available ? 'موجود' : 'ناموجود'}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
