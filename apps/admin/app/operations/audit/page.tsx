import { AdminShell } from '../../../components/admin-shell';
import { listAuditEvents } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const parameters = new URLSearchParams();
  for (const key of ['search', 'eventType', 'actor', 'entityType', 'entityId', 'from', 'to'])
    if (query[key]) parameters.set(key, query[key]);
  const result =
    query.state === 'error' ? null : await listAuditEvents(parameters.toString()).catch(() => null);
  const items = query.state === 'empty' ? [] : (result?.items ?? []);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Operations / Audit</p>
          <h1>کاوش رویدادها</h1>
          <span>جست‌وجوی حقایق تاریخی بر پایهٔ کنشگر، نوع و هم‌بستگی</span>
        </div>
      </header>
      <form className="admin-filter-bar" method="get">
        <label>
          متن
          <input name="search" defaultValue={query.search} />
        </label>
        <label>
          نوع رویداد
          <input name="eventType" defaultValue={query.eventType} />
        </label>
        <label>
          کنشگر
          <input name="actor" defaultValue={query.actor} />
        </label>
        <label>
          نوع موجودیت
          <input name="entityType" defaultValue={query.entityType} />
        </label>
        <button className="admin-secondary">جست‌وجو</button>
      </form>
      {result === null ? (
        <p className="admin-error" role="alert">
          بازیابی رویدادها ممکن نشد.
        </p>
      ) : items.length === 0 ? (
        <p className="admin-empty-state">رویدادی مطابق فیلتر پیدا نشد.</p>
      ) : (
        <ol className="audit-timeline admin-section">
          {items.map((event) => (
            <li key={event.id}>
              <time>
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                }).format(new Date(event.occurredAt))}
              </time>
              <strong>{event.eventType}</strong>
              <span>
                {event.entityType} / <bdi>{event.entityId}</bdi> · {event.actorId}
              </span>
              <details>
                <summary>دادهٔ ممیزی</summary>
                <pre dir="ltr">{JSON.stringify(event.payload, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </AdminShell>
  );
}
