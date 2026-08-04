import Link from 'next/link';
import { AdminShell } from '../../../components/admin-shell';
import { listAdminOrders } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  paid: 'پرداخت‌شده',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  returned: 'مرجوع‌شده',
};

export default async function OperationsOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; state?: string }>;
}) {
  const query = await searchParams;
  const parameters = new URLSearchParams();
  if (query.status) parameters.set('status', query.status);
  if (query.search) parameters.set('search', query.search);
  const result =
    query.state === 'error' ? null : await listAdminOrders(parameters.toString()).catch(() => null);
  const items = query.state === 'empty' ? [] : (result?.items ?? []);

  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Operations / Orders</p>
          <h1>عملیات سفارش</h1>
          <span>گذارهای صریح، رهگیری نسخه‌ای و تاریخچهٔ غیرقابل‌تغییر</span>
        </div>
      </header>
      <form className="admin-filter-bar" method="get" aria-label="جست‌وجوی سفارش‌ها">
        <label>
          جست‌وجو
          <input name="search" defaultValue={query.search} placeholder="شماره سفارش یا مشتری" />
        </label>
        <label>
          وضعیت
          <select name="status" defaultValue={query.status ?? ''}>
            <option value="">همه</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-secondary" type="submit">
          اعمال فیلتر
        </button>
      </form>
      {result === null ? (
        <section className="admin-error" role="alert">
          <strong>دریافت سفارش‌ها ممکن نشد.</strong> اتصال را بررسی و دوباره تلاش کنید.
        </section>
      ) : (
        <section className="admin-section" aria-labelledby="orders-table-title">
          <h2 id="orders-table-title">صف کار عملیاتی</h2>
          {items.length === 0 ? (
            <p className="admin-empty-state">سفارشی مطابق این فیلتر وجود ندارد.</p>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>سفارش</th>
                    <th>وضعیت</th>
                    <th>مبلغ</th>
                    <th>ثبت</th>
                    <th>عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((order) => (
                    <tr key={order.orderNumber}>
                      <td>
                        <bdi>{order.orderNumber}</bdi>
                      </td>
                      <td>
                        <span className={`status status-${order.fulfillmentStatus}`}>
                          {statusLabels[order.fulfillmentStatus]}
                        </span>
                      </td>
                      <td>{order.paidTotal.display}</td>
                      <td>
                        {new Intl.DateTimeFormat('fa-IR', {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Tehran',
                        }).format(new Date(order.createdAt))}
                      </td>
                      <td>
                        <Link href={`/operations/orders/${encodeURIComponent(order.orderNumber)}`}>
                          بررسی سفارش
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AdminShell>
  );
}
