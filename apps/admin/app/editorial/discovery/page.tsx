import { updateDiscoveryAction } from '../../actions';
import { AdminShell } from '../../../components/admin-shell';
import { listCategories, listMedia } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function DiscoveryAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [categories, media, parameters] = await Promise.all([
    listCategories(),
    listMedia(),
    searchParams,
  ]);
  const occasions = categories.filter((item) => item.discoveryKind === 'occasion');
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Discovery</p>
          <h1>کشف بر اساس موقعیت</h1>
        </div>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          محتوای موقعیت و SEO ذخیره شد.
        </div>
      ) : null}
      <p className="admin-lead">
        این فرم دستهٔ کاتالوگ را به روایت موقعیتی متصل می‌کند؛ موجودی یا قیمت جداگانه ساخته نمی‌شود.
      </p>
      {occasions.map((occasion) => (
        <form
          className="editorial-builder"
          action={updateDiscoveryAction.bind(null, occasion.id, occasion.version)}
          key={occasion.id}
        >
          <fieldset>
            <legend>{occasion.name}</legend>
            <div className="compact-form">
              <div className="inline-fields">
                <label>
                  نام
                  <input name="name" defaultValue={occasion.name} required />
                </label>
                <label>
                  Slug
                  <input dir="ltr" name="slug" defaultValue={occasion.slug} required />
                </label>
              </div>
              <label>
                توضیح کاتالوگ
                <textarea name="description" defaultValue={occasion.description ?? ''} rows={2} />
              </label>
              <label>
                عنوان تحریریه
                <input name="editorialTitle" defaultValue={occasion.editorialTitle ?? ''} />
              </label>
              <label>
                روایت موقعیت
                <textarea
                  name="editorialDescription"
                  defaultValue={occasion.editorialDescription ?? ''}
                  rows={4}
                />
              </label>
              <label>
                تصویر قهرمان
                <select name="heroMediaId" defaultValue={occasion.heroMediaId ?? ''}>
                  <option value="">انتخاب نشده</option>
                  {media.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.alt}
                    </option>
                  ))}
                </select>
              </label>
              <div className="inline-fields">
                <label>
                  ترتیب
                  <input
                    type="number"
                    min={0}
                    name="displayOrder"
                    defaultValue={occasion.displayOrder}
                  />
                </label>
                <label>
                  وضعیت
                  <select name="status" defaultValue={occasion.status}>
                    <option value="draft">پیش‌نویس</option>
                    <option value="published">منتشرشده</option>
                    <option value="archived">بایگانی</option>
                  </select>
                </label>
              </div>
              <label>
                عنوان SEO
                <input name="seoTitle" defaultValue={occasion.seoTitle ?? ''} />
              </label>
              <label>
                توضیح SEO
                <textarea
                  name="seoDescription"
                  defaultValue={occasion.seoDescription ?? ''}
                  rows={3}
                />
              </label>
            </div>
          </fieldset>
          <button className="admin-primary" type="submit">
            ذخیرهٔ موقعیت
          </button>
        </form>
      ))}
      {occasions.length === 0 ? (
        <div className="admin-empty">
          <h2>موقعیتی تعریف نشده است</h2>
          <p>ابتدا دسته‌ای با discoveryKind موقعیت از قرارداد مدیریت ایجاد کنید.</p>
        </div>
      ) : null}
    </AdminShell>
  );
}
