import Link from 'next/link';
import type { ProductCardValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function ProductCard({ product }: { product: ProductCardValue }) {
  return (
    <article className="product-card">
      <Link className="product-card-image" href={`/products/${product.slug}`}>
        <ProductImage
          media={product.selectedVariant.featuredMedia}
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
        />
      </Link>
      <div className="product-card-copy">
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="price" dir="rtl">
          {product.price.display}
        </p>
        <div className="card-meta">
          <span>{product.selectedVariant.name}</span>
          <span className={product.available ? 'availability' : 'availability unavailable'}>
            {product.available ? 'موجود' : 'ناموجود'}
          </span>
        </div>
        <div className="swatches" role="list" aria-label="رنگ‌های موجود">
          {product.availableColors.map((color) => (
            <span
              key={color.variantId}
              title={color.name}
              role="listitem"
              aria-label={`${color.name}${color.available ? '' : '، ناموجود'}`}
              className={color.available ? '' : 'swatch-unavailable'}
              style={{ backgroundColor: color.hex ?? 'transparent' }}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
