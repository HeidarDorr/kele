import Image from 'next/image';

export function BrandWordmark({
  className,
  alt = '',
  priority = false,
}: {
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <span className={['brand-wordmark', className].filter(Boolean).join(' ')}>
      <Image
        className="brand-wordmark-image"
        src="/brand/kele-signature.png"
        alt={alt}
        width={1839}
        height={1009}
        priority={priority}
        sizes="(max-width: 767px) 92px, 160px"
      />
    </span>
  );
}
