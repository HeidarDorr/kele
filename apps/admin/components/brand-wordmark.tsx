import Image from 'next/image';
import { adminPath } from '../lib/admin-path';

export function BrandWordmark({
  alt = '',
  priority = false,
}: {
  alt?: string;
  priority?: boolean;
}) {
  return (
    <span className="brand-wordmark">
      <Image
        className="brand-wordmark-image"
        src={adminPath('/brand/kele-signature.png')}
        alt={alt}
        width={1839}
        height={1009}
        priority={priority}
        sizes="(max-width: 992px) 112px, 224px"
      />
    </span>
  );
}
