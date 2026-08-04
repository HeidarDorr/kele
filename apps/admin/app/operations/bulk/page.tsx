import { AdminShell } from '../../../components/admin-shell';
import { applyBulkAction, previewBulkAction } from '../../actions';
import { getBulkOperation } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function BulkPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const operation = query.preview ? await getBulkOperation(query.preview).catch(() => null) : null;
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Operations / Bulk</p>
          <h1>عملیات گروهی امن</h1>
          <span>پیش‌نمایش اجباری، اعتبارسنجی نسخه و گزارش شکست جزئی</span>
        </div>
      </header>
      {query.notice ? (
        <p className="admin-success" role="status">
          عملیات اعمال شد؛ نتیجهٔ هر ردیف در پایین ثبت شده است.
        </p>
      ) : null}
      <form className="admin-form" action={previewBulkAction}>
        <fieldset>
          <legend>تعریف پیش‌نمایش</legend>
          <div className="form-grid">
            <label>
              نوع
              <select name="kind" defaultValue="inventory">
                <option value="inventory">موجودی</option>
                <option value="price">قیمت</option>
              </select>
            </label>
            <label>
              شناسه SKUها
              <textarea name="skuIds" required placeholder="UUIDها با فاصله یا ویرگول" />
            </label>
            <label>
              مقدار
              <input name="value" type="number" required />
            </label>
            <label>
              کنش موجودی
              <select name="inventoryAction">
                <option value="production">تولید</option>
                <option value="manual_correction">اصلاح دستی</option>
                <option value="damaged_goods">کالای آسیب‌دیده</option>
              </select>
            </label>
            <label>
              تغییر قیمت
              <select name="adjustmentType">
                <option value="fixed_amount">مبلغ ثابت</option>
                <option value="percentage_increase">درصد افزایش</option>
                <option value="percentage_decrease">درصد کاهش</option>
              </select>
            </label>
            <label>
              دلیل
              <textarea name="reason" required minLength={3} />
            </label>
          </div>
          <button className="admin-primary">ساخت پیش‌نمایش بدون تغییر داده</button>
        </fieldset>
      </form>
      {operation ? (
        <section className="admin-section">
          <h2>پیش‌نمایش {operation.kind}</h2>
          <p>
            وضعیت: {operation.status} · {operation.summary.total.toLocaleString('fa-IR')} هدف ·
            انقضا{' '}
            {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(
              new Date(operation.expiresAt),
            )}
          </p>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>قبل</th>
                  <th>پیشنهاد</th>
                  <th>نتیجه</th>
                </tr>
              </thead>
              <tbody>
                {operation.items.map((item) => (
                  <tr key={item.skuId}>
                    <td>
                      <bdi>{item.skuCode}</bdi>
                    </td>
                    <td>{item.beforeValue.toLocaleString('fa-IR')}</td>
                    <td>{item.proposedValue.toLocaleString('fa-IR')}</td>
                    <td>
                      {item.status}
                      {item.failureCode ? ` · ${item.failureCode}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {operation.status === 'previewed' ? (
            <form action={applyBulkAction.bind(null, operation.id, operation.version)}>
              <button className="admin-primary">اعمال همین پیش‌نمایش اعتبارسنجی‌شده</button>
            </form>
          ) : null}
        </section>
      ) : null}
    </AdminShell>
  );
}
