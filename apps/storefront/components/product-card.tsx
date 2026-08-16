'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ProductCardValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function ProductCard({ product }: { product: ProductCardValue }) {
  const [selectedId, setSelectedId] = useState(product.selectedVariant.id);
  const selected =
    product.availableColors.find((color) => color.variantId === selectedId) ??
    product.availableColors[0];
  if (!selected) return null;
  const href = `/products/${product.slug}?color=${encodeURIComponent(selected.variantId)}`;

  return (
    <article className="product-card">
      <Link className="product-card-image" href={href} aria-label={`مشاهدهٔ ${product.name}`}>
        <span className="product-card-image-primary">
          <ProductImage
            key={selected.featuredMedia.id}
            media={selected.featuredMedia}
            sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          />
        </span>
        {selected.secondaryMedia ? (
          <span className="product-card-image-secondary" aria-hidden="true">
            <ProductImage
              key={selected.secondaryMedia.id}
              media={selected.secondaryMedia}
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
            />
          </span>
        ) : null}
      </Link>
      <div className="product-card-copy">
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p className="price" dir="rtl">
          {selected.price.display}
        </p>
        <div className="card-meta">
          <span>{selected.name}</span>
          <span className={selected.available ? 'availability' : 'availability unavailable'}>
            {selected.available ? 'موجود' : 'ناموجود'}
          </span>
        </div>
        <div className="swatches" role="group" aria-label="پیش‌نمایش رنگ‌های محصول">
          {product.availableColors.map((color) => (
            <button
              key={color.variantId}
              title={color.name}
              type="button"
              aria-label={`${color.name}${color.available ? '' : '، ناموجود'}`}
              aria-pressed={color.variantId === selected.variantId}
              className={color.available ? '' : 'swatch-unavailable'}
              onClick={() => {
                setSelectedId(color.variantId);
              }}
            >
              <span style={{ backgroundColor: color.hex ?? 'transparent' }} />
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
