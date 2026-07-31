import Link from 'next/link';
import { applyInventoryAction, publishProductAction, updateProductAction } from '../../../actions';
import { AdminShell } from '../../../../components/admin-shell';
import { ProductForm } from '../../../../components/product-form';
import { getProduct, listCategories, listMedia, validateProduct } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

const noticeMessages: Record<string, string> = {
  created: 'پیش‌نویس ساخته شد.',
  updated: 'ویرایش ذخیره شد.',
  published: 'محصول منتشر شد و اکنون در فروشگاه قابل مشاهده است.',
  inventory: 'اقدام موجودی ثبت شد.',
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [product, categories, media, validation] = await Promise.all([
    getProduct(id),
    listCategories(),
    listMedia(),
    validateProduct(id),
  ]);
  const variant = product.variants[0];
  const sku = variant?.skus[0];
  if (!variant || !sku) {
    throw new Error('Product aggregate does not contain an editable variant and SKU.');
  }
  const updateAction = updateProductAction.bind(
    null,
    product.id,
    product.version,
    variant.id ?? '',
    sku.id ?? '',
  );
  const notice = query.notice ? noticeMessages[query.notice] : undefined;

  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Catalog / Product</p>
          <h1>{product.name}</h1>
          <p>
            وضعیت: <span className={`status status-${product.status}`}>{product.status}</span>
            {' / '}
            نسخه {product.version.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="heading-actions">
          <Link className="admin-secondary" href={`/products/${product.id}/preview`}>
            پیش‌نمایش
          </Link>
          <form action={publishProductAction.bind(null, product.id)}>
            <button className="admin-primary" type="submit" disabled={!validation.valid}>
              انتشار
            </button>
          </form>
        </div>
      </header>
      {notice ? (
        <div className="admin-success" role="status">
          {notice}
        </div>
      ) : null}

      <section
        className={validation.valid ? 'validation-box valid' : 'validation-box invalid'}
        aria-labelledby="validation-title"
      >
        <h2 id="validation-title">
          {validation.valid ? 'آمادهٔ انتشار' : 'موارد لازم برای انتشار'}
        </h2>
        {validation.errors.length > 0 ? (
          <ul>
            {validation.errors.map((error) => (
              <li key={`${error.path}-${error.ruleId}`}>
                <bdi dir="ltr">{error.ruleId}</bdi>
                <span>{error.message}</span>
                <code dir="ltr">{error.path}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>همهٔ قواعد انتشار این برش برقرارند.</p>
        )}
      </section>

      <ProductForm action={updateAction} categories={categories} media={media} product={product} />

      <section className="admin-section inventory-action" aria-labelledby="inventory-title">
        <h2 id="inventory-title">اقدام موجودی</h2>
        <p>
          SKU: <bdi dir="ltr">{sku.code}</bdi>
        </p>
        <form action={applyInventoryAction.bind(null, sku.id ?? '')}>
          <input type="hidden" name="productId" value={product.id} />
          <label>
            اقدام
            <select name="action" defaultValue="production">
              <option value="production">افزایش تولید</option>
              <option value="manual_correction">اصلاح کاهشی</option>
              <option value="damaged_goods">کالای آسیب‌دیده</option>
            </select>
          </label>
          <label>
            تعداد
            <input name="quantity" type="number" min={1} step={1} required />
          </label>
          <label>
            دلیل
            <input name="reason" minLength={3} maxLength={500} required />
          </label>
          <button className="admin-secondary" type="submit">
            ثبت اقدام
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
