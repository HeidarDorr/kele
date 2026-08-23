import Image from 'next/image';
import { pendingArtDirection } from '../lib/art-direction.server';
import { ArtDirectionSlot, type SlotVariant } from './art-direction-slot';

export type FocalPoint = Readonly<{ x: number; y: number }>;

/**
 * Fills a positioned container with editorial artwork.
 *
 * When the image is one the storefront has briefed but not yet received, the
 * production brief is rendered in its place; otherwise the caller gets the real
 * picture, cropped to its recorded focal point.
 */
export function EditorialMedia({
  src,
  alt,
  sizes,
  focalPoint,
  priority = false,
  slotVariant = 'panel',
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  focalPoint?: FocalPoint | null | undefined;
  priority?: boolean | undefined;
  /** Use `backdrop` whenever headline copy is layered over this image. */
  slotVariant?: SlotVariant | undefined;
}) {
  // An empty alt marks decorative artwork whose meaning is already carried by
  // adjacent copy. Its stand-in must stay out of the accessibility tree too,
  // otherwise the brief leaks into the name of the control that wraps it.
  const decorative = alt === '';
  const brief = src ? pendingArtDirection(src) : null;
  if (brief) {
    return <ArtDirectionSlot brief={brief} variant={slotVariant} decorative={decorative} />;
  }

  if (!src) {
    return (
      <div
        className="image-fallback"
        {...(decorative
          ? { 'aria-hidden': true }
          : { role: 'img', 'aria-label': `${alt}، تصویر در دسترس نیست` })}
      >
        <span>تصویر در دسترس نیست</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      style={
        focalPoint
          ? {
              objectPosition: `${String(focalPoint.x * 100)}% ${String(focalPoint.y * 100)}%`,
            }
          : undefined
      }
    />
  );
}
