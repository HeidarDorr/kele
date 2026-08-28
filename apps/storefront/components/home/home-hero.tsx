import Link from 'next/link';
import { EditorialMedia, type FocalPoint } from '../editorial-media';

export type HeroMedia = Readonly<{
  url: string;
  alt: string;
  focalPoint: FocalPoint;
}>;

export function HomeHero({
  title,
  subtitle,
  ctaLabel,
  href,
  media,
  titleId,
}: {
  title: string;
  subtitle?: string | null | undefined;
  ctaLabel?: string | null | undefined;
  href?: string | null | undefined;
  media: HeroMedia | null;
  titleId: string;
}) {
  return (
    <section className="home-hero" aria-labelledby={titleId}>
      <div className="home-hero-media">
        <EditorialMedia
          src={media?.url}
          alt={media?.alt ?? 'روایت فصل KELE'}
          sizes="(max-width: 767px) 240vw, 100vw"
          focalPoint={media?.focalPoint}
          priority
          slotVariant="backdrop"
        />
      </div>
      <div className="home-hero-veil" aria-hidden="true" />
      <div className="home-hero-copy">
        <p className="home-eyebrow">روایت فصل</p>
        <h1 id={titleId}>{title}</h1>
        {subtitle ? <p className="home-hero-lede">{subtitle}</p> : null}
        <div className="home-hero-actions">
          {ctaLabel && href ? (
            <Link className="home-button" href={href}>
              {ctaLabel}
            </Link>
          ) : null}
          <Link className="home-text-link" href="/outfits">
            دیدن ست‌های کامل
          </Link>
        </div>
      </div>
    </section>
  );
}
