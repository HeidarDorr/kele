import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../../components/admin-shell';
import { previewProduct } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function ProductPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preview = await previewProduct(id);
  const product = preview.product;
  return (
    <AdminShell>
      <div className="preview-banner" role="status">
        پیش‌نمایش محافظت‌شده. این صفحه در کاتالوگ عمومی قابل کشف نیست.
      </div>
      <header className="admin-heading">
        <div>
          <p>Catalog / Protected Preview</p>
          <h1>{product.name}</h1>
        </div>
        <Link className="admin-secondary" href={`/products/${id}/edit`}>
          بازگشت به ویرایش
        </Link>
      </header>
      <div className="admin-preview-grid">
        <div className="admin-preview-image">
          <Image
            src={product.selectedVariant.featuredMedia.url}
            alt={product.selectedVariant.featuredMedia.alt}
            fill
            sizes="(max-width: 767px) 100vw, 50vw"
            style={{
              objectPosition: `${String(product.selectedVariant.featuredMedia.focalPoint.x * 100)}% ${String(product.selectedVariant.featuredMedia.focalPoint.y * 100)}%`,
            }}
          />
        </div>
        <div>
          <h2>{product.name}</h2>
          <p className="preview-price">{product.price.display}</p>
          <p>{product.description}</p>
          <h3>SKUها</h3>
          <ul>
            {product.variants[0]?.skus.map((sku) => (
              <li key={sku.id}>
                <bdi dir="ltr">{sku.code}</bdi>
                <span>{sku.size}</span>
                <span>{sku.available ? 'موجود' : 'ناموجود'}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}
