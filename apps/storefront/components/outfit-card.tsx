import Link from 'next/link';
import type { OutfitCardValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function OutfitCard({ outfit }: { outfit: OutfitCardValue }) {
  return (
    <article className="outfit-card">
      <Link href={`/outfits/${outfit.slug}`} aria-label={`مشاهدهٔ استایل ${outfit.name}`}>
        <div className="outfit-card-media">
          <ProductImage media={outfit.featuredMedia} sizes="(max-width: 767px) 92vw, 42vw" />
          <span>{outfit.available ? 'آمادهٔ انتخاب' : 'فعلاً ناموجود'}</span>
        </div>
        <div className="outfit-card-copy">
          <p>استایل کامل · ویرایش {outfit.revisionNumber.toLocaleString('fa-IR')}</p>
          <h2>{outfit.name}</h2>
          <strong>از {outfit.startingPrice.display}</strong>
        </div>
      </Link>
    </article>
  );
}
