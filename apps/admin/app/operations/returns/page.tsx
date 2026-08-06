import { AdminShell } from '../../../components/admin-shell';
import { decideReturnAction } from '../../actions';
import { listReturnRequests } from '../../../lib/admin-api';
import { getAcceptancePresentationState } from '../../../lib/acceptance-presentation-state.server';

export const dynamic = 'force-dynamic';

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const acceptanceState = await getAcceptancePresentationState(['empty', 'error'] as const);
  const result =
    acceptanceState === 'error' ? null : await listReturnRequests(query.status).catch(() => null);
  const items = acceptanceState === 'empty' ? [] : (result?.items ?? []);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Operations / Returns</p>
          <h1>مرجوعی و بازپرداخت</h1>
          <span>اظهار مشتری، تأیید اپراتور و اثر موجودی قابل‌ردیابی</span>
        </div>
      </header>
      {query.notice ? (
        <p className="admin-success" role="status">
          تصمیم ثبت شد.
        </p>
      ) : null}
      {result === null ? (
        <p className="admin-error" role="alert">
          دریافت درخواست‌ها ممکن نشد.
        </p>
      ) : items.length === 0 ? (
        <p className="admin-empty-state">درخواستی در این صف وجود ندارد.</p>
      ) : (
        <div className="operations-cards">
          {items.map((request) => (
            <article className="admin-section" key={request.id}>
              <header>
                <div>
                  <h2>
                    <bdi>{request.orderNumber}</bdi>
                  </h2>
                  <p>
                    {request.status} · مهلت{' '}
                    {new Intl.DateTimeFormat('fa-IR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'Asia/Tehran',
                    }).format(new Date(request.eligibilityDeadline))}
                  </p>
                </div>
              </header>
              <p>{request.reason}</p>
              <ul>
                {request.items.map((item) => (
                  <li key={item.orderItemId}>
                    <bdi>{item.orderItemId}</bdi> · {item.quantity.toLocaleString('fa-IR')} عدد
                  </li>
                ))}
              </ul>
              {request.status === 'submitted' ? (
                <div className="decision-grid">
                  <form
                    className="compact-form"
                    action={decideReturnAction.bind(null, request.id, 'approve')}
                  >
                    <label>
                      دلیل تأیید
                      <input name="reason" required minLength={3} />
                    </label>
                    <button className="admin-primary">تأیید و شروع بازپرداخت</button>
                  </form>
                  <form
                    className="compact-form"
                    action={decideReturnAction.bind(null, request.id, 'reject')}
                  >
                    <label>
                      دلیل رد
                      <input name="reason" required minLength={3} />
                    </label>
                    <button className="admin-secondary">رد درخواست</button>
                  </form>
                </div>
              ) : (
                <p className="admin-note">
                  تصمیم: {request.decisionReason ?? 'در انتظار نتیجهٔ ارائه‌دهنده'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
