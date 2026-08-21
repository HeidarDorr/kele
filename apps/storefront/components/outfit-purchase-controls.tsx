'use client';

import { formatIrrAsToman } from '@kele/design-system/money';
import { useMemo, useState } from 'react';
import type { OutfitDetail } from '../lib/catalog-api';
import { useCart } from './cart-provider';

type OutfitSize = OutfitDetail['sizes'][number];

function selectedAvailability(size: OutfitSize, excludedIds: ReadonlySet<string>): number {
  const included = size.components.filter((component) => !excludedIds.has(component.outfitItemId));
  if (included.length === 0) return 0;
  const demandBySku = new Map<string, { demand: number; available: number }>();
  for (const component of included) {
    const current = demandBySku.get(component.skuId);
    demandBySku.set(component.skuId, {
      demand: (current?.demand ?? 0) + component.quantity,
      available: Math.min(
        current?.available ?? component.skuAvailableQuantity,
        component.skuAvailableQuantity,
      ),
    });
  }
  return Math.min(
    ...[...demandBySku.values()].map(({ demand, available }) => Math.floor(available / demand)),
  );
}

function aggregateProductLines(components: OutfitSize['components']) {
  const quantities = new Map<string, number>();
  for (const component of components) {
    quantities.set(component.skuId, (quantities.get(component.skuId) ?? 0) + component.quantity);
  }
  return [...quantities.entries()]
    .map(([skuId, quantity]) => ({ skuId, quantity }))
    .toSorted((left, right) => left.skuId.localeCompare(right.skuId));
}

export function OutfitPurchaseControls({
  outfit,
  description,
}: {
  outfit: OutfitDetail;
  description: string;
}) {
  const { addOutfit, addProducts, loading } = useCart();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const selected = outfit.sizes.find((size) => size.code === selectedCode) ?? null;
  const included = useMemo(
    () =>
      selected?.components.filter((component) => !excludedIds.has(component.outfitItemId)) ?? [],
    [excludedIds, selected],
  );
  const buyingProducts = selected !== null && excludedIds.size > 0;
  const productSelectionPriced = included.every((component) => component.price !== null);
  const availableQuantity =
    selected === null
      ? 0
      : buyingProducts
        ? productSelectionPriced
          ? selectedAvailability(selected, excludedIds)
          : 0
        : selected.availableQuantity;
  const displayedPrice =
    selected === null
      ? outfit.startingPrice.display
      : buyingProducts
        ? productSelectionPriced
          ? formatIrrAsToman(
              included.reduce((total, component) => total + (component.price?.amountRial ?? 0), 0),
            )
          : 'قیمت نامشخص'
        : selected.price.display;

  function toggleComponent(outfitItemId: string) {
    if (selected === null) return;
    setMessage('');
    setExcludedIds((current) => {
      const next = new Set(current);
      if (next.has(outfitItemId)) {
        next.delete(outfitItemId);
        return next;
      }
      if (selected.components.length - next.size <= 1) {
        setMessage('حداقل یک جزء باید در انتخاب باقی بماند.');
        return current;
      }
      next.add(outfitItemId);
      return next;
    });
  }

  async function submit() {
    if (selected === null || availableQuantity < 1 || included.length === 0) return;
    setSubmitting(true);
    const added = buyingProducts
      ? await addProducts(aggregateProductLines(included))
      : await addOutfit(outfit.revisionId, selected.code);
    setMessage(
      added
        ? buyingProducts
          ? 'محصولات باقی‌مانده با همان رنگ و اندازهٔ انتخاب‌شده، جداگانه به سبد اضافه شدند.'
          : 'ست کامل به سبد اضافه شد.'
        : 'افزودن به سبد انجام نشد؛ قیمت و موجودی را دوباره بررسی کنید.',
    );
    setSubmitting(false);
  }

  return (
    <div className="outfit-purchase-controls">
      <p className="outfit-starting-price" aria-live="polite">
        {displayedPrice}
      </p>
      <p className="product-description">{description}</p>

      <fieldset className="option-group size-options outfit-size-options">
        <legend>اندازهٔ ست</legend>
        <div>
          {outfit.sizes.map((size) => (
            <button
              key={size.code}
              type="button"
              className={size.available ? undefined : 'is-unavailable'}
              disabled={submitting}
              aria-pressed={selectedCode === size.code}
              onClick={() => {
                setSelectedCode(size.code);
                setExcludedIds(new Set());
                setMessage('');
              }}
            >
              {size.label}
            </button>
          ))}
        </div>
        <p>
          اندازه‌های کم‌رنگ برای ست کامل موجود نیستند؛ پس از انتخاب اندازه می‌توانید جزء ناموجود را
          حذف کنید.
        </p>
      </fieldset>

      {selected ? (
        <fieldset className="option-group outfit-component-selector">
          <legend>اجزای این انتخاب</legend>
          <p className="outfit-component-selector-intro">
            {selected.components.length > 1
              ? 'جزءهایی را که نمی‌خواهید بردارید. با نخستین حذف، انتخاب دیگر ست محسوب نمی‌شود؛ قیمت از مجموع محصولات باقی‌مانده محاسبه می‌شود و هر محصول جداگانه به سبد می‌رود.'
              : 'این ست یک جزء دارد؛ برای خرید مستقل همین محصول از بخش ساختار ست استفاده کنید.'}
          </p>
          <div className="outfit-component-options">
            {selected.components.map((component) => {
              const isIncluded = !excludedIds.has(component.outfitItemId);
              return (
                <label
                  key={component.outfitItemId}
                  className={isIncluded ? 'is-included' : 'is-excluded'}
                >
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    disabled={submitting || selected.components.length === 1}
                    onChange={() => {
                      toggleComponent(component.outfitItemId);
                    }}
                  />
                  <span className="outfit-component-option-copy">
                    <strong>{component.name}</strong>
                    <small>
                      {component.colorName} · {component.sizeLabel}
                      {component.quantity > 1
                        ? ` · ${component.quantity.toLocaleString('fa-IR')} عدد`
                        : ''}
                    </small>
                  </span>
                  <span className="outfit-component-option-meta">
                    <bdi>{component.price?.display ?? 'قیمت نامشخص'}</bdi>
                    <small className={component.available ? undefined : 'is-unavailable'}>
                      {component.price === null
                        ? 'قابل خرید نیست'
                        : component.available
                          ? 'موجود'
                          : 'ناموجود'}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div
        className={
          availableQuantity > 0
            ? 'outfit-availability-note'
            : 'outfit-availability-note unavailable'
        }
        aria-live="polite"
      >
        {selected === null
          ? 'برای دیدن رنگ و اندازهٔ دقیق اجزا، یک اندازه انتخاب کنید.'
          : availableQuantity > 0
            ? `${availableQuantity.toLocaleString('fa-IR')} عدد از این انتخاب موجود است.`
            : buyingProducts && !productSelectionPriced
              ? 'یکی از محصولات باقی‌مانده قیمت فعال ندارد؛ آن را حذف یا اندازهٔ دیگری انتخاب کنید.'
              : 'همهٔ اجزای باقی‌مانده موجود نیستند؛ جزء ناموجود را حذف یا اندازهٔ دیگری انتخاب کنید.'}
      </div>

      <button
        type="button"
        className="button-primary add-to-cart"
        disabled={
          selected === null ||
          availableQuantity < 1 ||
          included.length === 0 ||
          submitting ||
          loading
        }
        onClick={() => void submit()}
      >
        {submitting
          ? 'در حال افزودن…'
          : buyingProducts
            ? 'افزودن محصولات به سبد'
            : 'افزودن ست کامل به سبد'}
      </button>
      <p className="purchase-message" aria-live="polite">
        {message}
      </p>
      <p className="outfit-integrity-note">
        ست کامل با قیمت مستقل خود ثبت می‌شود. پس از حذف هر جزء، اندازه و رنگ دقیق محصولات باقی‌مانده
        جداگانه ثبت می‌شوند و هیچ محصول دیگری خودکار جایگزین آن‌ها نخواهد شد.
      </p>
    </div>
  );
}
