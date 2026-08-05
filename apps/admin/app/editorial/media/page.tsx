import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../components/admin-shell';
import { listMedia } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function EditorialMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [media, parameters] = await Promise.all([listMedia(), searchParams]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Media</p>
          <h1>رسانه‌های امن</h1>
        </div>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          رسانهٔ بدون ارجاع حذف شد.
        </div>
      ) : null}
      <p className="admin-lead">هیچ رسانه‌ای پیش از مشاهدهٔ ارجاع‌های فعال و تاریخی حذف نمی‌شود.</p>
      <div className="admin-media-grid">
        {media.map((item) => (
          <Link href={`/editorial/media/${item.id}`} key={item.id}>
            <span>
              <Image src={item.url} alt={item.alt} fill sizes="240px" />
            </span>
            <strong>{item.alt}</strong>
            <small>
              <bdi dir="ltr">
                {item.width}×{item.height}
              </bdi>
            </small>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
