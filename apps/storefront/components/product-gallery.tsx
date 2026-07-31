'use client';

import { useState } from 'react';
import type { MediaValue } from '../lib/catalog-api';
import { ProductImage } from './product-image';

export function ProductGallery({ media }: { media: MediaValue[] }) {
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? '');
  const selected = media.find((item) => item.id === selectedId) ?? media[0];
  if (!selected) {
    return (
      <div className="gallery-empty" role="status">
        تصویری برای این رنگ ثبت نشده است.
      </div>
    );
  }
  return (
    <div className="product-gallery">
      <div className="gallery-thumbnails" aria-label="تصاویر محصول">
        {media.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`نمایش تصویر ${String(index + 1)}: ${item.alt}`}
            aria-pressed={item.id === selected.id}
            onClick={() => {
              setSelectedId(item.id);
            }}
          >
            <ProductImage media={item} sizes="88px" />
          </button>
        ))}
      </div>
      <div className="gallery-primary">
        <ProductImage
          key={selected.id}
          media={selected}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 55vw, 640px"
          priority
        />
      </div>
    </div>
  );
}
