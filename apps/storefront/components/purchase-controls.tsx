'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ProductDetail } from '../lib/catalog-api';
import { useCart } from './cart-provider';

type Sku = ProductDetail['variants'][number]['skus'][number];

export function PurchaseControls({
  skus,
  initialPrice,
  description,
  children,
}: {
  skus: Sku[];
  initialPrice: ProductDetail['price'];
  description: string;
  children: ReactNode;
}) {
  const { addProduct, loading } = useCart();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const selected = skus.find((sku) => sku.id === selectedId) ?? null;

  async function addSelected() {
    if (selected === null) return;
    setSubmitting(true);
    const added = await addProduct(selected.id);
    setMessage(added ? 'به سبد اضافه شد.' : 'افزودن به سبد انجام نشد.');
    setSubmitting(false);
  }

  return (
    <div className="purchase-controls">
      <p className="product-price" aria-live="polite">
        {selected?.price.display ?? initialPrice.display}
      </p>
      <p className="product-description">{description}</p>
      {children}
      <fieldset className="option-group size-options">
        <legend>اندازه</legend>
        <div>
          {skus.map((sku) => (
            <button
              key={sku.id}
              type="button"
              disabled={!sku.available || submitting}
              aria-pressed={selectedId === sku.id}
              onClick={() => {
                setSelectedId(sku.id);
                setMessage('');
              }}
            >
              {sku.size}
            </button>
          ))}
        </div>
        <p>اندازه‌های کم‌رنگ در حال حاضر موجود نیستند.</p>
      </fieldset>
      <button
        type="button"
        className="button-primary add-to-cart"
        disabled={selected === null || submitting || loading}
        onClick={() => {
          void addSelected();
        }}
      >
        {submitting ? 'در حال افزودن…' : 'افزودن به سبد'}
      </button>
      <p className="purchase-message" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
