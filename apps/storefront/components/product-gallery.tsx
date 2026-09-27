'use client';

import { useRef, useState } from 'react';
import {
  gallerySwipeStep,
  moveGalleryIndex,
  type GalleryPoint,
  type ProductGalleryItem,
} from '../lib/product-gallery-model';
import { ProductImage } from './product-image';

type GalleryMotionDirection = 'backward' | 'forward';

export function ProductGallery({
  items,
  initialItemKey,
}: {
  items: ProductGalleryItem[];
  initialItemKey?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const initialIndex = items.findIndex((item) => item.key === initialItemKey);
    return initialIndex >= 0 ? initialIndex : 0;
  });
  const [motionDirection, setMotionDirection] = useState<GalleryMotionDirection>('forward');
  const thumbnailButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const touchStart = useRef<GalleryPoint | null>(null);
  const activeIndex = items[selectedIndex] ? selectedIndex : 0;
  const selected = items[activeIndex] ?? items[0];

  function selectIndex(
    nextIndex: number,
    focusThumbnail = false,
    direction: GalleryMotionDirection = nextIndex > activeIndex ? 'forward' : 'backward',
  ) {
    if (nextIndex === activeIndex) return;
    setMotionDirection(direction);
    setSelectedIndex(nextIndex);
    if (focusThumbnail) {
      thumbnailButtons.current[nextIndex]?.focus({ preventScroll: true });
      thumbnailButtons.current[nextIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  function moveSelection(step: -1 | 1, focusThumbnail = false) {
    selectIndex(
      moveGalleryIndex(activeIndex, items.length, step),
      focusThumbnail,
      step === 1 ? 'forward' : 'backward',
    );
  }

  if (!selected) {
    return (
      <div className="gallery-empty" role="status">
        تصویری برای این محصول ثبت نشده است.
      </div>
    );
  }
  return (
    <div className="product-gallery">
      <div className="gallery-thumbnails" aria-label="تصاویر محصول" role="group">
        {items.map((item, index) => (
          <button
            ref={(element) => {
              thumbnailButtons.current[index] = element;
            }}
            key={item.key}
            type="button"
            aria-label={`نمایش تصویر ${String(index + 1)} از ${String(items.length)}${item.groupLabel ? `، رنگ ${item.groupLabel}` : ''}: ${item.media.alt}`}
            aria-pressed={item.key === selected.key}
            data-gallery-group={item.groupId}
            onClick={() => {
              selectIndex(index);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              const step = event.key === 'ArrowLeft' ? 1 : -1;
              selectIndex(
                moveGalleryIndex(index, items.length, step),
                true,
                step === 1 ? 'forward' : 'backward',
              );
            }}
          >
            <ProductImage media={item.media} sizes="88px" />
            {item.groupLabel && item.startsGroup ? (
              <span className="gallery-thumbnail-color" aria-hidden="true">
                {item.groupLabel}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div
        className="gallery-primary"
        role="group"
        aria-label={selected.groupLabel ? `تصویر محصول، رنگ ${selected.groupLabel}` : 'تصویر محصول'}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const touch = event.changedTouches[0];
          touchStart.current = null;
          if (!start || !touch) return;
          const direction =
            event.currentTarget.ownerDocument.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
          const step = gallerySwipeStep(start, { x: touch.clientX, y: touch.clientY }, direction);
          if (step !== 0) moveSelection(step);
        }}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        <div className="gallery-primary-image" data-motion={motionDirection} key={selected.key}>
          <ProductImage
            media={selected.media}
            sizes="(max-width: 767px) 100vw, (max-width: 1279px) 55vw, 640px"
            priority
          />
        </div>
        <p className="gallery-position" aria-live="polite">
          تصویر {(activeIndex + 1).toLocaleString('fa-IR')} از{' '}
          {items.length.toLocaleString('fa-IR')}
          {selected.groupLabel ? ` · رنگ ${selected.groupLabel}` : ''}
        </p>
      </div>
    </div>
  );
}
