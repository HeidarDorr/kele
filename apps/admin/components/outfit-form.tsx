'use client';

import { useActionState, useMemo, useState } from 'react';
import type { ActionState } from '../app/actions';
import type { AdminCategory, AdminOutfit, AdminProduct, MediaValue } from '../lib/admin-api';

type OutfitAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;
type EditorItem = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
};
type EditorSize = {
  localId: string;
  code: string;
  label: string;
  amountRial: number;
  skuByItem: Record<string, string>;
};

const initialActionState: ActionState = { status: 'idle', message: '' };

export function OutfitForm({
  action,
  categories,
  media,
  products,
  outfit,
}: {
  action: OutfitAction;
  categories: AdminCategory[];
  media: MediaValue[];
  products: AdminProduct[];
  outfit?: AdminOutfit;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [items, setItems] = useState<EditorItem[]>(
    () =>
      outfit?.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.defaultColorVariantId,
        quantity: item.quantity,
      })) ?? [],
  );
  const [sizes, setSizes] = useState<EditorSize[]>(
    () =>
      outfit?.sizes.map((size, index) => ({
        localId: `${size.code}-${String(index)}`,
        code: size.code,
        label: size.label,
        amountRial: size.amountRial,
        skuByItem: Object.fromEntries(
          size.components.map((component) => [component.outfitItemId, component.skuId]),
        ),
      })) ?? [],
  );

  const selected = useMemo(
    () =>
      new Map(
        items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          const variant = product?.variants.find((candidate) => candidate.id === item.variantId);
          return [item.id, { product, variant }] as const;
        }),
      ),
    [items, products],
  );
  const orderedMedia = useMemo(() => {
    const existingOrder = new Map(outfit?.mediaIds.map((id, index) => [id, index]) ?? []);
    return media
      .map((asset, sourceIndex) => ({ asset, sourceIndex }))
      .sort((left, right) => {
        const leftIndex = existingOrder.get(left.asset.id);
        const rightIndex = existingOrder.get(right.asset.id);
        if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
        if (leftIndex !== undefined) return -1;
        if (rightIndex !== undefined) return 1;
        return left.sourceIndex - right.sourceIndex;
      })
      .map(({ asset }) => asset);
  }, [media, outfit]);
  const model = JSON.stringify({
    items: items.map((item, displayOrder) => ({
      id: item.id,
      productId: item.productId,
      defaultColorVariantId: item.variantId,
      quantity: item.quantity,
      displayOrder,
    })),
    sizes: sizes.map((size, displayOrder) => ({
      code: size.code,
      label: size.label,
      amountRial: size.amountRial,
      displayOrder,
      components: items.map((item, componentOrder) => ({
        outfitItemId: item.id,
        skuId: size.skuByItem[item.id] ?? '',
        quantity: item.quantity,
        displayOrder: componentOrder,
      })),
    })),
  });

  function addItem() {
    const product = products.find((candidate) => candidate.variants.some((variant) => variant.id));
    const variant = product?.variants.find((candidate) => candidate.id);
    if (!product || !variant?.id) return;
    const variantId = variant.id;
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), productId: product.id, variantId, quantity: 1 },
    ]);
  }

  return (
    <form className="admin-form outfit-admin-form" action={formAction}>
      <input type="hidden" name="outfitModel" value={model} />
      {state.status === 'error' ? (
        <div className="form-error" role="alert">
          {state.message}
        </div>
      ) : null}

      <fieldset>
        <legend>هویت تجاری استایل</legend>
        <div className="form-grid">
          <label>
            نام استایل
            <input name="name" required maxLength={180} defaultValue={outfit?.name} />
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              dir="ltr"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              defaultValue={outfit?.slug}
            />
          </label>
          <label className="full-field">
            روایت استایل
            <textarea
              name="description"
              required
              rows={5}
              maxLength={10_000}
              defaultValue={outfit?.description}
            />
          </label>
          <label>
            عنوان SEO
            <input name="seoTitle" maxLength={180} defaultValue={outfit?.seo?.title ?? ''} />
          </label>
          <label>
            توضیح SEO
            <input
              name="seoDescription"
              maxLength={320}
              defaultValue={outfit?.seo?.description ?? ''}
            />
          </label>
          <label>
            دسته‌بندی
            <select name="categoryIds" multiple required defaultValue={outfit?.categoryIds}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.status})
                </option>
              ))}
            </select>
          </label>
          <label>
            تصاویر سردبیری؛ نخستین مورد تصویر شاخص است
            <select name="mediaIds" multiple required defaultValue={outfit?.mediaIds}>
              {orderedMedia.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.alt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset>
        <div className="outfit-fieldset-heading">
          <div>
            <legend>اجزای ثابت و رنگ پیش‌فرض</legend>
            <p>هر محصول یک‌بار تعریف می‌شود؛ اندازهٔ دقیق SKU در جدول بعدی انتخاب می‌شود.</p>
          </div>
          <button className="admin-secondary" type="button" onClick={addItem}>
            افزودن جزء
          </button>
        </div>
        {items.length === 0 ? (
          <div className="admin-empty-state">برای شروع، دست‌کم یک محصول منتشرشده اضافه کنید.</div>
        ) : (
          <ol className="outfit-editor-list">
            {items.map((item, index) => {
              const product = selected.get(item.id)?.product;
              const variants = product?.variants.filter((variant) => variant.id) ?? [];
              return (
                <li key={item.id}>
                  <span>{(index + 1).toLocaleString('fa-IR')}</span>
                  <label>
                    محصول
                    <select
                      value={item.productId}
                      onChange={(event) => {
                        const nextProduct = products.find(
                          (candidate) => candidate.id === event.target.value,
                        );
                        const nextVariant = nextProduct?.variants.find((variant) => variant.id);
                        if (!nextVariant?.id) return;
                        const nextVariantId = nextVariant.id;
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.id === item.id
                              ? {
                                  ...candidate,
                                  productId: event.target.value,
                                  variantId: nextVariantId,
                                }
                              : candidate,
                          ),
                        );
                      }}
                    >
                      {products.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name} ({candidate.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    رنگ پیش‌فرض
                    <select
                      value={item.variantId}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, variantId: event.target.value }
                              : candidate,
                          ),
                        );
                      }}
                    >
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.name} ({variant.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    تعداد در استایل
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={item.quantity}
                      onChange={(event) => {
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, quantity: Number(event.target.value) }
                              : candidate,
                          ),
                        );
                      }}
                    />
                  </label>
                  <button
                    className="text-danger"
                    type="button"
                    onClick={() => {
                      setItems((current) => current.filter(({ id }) => id !== item.id));
                    }}
                  >
                    حذف جزء
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </fieldset>

      <fieldset>
        <div className="outfit-fieldset-heading">
          <div>
            <legend>نگاشت دقیق اندازه به SKU</legend>
            <p>برچسب اندازهٔ استایل لازم نیست با اندازهٔ هیچ جزء برابر باشد.</p>
          </div>
          <button
            className="admin-secondary"
            type="button"
            disabled={items.length === 0}
            onClick={() => {
              setSizes((current) => [
                ...current,
                {
                  localId: crypto.randomUUID(),
                  code: `SIZE-${String(current.length + 1)}`,
                  label: `اندازهٔ ${String(current.length + 1)}`,
                  amountRial: 1,
                  skuByItem: {},
                },
              ]);
            }}
          >
            افزودن اندازه
          </button>
        </div>
        {sizes.length === 0 ? (
          <div className="admin-empty-state">
            هنوز اندازهٔ قابل فروش و نگاشت SKU تعریف نشده است.
          </div>
        ) : (
          <div className="outfit-size-editor">
            {sizes.map((size, sizeIndex) => (
              <section key={size.localId} aria-labelledby={`size-${size.localId}`}>
                <header>
                  <h3 id={`size-${size.localId}`}>
                    اندازهٔ {(sizeIndex + 1).toLocaleString('fa-IR')}
                  </h3>
                  <button
                    className="text-danger"
                    type="button"
                    onClick={() => {
                      setSizes((current) =>
                        current.filter((candidate) => candidate.localId !== size.localId),
                      );
                    }}
                  >
                    حذف اندازه
                  </button>
                </header>
                <div className="form-grid">
                  <label>
                    کد پایدار
                    <input
                      dir="ltr"
                      value={size.code}
                      pattern="[A-Za-z0-9][A-Za-z0-9_-]*"
                      onChange={(event) => {
                        setSizes((current) =>
                          current.map((candidate) =>
                            candidate.localId === size.localId
                              ? { ...candidate, code: event.target.value }
                              : candidate,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label>
                    برچسب مشتری
                    <input
                      value={size.label}
                      onChange={(event) => {
                        setSizes((current) =>
                          current.map((candidate) =>
                            candidate.localId === size.localId
                              ? { ...candidate, label: event.target.value }
                              : candidate,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label>
                    قیمت مستقل به ریال
                    <input
                      dir="ltr"
                      type="number"
                      min={1}
                      value={size.amountRial}
                      onChange={(event) => {
                        setSizes((current) =>
                          current.map((candidate) =>
                            candidate.localId === size.localId
                              ? { ...candidate, amountRial: Number(event.target.value) }
                              : candidate,
                          ),
                        );
                      }}
                    />
                  </label>
                </div>
                <div className="outfit-component-mapping">
                  {items.map((item) => {
                    const product = selected.get(item.id)?.product;
                    const variant = selected.get(item.id)?.variant;
                    return (
                      <label key={item.id}>
                        <span>
                          {product?.name ?? 'محصول نامعتبر'} · {variant?.name ?? 'رنگ نامعتبر'}
                        </span>
                        <select
                          required
                          value={size.skuByItem[item.id] ?? ''}
                          onChange={(event) => {
                            setSizes((current) =>
                              current.map((candidate) =>
                                candidate.localId === size.localId
                                  ? {
                                      ...candidate,
                                      skuByItem: {
                                        ...candidate.skuByItem,
                                        [item.id]: event.target.value,
                                      },
                                    }
                                  : candidate,
                              ),
                            );
                          }}
                        >
                          <option value="">انتخاب SKU دقیق</option>
                          {variant?.skus.map((sku) => (
                            <option key={sku.id} value={sku.id}>
                              {sku.displaySize} · {sku.code} ({sku.status})
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </fieldset>

      <div className="form-actions">
        <button
          className="admin-primary"
          type="submit"
          disabled={pending || items.length === 0 || sizes.length === 0}
        >
          {pending ? 'در حال ذخیره…' : outfit ? 'ذخیره در پیش‌نویس تازه' : 'ساخت پیش‌نویس'}
        </button>
        <span aria-live="polite">{pending ? 'نگاشت‌ها در حال اعتبارسنجی هستند.' : ''}</span>
      </div>
    </form>
  );
}
