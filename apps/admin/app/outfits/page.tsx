import Link from 'next/link';
import { AdminShell } from '../../components/admin-shell';
import { listOutfits } from '../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function AdminOutfitsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const query = await searchParams;
  const outfits = await listOutfits();
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Commerce / Outfit</p>
          <h1>استایل‌ها</h1>
          <span>ترکیب، نگاشت اندازه و تاریخچهٔ انتشار مستقل</span>
        </div>
        <Link className="admin-primary" href="/outfits/new">
          استایل تازه
        </Link>
      </header>
      {query.notice ? (
        <div className="admin-success" role="status">
          تغییر استایل با موفقیت ثبت شد.
        </div>
      ) : null}
      <section className="admin-section" aria-labelledby="outfits-admin-title">
        <h2 id="outfits-admin-title">فهرست Outfit</h2>
        {outfits.items.length === 0 ? (
          <div className="admin-empty-state">
            هنوز استایلی تعریف نشده است. ابتدا اجزا و نگاشت همهٔ اندازه‌ها را آماده کنید.
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>استایل</th>
                  <th>وضعیت</th>
                  <th>ویرایش</th>
                  <th>اندازه‌ها</th>
                  <th>نسخه</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {outfits.items.map((outfit) => (
                  <tr key={outfit.id}>
                    <td>{outfit.name}</td>
                    <td>
                      <span className={`status status-${outfit.status}`}>{outfit.status}</span>
                    </td>
                    <td>
                      {outfit.revisionNumber.toLocaleString('fa-IR')} · {outfit.revisionState}
                    </td>
                    <td>{outfit.sizes.length.toLocaleString('fa-IR')}</td>
                    <td>{outfit.version.toLocaleString('fa-IR')}</td>
                    <td>
                      <Link href={`/outfits/${outfit.id}/edit`}>بازکردن</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
