import Link from 'next/link';
import type { OutfitCardValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function OutfitCard({ outfit }: { outfit: OutfitCardValue }) {
  return (
    <article className="product-card outfit-product-card">
      <Link
        className="product-card-image"
        href={`/outfits/${outfit.slug}`}
        aria-label={`مشاهدهٔ ست ${outfit.name}`}
      >
        <ProductImage media={outfit.featuredMedia} sizes="(max-width: 639px) 50vw, 25vw" />
      </Link>
      <div className="product-card-copy">
        <h3>
          <Link href={`/outfits/${outfit.slug}`}>{outfit.name}</Link>
        </h3>
        <p className="price">از {outfit.startingPrice.display}</p>
        <div className="card-meta">
          <span>ست کامل</span>
          <span className={outfit.available ? 'availability' : 'availability unavailable'}>
            {outfit.available ? 'موجود' : 'ناموجود'}
          </span>
        </div>
        <div className="outfit-card-spacer" aria-hidden="true" />
      </div>
    </article>
  );
}
