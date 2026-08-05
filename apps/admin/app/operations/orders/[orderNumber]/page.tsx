import { AdminShell } from '../../../../components/admin-shell';
import { PendingSubmitButton } from '../../../../components/pending-submit-button';
import { retryRefundAction, reviseTrackingAction, transitionOrderAction } from '../../../actions';
import { getAdminOrder } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

const labels: Record<string, string> = {
  paid: 'پرداخت‌شده',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  returned: 'مرجوع‌شده',
};

export default async function OperationsOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ notice?: string; transition?: string }>;
}) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);
  const order = await getAdminOrder(orderNumber);
  const next =
    order.fulfillmentStatus === 'paid'
      ? 'preparing'
      : order.fulfillmentStatus === 'preparing'
        ? 'shipped'
        : order.fulfillmentStatus === 'shipped'
          ? 'delivered'
          : null;

  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Operations / Order</p>
          <h1>
            <bdi>{order.orderNumber}</bdi>
          </h1>
          <span>
            {labels[order.fulfillmentStatus]} · نسخه {order.version.toLocaleString('fa-IR')}
          </span>
        </div>
      </header>
      {query.notice ? (
        <p className="admin-success" data-transition={query.transition} role="status">
          عملیات با موفقیت ثبت و تاریخچه به‌روزرسانی شد.
        </p>
      ) : null}
      <div className="admin-two-column operations-grid">
        <section className="admin-section">
          <h2>اقلام و تحویل</h2>
          <ul className="operations-list">
            {order.items.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.selection}</span>
                <span>
                  {item.quantity.toLocaleString('fa-IR')} عدد · {item.lineTotal.display}
                </span>
              </li>
            ))}
          </ul>
          <p>
            {order.address.recipientName} — {order.address.province}، {order.address.city}،{' '}
            {order.address.addressLine}
          </p>
          <strong>جمع پرداخت: {order.paidTotal.display}</strong>
        </section>
        <section className="admin-section">
          <h2>کنترل گذار</h2>
          {next ? (
            <form
              className="admin-form compact-form"
              action={transitionOrderAction.bind(null, order.orderNumber, order.version)}
            >
              <input type="hidden" name="toStatus" value={next} />
              <label>
                دلیل عملیاتی
                <textarea
                  name="reason"
                  required
                  minLength={3}
                  defaultValue={`تأیید گذار به ${labels[next] ?? next}`}
                />
              </label>
              {next === 'shipped' ? (
                <>
                  <label>
                    حامل
                    <input name="carrier" required minLength={2} />
                  </label>
                  <label>
                    کد رهگیری
                    <input name="trackingNumber" required minLength={2} dir="ltr" />
                  </label>
                  <label>
                    پیوند رهگیری
                    <input name="trackingUrl" type="url" dir="ltr" />
                  </label>
                </>
              ) : null}
              <PendingSubmitButton
                className="admin-primary"
                label={`ثبت «${labels[next] ?? next}»`}
                pendingLabel="در حال ثبت گذار…"
              />
            </form>
          ) : (
            <p className="admin-note">این سفارش گذار اجرایی بعدی ندارد.</p>
          )}
          {['paid', 'preparing'].includes(order.fulfillmentStatus) ? (
            <form
              className="admin-form compact-form danger-form"
              action={transitionOrderAction.bind(null, order.orderNumber, order.version)}
            >
              <input type="hidden" name="toStatus" value="cancelled" />
              <label>
                دلیل لغو
                <textarea name="reason" required minLength={3} />
              </label>
              <PendingSubmitButton
                className="admin-secondary"
                label="لغو و درخواست بازپرداخت"
                pendingLabel="در حال ثبت لغو…"
              />
            </form>
          ) : null}
        </section>
      </div>
      {order.tracking ? (
        <section className="admin-section">
          <h2>رهگیری فعلی</h2>
          <p>
            {order.tracking.carrier} · <bdi>{order.tracking.trackingNumber}</bdi>
          </p>
          <form
            className="admin-filter-bar"
            action={reviseTrackingAction.bind(null, order.orderNumber, order.version)}
          >
            <label>
              حامل
              <input name="carrier" defaultValue={order.tracking.carrier} required />
            </label>
            <label>
              کد
              <input
                name="trackingNumber"
                defaultValue={order.tracking.trackingNumber}
                required
                dir="ltr"
              />
            </label>
            <label>
              پیوند
              <input
                name="trackingUrl"
                defaultValue={order.tracking.trackingUrl ?? ''}
                type="url"
                dir="ltr"
              />
            </label>
            <label>
              دلیل
              <input name="reason" required defaultValue="اصلاح اطلاعات رهگیری" />
            </label>
            <button className="admin-secondary">ثبت نسخهٔ تازه</button>
          </form>
        </section>
      ) : null}
      <section className="admin-section">
        <h2>خط زمانی غیرقابل‌تغییر</h2>
        <ol className="audit-timeline">
          {order.timeline.map((event) => (
            <li key={event.id}>
              <time>
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                  timeZone: 'Asia/Tehran',
                }).format(new Date(event.occurredAt))}
              </time>
              <strong>{event.type}</strong>
              <span>
                {event.fromStatus ?? '—'} ← {event.toStatus ?? '—'} · {event.reason ?? 'بدون توضیح'}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {order.refunds.length > 0 ? (
        <section className="admin-section">
          <h2>بازپرداخت‌ها</h2>
          {order.refunds.map((refund) => (
            <div className="refund-row" key={refund.id}>
              <span>
                {refund.amount.display} · {refund.status}
              </span>
              {refund.status !== 'confirmed' ? (
                <form action={retryRefundAction.bind(null, refund.id, order.orderNumber)}>
                  <button className="admin-secondary">تلاش مجدد امن</button>
                </form>
              ) : (
                <bdi>{refund.providerReference}</bdi>
              )}
            </div>
          ))}
        </section>
      ) : null}
    </AdminShell>
  );
}
