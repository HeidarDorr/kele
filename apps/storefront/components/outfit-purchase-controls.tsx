'use client';

import { useState } from 'react';
import type { OutfitDetail } from '../lib/catalog-api';
import { useCart } from './cart-provider';

export function OutfitPurchaseControls({ outfit }: { outfit: OutfitDetail }) {
  const { addOutfit, loading } = useCart();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const selected = outfit.sizes.find((size) => size.code === selectedCode) ?? null;

  async function submit() {
    if (selected === null || !selected.available) return;
    setSubmitting(true);
    const added = await addOutfit(outfit.revisionId, selected.code);
    setMessage(
      added
        ? 'این استایل با نگاشت دقیق همین اندازه به سبد اضافه شد.'
        : 'افزودن استایل انجام نشد؛ وضعیت موجودی را دوباره بررسی کنید.',
    );
    setSubmitting(false);
  }

  return (
    <div className="outfit-purchase-controls">
      <fieldset className="option-group size-options">
        <legend>اندازهٔ استایل</legend>
        <div>
          {outfit.sizes.map((size) => (
            <button
              key={size.code}
              type="button"
              disabled={!size.available || submitting}
              aria-pressed={selectedCode === size.code}
              onClick={() => {
                setSelectedCode(size.code);
                setMessage('');
              }}
            >
              {size.label}
            </button>
          ))}
        </div>
        <p aria-live="polite">
          {selected
            ? `${selected.price.display}، امکان آماده‌سازی ${selected.availableQuantity.toLocaleString('fa-IR')} استایل`
            : 'هر اندازه به SKUهای دقیق اجزای همین ویرایش متصل است.'}
        </p>
      </fieldset>
      <button
        type="button"
        className="button-primary add-to-cart"
        disabled={selected === null || !selected.available || submitting || loading}
        onClick={() => void submit()}
      >
        {submitting ? 'در حال افزودن…' : 'افزودن استایل کامل به سبد'}
      </button>
      <p className="purchase-message" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
