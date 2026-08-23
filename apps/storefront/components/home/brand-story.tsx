import Link from 'next/link';
import { EditorialMedia, type FocalPoint } from '../editorial-media';

export function BrandStory({
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
  media: Readonly<{ url: string; alt: string; focalPoint: FocalPoint }> | null;
  titleId: string;
}) {
  return (
    <section className="home-story" aria-labelledby={titleId}>
      <div className="home-story-media">
        <EditorialMedia
          src={media?.url}
          alt={media?.alt ?? ''}
          sizes="(max-width: 767px) 100vw, 50vw"
          focalPoint={media?.focalPoint}
        />
      </div>
      <div className="home-story-copy">
        <p className="home-eyebrow">دربارهٔ نگاه ما</p>
        <h2 id={titleId}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {ctaLabel && href ? (
          <Link className="home-text-link" href={href}>
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
