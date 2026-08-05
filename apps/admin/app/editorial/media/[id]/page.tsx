import Image from 'next/image';
import Link from 'next/link';
import { deleteEditorialMediaAction } from '../../../actions';
import { AdminShell } from '../../../../components/admin-shell';
import { getMediaReferenceReport } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function EditorialMediaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getMediaReferenceReport(id);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Media references</p>
          <h1>بررسی پیش از حذف</h1>
        </div>
        <Link className="admin-secondary" href="/editorial/media">
          بازگشت
        </Link>
      </header>
      <div className="media-reference-layout">
        <figure>
          <Image
            src={report.media.url}
            alt={report.media.alt}
            width={report.media.width}
            height={report.media.height}
          />
          <figcaption>{report.media.alt}</figcaption>
        </figure>
        <section className="admin-section">
          <h2>{report.references.length.toLocaleString('fa-IR')} ارجاع</h2>
          {report.references.length > 0 ? (
            <ul className="media-reference-list">
              {report.references.map((reference) => (
                <li key={`${reference.ownerType}-${reference.ownerId}-${reference.field}`}>
                  <strong>{reference.ownerType}</strong>
                  <bdi dir="ltr">{reference.ownerId}</bdi>
                  <span>{reference.field}</span>
                  {reference.historical ? <small>تاریخی و تغییرناپذیر</small> : <small>فعال</small>}
                </li>
              ))}
            </ul>
          ) : (
            <p>این رسانه هیچ ارجاع فعالی یا تاریخی ندارد.</p>
          )}
          <form action={deleteEditorialMediaAction.bind(null, id)}>
            <button className="admin-danger" type="submit" disabled={!report.canDelete}>
              {report.canDelete ? 'حذف رسانهٔ بدون ارجاع' : 'حذف به‌دلیل ارجاع‌ها مسدود است'}
            </button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
