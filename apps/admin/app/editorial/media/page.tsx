import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../components/admin-shell';
import { MediaUploadForm } from '../../../components/media-upload-form';
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
            <h1>کتابخانهٔ رسانه</h1>
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
          <h1>کتابخانهٔ رسانه</h1>
        </div>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          {parameters.notice === 'uploaded'
            ? 'فایل بارگذاری شد و اکنون در فرم‌های سایت قابل انتخاب است.'
            : 'رسانهٔ بدون ارجاع حذف شد.'}
        </div>
      ) : null}
      {result === null ? (
        <section className="admin-error" role="alert">
          <strong>دریافت رسانه‌ها و وضعیت ارجاع ممکن نشد.</strong> حذف رسانه غیرفعال باقی ماند.
        </section>
      ) : null}
      <p className="admin-lead">
        این کتابخانه منبع مشترک تصاویر محصول، ست، صفحهٔ اصلی و ژورنال است. هیچ رسانه‌ای پیش از
        مشاهدهٔ ارجاع‌های فعال و تاریخی حذف نمی‌شود.
      </p>
      <section className="admin-section media-upload-section" aria-labelledby="media-upload-title">
        <div className="admin-section-heading">
          <div>
            <p>Object Storage / Upload</p>
            <h2 id="media-upload-title">افزودن رسانه</h2>
          </div>
          <span>فرمت و ابعاد فایل روی سرور دوباره بررسی می‌شود.</span>
        </div>
        <MediaUploadForm />
      </section>
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
            <span className="admin-media-meta">
              {item.colorHex ? (
                <i style={{ backgroundColor: item.colorHex }} aria-label={`رنگ ${item.colorHex}`} />
              ) : null}
              <small>
                <bdi dir="ltr">
                  {item.width}×{item.height}
                </bdi>{' '}
                · {item.group}
              </small>
            </span>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
