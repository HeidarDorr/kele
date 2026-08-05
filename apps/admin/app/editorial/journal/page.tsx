import Link from 'next/link';
import { AdminShell } from '../../../components/admin-shell';
import { listJournalDrafts } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function JournalAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [articles, parameters] = await Promise.all([listJournalDrafts(), searchParams]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Journal</p>
          <h1>ژورنال</h1>
        </div>
        <Link className="admin-primary" href="/editorial/journal/new">
          مقالهٔ تازه
        </Link>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          مقاله بایگانی شد و از مسیر عمومی کنار رفت.
        </div>
      ) : null}
      <section className="admin-section">
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>عنوان</th>
                <th>Slug</th>
                <th>وضعیت</th>
                <th>انتشارها</th>
                <th>نسخه</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article.id}>
                  <td>{article.title}</td>
                  <td>
                    <bdi dir="ltr">{article.slug}</bdi>
                  </td>
                  <td>
                    <span className={`status status-${article.status}`}>{article.status}</span>
                  </td>
                  <td>{article.publicationCount.toLocaleString('fa-IR')}</td>
                  <td>{article.version.toLocaleString('fa-IR')}</td>
                  <td>
                    <Link href={`/editorial/journal/${article.id}`}>ویرایش</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {articles.length === 0 ? (
          <div className="admin-empty">
            <h2>مقاله‌ای وجود ندارد</h2>
            <p>نخستین مقاله را به‌صورت پیش‌نویس و با بلوک‌های امن ایجاد کنید.</p>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
