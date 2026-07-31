'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { MediaValue } from '../lib/catalog-api';

export function ProductImage({
  media,
  sizes,
  priority = false,
}: {
  media: MediaValue;
  sizes: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="image-fallback" role="img" aria-label={`${media.alt}، تصویر در دسترس نیست`}>
        <span>تصویر در دسترس نیست</span>
      </div>
    );
  }
  return (
    <Image
      src={media.url}
      alt={media.alt}
      fill
      priority={priority}
      sizes={sizes}
      onError={() => {
        setFailed(true);
      }}
      style={{
        objectPosition: `${String(media.focalPoint.x * 100)}% ${String(media.focalPoint.y * 100)}%`,
      }}
    />
  );
}
