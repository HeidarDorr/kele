import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../components/admin-shell';
import { listMedia } from '../../../lib/admin-api';
import { getAcceptancePresentationState } from '../../../lib/acceptance-presentation-state.server';

export const dynamic = 'force-dynamic';
export default async function EditorialMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const parameters = await searchParams;
  const acceptanceState = await getAcceptancePresentationState([
    'loading',
    'empty',
    'error',
  ] as const);
  if (acceptanceState === 'loading')
    return (
      <AdminShell>
        <header className="admin-heading">
          <div>
            <p>Editorial / Media</p>
            <h1>رسانه‌های امن</h1>
          </div>
        </header>
        <section className="editorial-admin-state" role="status" aria-busy="true">
          <strong>در حال دریافت رسانه‌ها</strong>
          <span>ارجاع‌های فعال و تاریخی پیش از نمایش بررسی می‌شوند.</span>
        </section>
      </AdminShell>
    );
  const result = acceptanceState === 'error' ? null : await listMedia().catch(() => null);
  const media = acceptanceState === 'empty' ? [] : (result ?? []);
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
      {result === null ? (
        <section className="admin-error" role="alert">
          <strong>دریافت رسانه‌ها و وضعیت ارجاع ممکن نشد.</strong> حذف رسانه غیرفعال باقی ماند.
        </section>
      ) : null}
      <p className="admin-lead">هیچ رسانه‌ای پیش از مشاهدهٔ ارجاع‌های فعال و تاریخی حذف نمی‌شود.</p>
      {result !== null && media.length === 0 ? (
        <section className="admin-empty-state" role="status">
          رسانه‌ای برای بررسی وجود ندارد.
        </section>
      ) : null}
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
