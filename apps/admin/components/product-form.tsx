'use client';

import { useActionState } from 'react';
import type { AdminCategory, AdminProduct, MediaValue } from '../lib/admin-api';
import type { ActionState } from '../app/actions';

type ProductAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

const initialActionState: ActionState = { status: 'idle', message: '' };

export function ProductForm({
  action,
  categories,
  media,
  product,
}: {
  action: ProductAction;
  categories: AdminCategory[];
  media: MediaValue[];
  product?: AdminProduct;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const variant = product?.variants[0];
  const sku = variant?.skus[0];

  return (
    <form className="admin-form" action={formAction}>
      {state.status === 'error' ? (
        <div className="form-error" role="alert">
          {state.message}
        </div>
      ) : null}
      <fieldset>
        <legend>هویت محصول</legend>
        <div className="form-grid">
          <label>
            نام محصول
            <input name="name" required maxLength={180} defaultValue={product?.name} />
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              dir="ltr"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={product?.slug}
            />
          </label>
          <label className="full-field">
            توضیح
            <textarea
              name="description"
              required
              rows={4}
              maxLength={10_000}
              defaultValue={product?.description}
            />
          </label>
          <label className="full-field">
            جزئیات، هر مورد در یک خط
            <textarea name="details" rows={3} defaultValue={product?.details?.join('\n')} />
          </label>
          <label>
            عنوان SEO
            <input name="seoTitle" maxLength={180} defaultValue={product?.seo?.title ?? ''} />
          </label>
          <label>
            توضیح SEO
            <input
              name="seoDescription"
              maxLength={320}
              defaultValue={product?.seo?.description ?? ''}
            />
          </label>
          <label className="full-field">
            دسته‌بندی
            <select
              name="categoryIds"
              multiple
              required
              size={Math.min(4, Math.max(2, categories.length))}
              defaultValue={product?.categoryIds}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.status})
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>تنوع رنگ و تصویر</legend>
        <div className="form-grid">
          <label>
            نام رنگ
            <input name="variantName" required defaultValue={variant?.name} />
          </label>
          <label>
            کد نرمال رنگ
            <input
              name="normalizedColorCode"
              required
              dir="ltr"
              pattern="[a-z0-9][a-z0-9_-]*"
              defaultValue={variant?.normalizedColorCode}
            />
          </label>
          <label>
            رنگ نمایشی
            <input name="hex" type="color" defaultValue={variant?.hex ?? '#d4c2a8'} />
          </label>
          <label className="full-field">
            تصاویر، مورد نخست تصویر شاخص است
            <select
              name="mediaIds"
              multiple
              required
              size={Math.min(5, Math.max(3, media.length))}
              defaultValue={variant?.mediaIds}
            >
              {media.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.alt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>SKU، قیمت و موجودی اولیه</legend>
        <div className="form-grid">
          <label>
            کد SKU
            <input
              name="skuCode"
              required
              dir="ltr"
              pattern="[A-Z0-9][A-Z0-9_-]{2,63}"
              defaultValue={sku?.code}
              readOnly={Boolean(product)}
            />
          </label>
          <label>
            اندازهٔ نرمال
            <input name="normalizedSize" required dir="ltr" defaultValue={sku?.normalizedSize} />
          </label>
          <label>
            اندازهٔ نمایشی
            <input name="displaySize" required defaultValue={sku?.displaySize} />
          </label>
          <label>
            قیمت به ریال
            <input
              name="amountRial"
              required
              type="number"
              min={1}
              step={1}
              dir="ltr"
              defaultValue={sku?.amountRial}
            />
          </label>
          <label>
            موجودی فیزیکی
            <input
              name="physicalQuantity"
              required
              type="number"
              min={0}
              step={1}
              dir="ltr"
              defaultValue={sku?.physicalQuantity ?? 0}
              readOnly={Boolean(product)}
              aria-describedby={product ? 'inventory-help' : undefined}
            />
            {product ? (
              <small id="inventory-help">تغییر موجودی از فرم اقدام موجودی انجام می‌شود.</small>
            ) : null}
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button className="admin-primary" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره' : product ? 'ذخیرهٔ ویرایش' : 'ساخت پیش‌نویس'}
        </button>
        <span aria-live="polite">{pending ? 'درخواست در حال پردازش است.' : ''}</span>
      </div>
    </form>
  );
}
