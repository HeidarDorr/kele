import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../../components/admin-shell';
import { previewOutfit } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function OutfitPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { outfit } = await previewOutfit(id);
  return (
    <AdminShell>
      <div className="preview-banner" role="status">
        پیش‌نمایش محافظت‌شدهٔ Outfit؛ پیش‌نویس در فروشگاه قابل کشف نیست.
      </div>
      <header className="admin-heading">
        <div>
          <p>Outfit / Protected Preview</p>
          <h1>{outfit.name}</h1>
        </div>
        <Link className="admin-secondary" href={`/outfits/${id}/edit`}>
          بازگشت به ویرایش
        </Link>
      </header>
      <div className="admin-preview-grid">
        <div className="admin-preview-image">
          <Image
            src={outfit.featuredMedia.url}
            alt={outfit.featuredMedia.alt}
            fill
            sizes="(max-width: 767px) 100vw, 50vw"
            style={{
              objectPosition: `${String(outfit.featuredMedia.focalPoint.x * 100)}% ${String(outfit.featuredMedia.focalPoint.y * 100)}%`,
            }}
          />
        </div>
        <div>
          <p>ویرایش {outfit.revisionNumber.toLocaleString('fa-IR')}</p>
          <h2>{outfit.name}</h2>
          <p className="preview-price">از {outfit.startingPrice.display}</p>
          <p>{outfit.description}</p>
          <h3>اندازه و موجودی مشتق‌شده</h3>
          <ul className="preview-outfit-sizes">
            {outfit.sizes.map((size) => (
              <li key={size.code}>
                <strong>{size.label}</strong>
                <span>{size.price.display}</span>
                <span>
                  {size.available
                    ? `${size.availableQuantity.toLocaleString('fa-IR')} استایل`
                    : 'ناموجود'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
