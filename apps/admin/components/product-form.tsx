'use client';

import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import type { AdminCategory, AdminProduct, MediaValue } from '../lib/admin-api';
import type { ActionState } from '../app/actions';
import {
  validateProductMatrixMedia,
  type ProductMatrixValidationError,
} from './product-matrix-validation';

type ProductAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

type EditableSku = {
  key: string;
  id?: string;
  code: string;
  normalizedSize: string;
  displaySize: string;
  amountRial: number;
  physicalQuantity: number;
  status?: 'draft' | 'published' | 'archived';
};

type EditableVariant = {
  key: string;
  id?: string;
  name: string;
  normalizedColorCode: string;
  hex: string;
  mediaIds: string[];
  featuredMediaId: string;
  status?: 'draft' | 'published' | 'archived';
  skus: EditableSku[];
};

const initialActionState: ActionState = { status: 'idle', message: '' };

function clientKey(): string {
  return crypto.randomUUID();
}

function emptySku(): EditableSku {
  return {
    key: clientKey(),
    code: '',
    normalizedSize: '',
    displaySize: '',
    amountRial: 0,
    physicalQuantity: 0,
  };
}

function emptyVariant(): EditableVariant {
  return {
    key: clientKey(),
    name: '',
    normalizedColorCode: '',
    hex: '#d4c2a8',
    mediaIds: [],
    featuredMediaId: '',
    skus: [emptySku()],
  };
}

function initialVariants(product?: AdminProduct): EditableVariant[] {
  const editableVariants =
    product?.variants.filter((variant) => variant.status !== 'archived') ?? [];
  if (editableVariants.length === 0) return [emptyVariant()];
  return editableVariants.map((variant) => ({
    key: variant.id ?? clientKey(),
    ...(variant.id ? { id: variant.id } : {}),
    name: variant.name,
    normalizedColorCode: variant.normalizedColorCode,
    hex: variant.hex ?? '#d4c2a8',
    mediaIds: [...variant.mediaIds],
    featuredMediaId: variant.featuredMediaId,
    ...(variant.status ? { status: variant.status } : {}),
    skus: variant.skus
      .filter((sku) => sku.status !== 'archived')
      .map((sku) => ({
        key: sku.id ?? clientKey(),
        ...(sku.id ? { id: sku.id } : {}),
        code: sku.code,
        normalizedSize: sku.normalizedSize,
        displaySize: sku.displaySize,
        amountRial: sku.amountRial,
        physicalQuantity: sku.physicalQuantity,
        ...(sku.status ? { status: sku.status } : {}),
      })),
  }));
}

function serializedVariants(variants: EditableVariant[]) {
  return variants.map((variant, displayOrder) => ({
    ...(variant.id ? { id: variant.id } : {}),
    name: variant.name.trim(),
    normalizedColorCode: variant.normalizedColorCode.trim(),
    hex: variant.hex || null,
    displayOrder,
    mediaIds: variant.mediaIds,
    featuredMediaId: variant.featuredMediaId,
    ...(variant.status ? { status: variant.status } : {}),
    skus: variant.skus.map((sku) => ({
      ...(sku.id ? { id: sku.id } : {}),
      code: sku.code.trim().toUpperCase(),
      normalizedSize: sku.normalizedSize.trim(),
      displaySize: sku.displaySize.trim(),
      amountRial: sku.amountRial,
      physicalQuantity: sku.physicalQuantity,
      ...(sku.status ? { status: sku.status } : {}),
    })),
  }));
}

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
  const [variants, setVariants] = useState<EditableVariant[]>(() => initialVariants(product));
  const [matrixError, setMatrixError] = useState<ProductMatrixValidationError | null>(null);

  useEffect(() => {
    if (matrixError === null) return;
    document.getElementById(`variant-media-error-${String(matrixError.variantIndex)}`)?.focus();
  }, [matrixError]);

  function updateVariant(key: string, update: (variant: EditableVariant) => EditableVariant) {
    setMatrixError(null);
    setVariants((current) =>
      current.map((variant) => (variant.key === key ? update(variant) : variant)),
    );
  }

  return (
    <form
      className="admin-form product-matrix-form"
      action={formAction}
      onSubmit={(event) => {
        const error = validateProductMatrixMedia(variants);
        if (error === null) {
          setMatrixError(null);
          return;
        }
        event.preventDefault();
        setMatrixError(error);
      }}
    >
      <input
        name="productModel"
        type="hidden"
        value={JSON.stringify(serializedVariants(variants))}
      />
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
              size={Math.min(8, Math.max(3, categories.length))}
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

      <section className="variant-matrix" aria-labelledby="variant-matrix-title">
        <header>
          <div>
            <p>ColorVariant → Media → SKU</p>
            <h2 id="variant-matrix-title">رنگ، سایز و قیمت</h2>
          </div>
          <button
            className="admin-secondary"
            type="button"
            onClick={() => {
              setMatrixError(null);
              setVariants((current) => [...current, emptyVariant()]);
            }}
          >
            افزودن رنگ
          </button>
        </header>

        {variants.map((variant, variantIndex) => {
          const selectedMedia = variant.mediaIds
            .map((id) => media.find((item) => item.id === id))
            .filter((item): item is MediaValue => item !== undefined);
          return (
            <fieldset className="variant-editor" key={variant.key}>
              <legend>رنگ {(variantIndex + 1).toLocaleString('fa-IR')}</legend>
              <div className="variant-editor-heading">
                <div className="form-grid">
                  <label>
                    نام رنگ
                    <input
                      required
                      value={variant.name}
                      onChange={(event) => {
                        updateVariant(variant.key, (current) => ({
                          ...current,
                          name: event.target.value,
                        }));
                      }}
                    />
                  </label>
                  <label>
                    کد نرمال رنگ
                    <input
                      required
                      dir="ltr"
                      pattern="[a-z0-9][a-z0-9_-]*"
                      value={variant.normalizedColorCode}
                      onChange={(event) => {
                        updateVariant(variant.key, (current) => ({
                          ...current,
                          normalizedColorCode: event.target.value,
                        }));
                      }}
                    />
                  </label>
                  <label>
                    رنگ نمایشی
                    <span className="color-input-row">
                      <input
                        type="color"
                        value={variant.hex}
                        onChange={(event) => {
                          updateVariant(variant.key, (current) => ({
                            ...current,
                            hex: event.target.value,
                          }));
                        }}
                      />
                      <bdi dir="ltr">{variant.hex}</bdi>
                    </span>
                  </label>
                </div>
                <button
                  className="admin-danger-text"
                  type="button"
                  disabled={variants.length === 1}
                  onClick={() => {
                    setMatrixError(null);
                    setVariants((current) => current.filter((item) => item.key !== variant.key));
                  }}
                >
                  حذف این رنگ
                </button>
              </div>

              <div className="variant-media-section">
                <div>
                  <h3>تصاویر این رنگ</h3>
                  <p>تصویر شاخص را مشخص کنید؛ ترتیب انتخاب، ترتیب گالری محصول است.</p>
                </div>
                {matrixError?.variantIndex === variantIndex ? (
                  <p
                    className="form-error variant-media-error"
                    id={`variant-media-error-${String(variantIndex)}`}
                    role="alert"
                    tabIndex={-1}
                  >
                    {matrixError.message}
                  </p>
                ) : null}
                {media.length === 0 ? (
                  <p className="admin-empty-state">ابتدا از بخش رسانه‌ها تصویر بارگذاری کنید.</p>
                ) : (
                  <div className="media-picker-grid">
                    {media.map((item) => {
                      const selected = variant.mediaIds.includes(item.id);
                      const featured = variant.featuredMediaId === item.id;
                      return (
                        <article className={selected ? 'is-selected' : undefined} key={item.id}>
                          <label className="media-picker-select">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                updateVariant(variant.key, (current) => {
                                  const mediaIds = event.target.checked
                                    ? [...current.mediaIds, item.id]
                                    : current.mediaIds.filter((id) => id !== item.id);
                                  return {
                                    ...current,
                                    mediaIds,
                                    featuredMediaId:
                                      current.featuredMediaId === item.id
                                        ? (mediaIds[0] ?? '')
                                        : current.featuredMediaId || (mediaIds[0] ?? ''),
                                  };
                                });
                              }}
                            />
                            <span className="media-picker-image">
                              <Image src={item.url} alt={item.alt} fill sizes="160px" />
                            </span>
                            <strong>{item.alt}</strong>
                            {item.colorHex ? (
                              <i
                                className="media-picker-color"
                                style={{ backgroundColor: item.colorHex }}
                                aria-label={`رنگ تصویر ${item.colorHex}`}
                              />
                            ) : null}
                          </label>
                          {selected ? (
                            <label className="media-featured-choice">
                              <input
                                type="radio"
                                name={`featured:${variant.key}`}
                                checked={featured}
                                onChange={() => {
                                  updateVariant(variant.key, (current) => ({
                                    ...current,
                                    featuredMediaId: item.id,
                                  }));
                                }}
                              />
                              تصویر شاخص
                            </label>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )}
                {selectedMedia.length > 0 ? (
                  <div className="selected-media-preview" aria-label="پیش‌نمایش تصاویر انتخاب‌شده">
                    {selectedMedia.map((item, index) => (
                      <figure key={item.id}>
                        <span>
                          <Image src={item.url} alt={item.alt} fill sizes="180px" />
                        </span>
                        <figcaption>
                          {index === 0
                            ? 'اول گالری'
                            : `تصویر ${(index + 1).toLocaleString('fa-IR')}`}
                          {variant.featuredMediaId === item.id ? ' · شاخص' : ''}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="sku-matrix">
                <header>
                  <div>
                    <h3>سایزها و قیمت‌های این رنگ</h3>
                    <p>هر ردیف یک SKU مستقل و یک قیمت ریالی مستقل دارد.</p>
                  </div>
                  <button
                    className="admin-secondary"
                    type="button"
                    onClick={() => {
                      updateVariant(variant.key, (current) => ({
                        ...current,
                        skus: [...current.skus, emptySku()],
                      }));
                    }}
                  >
                    افزودن سایز
                  </button>
                </header>
                <div className="sku-matrix-table">
                  {variant.skus.map((sku, skuIndex) => (
                    <div className="sku-matrix-row" key={sku.key}>
                      <span className="sku-row-number">
                        {(skuIndex + 1).toLocaleString('fa-IR')}
                      </span>
                      <label>
                        کد SKU
                        <input
                          required
                          dir="ltr"
                          pattern="[A-Z0-9][A-Z0-9_-]{2,63}"
                          readOnly={Boolean(sku.id)}
                          value={sku.code}
                          onChange={(event) => {
                            updateVariant(variant.key, (current) => ({
                              ...current,
                              skus: current.skus.map((item) =>
                                item.key === sku.key
                                  ? { ...item, code: event.target.value.toUpperCase() }
                                  : item,
                              ),
                            }));
                          }}
                        />
                      </label>
                      <label>
                        سایز نرمال
                        <input
                          required
                          dir="ltr"
                          value={sku.normalizedSize}
                          onChange={(event) => {
                            updateVariant(variant.key, (current) => ({
                              ...current,
                              skus: current.skus.map((item) =>
                                item.key === sku.key
                                  ? { ...item, normalizedSize: event.target.value }
                                  : item,
                              ),
                            }));
                          }}
                        />
                      </label>
                      <label>
                        سایز نمایشی
                        <input
                          required
                          value={sku.displaySize}
                          onChange={(event) => {
                            updateVariant(variant.key, (current) => ({
                              ...current,
                              skus: current.skus.map((item) =>
                                item.key === sku.key
                                  ? { ...item, displaySize: event.target.value }
                                  : item,
                              ),
                            }));
                          }}
                        />
                      </label>
                      <label>
                        قیمت (ریال)
                        <input
                          required
                          type="number"
                          min={1}
                          step={1}
                          dir="ltr"
                          value={sku.amountRial || ''}
                          onChange={(event) => {
                            updateVariant(variant.key, (current) => ({
                              ...current,
                              skus: current.skus.map((item) =>
                                item.key === sku.key
                                  ? { ...item, amountRial: Number(event.target.value) }
                                  : item,
                              ),
                            }));
                          }}
                        />
                      </label>
                      <label>
                        موجودی اولیه
                        <input
                          required
                          type="number"
                          min={0}
                          step={1}
                          dir="ltr"
                          readOnly={Boolean(sku.id)}
                          value={sku.physicalQuantity}
                          onChange={(event) => {
                            updateVariant(variant.key, (current) => ({
                              ...current,
                              skus: current.skus.map((item) =>
                                item.key === sku.key
                                  ? { ...item, physicalQuantity: Number(event.target.value) }
                                  : item,
                              ),
                            }));
                          }}
                        />
                      </label>
                      <button
                        className="admin-danger-text"
                        type="button"
                        disabled={variant.skus.length === 1}
                        onClick={() => {
                          updateVariant(variant.key, (current) => ({
                            ...current,
                            skus: current.skus.filter((item) => item.key !== sku.key),
                          }));
                        }}
                      >
                        حذف سایز
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>
          );
        })}
      </section>

      <div className="form-actions">
        <button className="admin-primary" type="submit" disabled={pending}>
          {pending ? 'در حال ذخیره' : product ? 'ذخیرهٔ ماتریس محصول' : 'ساخت پیش‌نویس'}
        </button>
        <span aria-live="polite">{pending ? 'درخواست در حال پردازش است.' : ''}</span>
      </div>
    </form>
  );
}
