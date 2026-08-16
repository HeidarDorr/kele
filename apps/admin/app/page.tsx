import Link from 'next/link';
import { createCategoryAction } from './actions';
import { AdminShell } from '../components/admin-shell';
import { listCategories, listMedia, listProducts } from '../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const parameters = await searchParams;
  const [products, categories, media] = await Promise.all([
    listProducts(),
    listCategories(),
    listMedia(),
  ]);

  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Commerce / Catalog</p>
          <h1>محصولات</h1>
        </div>
        <Link className="admin-primary" href="/products/new">
          محصول تازه
        </Link>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          تغییر با موفقیت ثبت شد.
        </div>
      ) : null}
      <section className="admin-section" aria-labelledby="products-title">
        <h2 id="products-title">فهرست کاتالوگ</h2>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>محصول</th>
                <th>وضعیت</th>
                <th>Slug</th>
                <th>نسخه</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {products.items.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>
                    <span className={`status status-${product.status}`}>{product.status}</span>
                  </td>
                  <td>
                    <bdi dir="ltr">{product.slug}</bdi>
                  </td>
                  <td>{product.version.toLocaleString('fa-IR')}</td>
                  <td>
                    <Link href={`/products/${product.id}/edit`}>بازکردن</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="admin-two-column">
        <section className="admin-section" aria-labelledby="category-create-title">
          <h2 id="category-create-title">دستهٔ تازه</h2>
          <form className="compact-form" action={createCategoryAction}>
            <label>
              نام
              <input name="name" required maxLength={120} />
            </label>
            <label>
              Slug
              <input name="slug" required dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
            </label>
            <label>
              توضیح
              <textarea name="description" rows={2} />
            </label>
            <label>
              ترتیب
              <input name="displayOrder" type="number" min={0} defaultValue={20} />
            </label>
            <label>
              وضعیت
              <select name="status" defaultValue="published">
                <option value="draft">پیش‌نویس</option>
                <option value="published">منتشرشده</option>
              </select>
            </label>
            <button className="admin-secondary" type="submit">
              ثبت دسته
            </button>
          </form>
          <p className="admin-note">
            {categories.length.toLocaleString('fa-IR')} دسته در سامانه وجود دارد.
          </p>
        </section>

        <section className="admin-section" aria-labelledby="media-create-title">
          <h2 id="media-create-title">کتابخانهٔ رسانه</h2>
          <p className="admin-note">
            فایل را در کتابخانه بارگذاری کنید؛ پیش‌نمایش، گروه، رنگ و نقطهٔ کانونی همان‌جا ثبت
            می‌شوند و سپس در فرم محصول قابل انتخاب‌اند.
          </p>
          <Link className="admin-secondary" href="/editorial/media">
            باز کردن رسانه‌ها
          </Link>
          <p className="admin-note">
            {media.length.toLocaleString('fa-IR')} دارایی قابل استفاده وجود دارد.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
