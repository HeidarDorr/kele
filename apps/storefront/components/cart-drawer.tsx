'use client';

import { XIcon } from '@phosphor-icons/react/X';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { CartLine } from '../lib/commerce-api';
import { useCart } from './cart-provider';

export const noticeLabels = {
  quantity_reduced_to_inventory: 'تعداد با موجودی فعلی هماهنگ شد.',
  sku_unavailable: 'یک انتخاب ناموجود است و ادامه خرید را متوقف می‌کند.',
  outfit_revision_requires_review: 'نسخه این استایل باید پیش از ادامه بررسی شود.',
} as const;

export function CartLineItem({ line }: { line: CartLine }) {
  const { updateLine, removeLine, busyLineId } = useCart();
  const busy = busyLineId === line.id;
  return (
    <li className="cart-line">
      <div className="cart-line-media">
        {line.image ? (
          <Image
            src={line.image.url}
            alt={line.image.alt}
            width={256}
            height={358}
            unoptimized
            style={{
              objectPosition: `${String(line.image.focalPoint.x * 100)}% ${String(line.image.focalPoint.y * 100)}%`,
            }}
          />
        ) : (
          <span aria-hidden="true">K</span>
        )}
      </div>
      <div className="cart-line-copy">
        <div>
          <h3>{line.title}</h3>
          <p>{line.selection}</p>
          {line.skuCode ? (
            <bdi className="cart-sku" dir="ltr">
              {line.skuCode}
            </bdi>
          ) : null}
        </div>
        <p className="cart-line-price">{line.unitPrice.display}</p>
        <div className="cart-line-actions">
          <label>
            <span className="visually-hidden">تعداد {line.title}</span>
            <select
              value={line.quantity}
              disabled={busy}
              onChange={(event) => void updateLine(line.id, Number(event.target.value))}
            >
              {Array.from({ length: 20 }, (_, index) => index + 1).map((quantity) => (
                <option key={quantity} value={quantity}>
                  {quantity.toLocaleString('fa-IR')}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={busy} onClick={() => void removeLine(line.id)}>
            حذف
          </button>
        </div>
        {line.status !== 'available' ? (
          <p className="cart-line-alert" role="status">
            {line.status === 'unavailable'
              ? 'این انتخاب اکنون ناموجود است.'
              : 'این نسخه از استایل نیاز به بررسی دارد.'}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { cart, loading, error, drawerOpen, closeDrawer, clear } = useCart();
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeDrawer, drawerOpen]);
  if (!drawerOpen) return null;

  return (
    <div className="cart-overlay" role="presentation" onMouseDown={closeDrawer}>
      <aside
        ref={drawer}
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="cart-drawer-header">
          <div>
            <p>انتخاب‌های شما</p>
            <h2 id="cart-drawer-title">سبد خرید</h2>
          </div>
          <button ref={closeButton} type="button" className="icon-button" onClick={closeDrawer}>
            <XIcon size={22} weight="light" aria-hidden="true" />
            <span className="visually-hidden">بستن سبد</span>
          </button>
        </header>
        <div className="cart-drawer-body">
          {loading ? <p className="commerce-state">در حال دریافت سبد…</p> : null}
          {error ? (
            <div className="commerce-state state-error" role="alert">
              <p>{error}</p>
            </div>
          ) : null}
          {!loading && !error && cart?.lines.length === 0 ? (
            <div className="commerce-state">
              <p>سبد شما هنوز خالی است.</p>
              <Link className="text-link" href="/catalog" onClick={closeDrawer}>
                دیدن محصولات
              </Link>
            </div>
          ) : null}
          {cart?.mergeNotices.length ? (
            <ul className="merge-notices" aria-label="تغییرهای ادغام سبد">
              {cart.mergeNotices.map((notice) => (
                <li key={notice.id}>{noticeLabels[notice.code]}</li>
              ))}
            </ul>
          ) : null}
          {cart?.lines.length ? (
            <ul className="cart-lines">
              {cart.lines.map((line) => (
                <CartLineItem key={line.id} line={line} />
              ))}
            </ul>
          ) : null}
        </div>
        {cart?.lines.length ? (
          <footer className="cart-drawer-footer">
            <div className="cart-total">
              <span>جمع تقریبی</span>
              <strong>{cart.informationalTotal.display}</strong>
            </div>
            <p>قیمت و موجودی پیش از پرداخت دوباره بررسی می‌شود.</p>
            {cart.checkoutBlocked ? (
              <p className="checkout-blocked" role="status">
                برای ادامه، انتخاب‌های ناموجود یا نیازمند بررسی را برطرف کنید.
              </p>
            ) : null}
            <Link className="button-primary cart-page-link" href="/cart" onClick={closeDrawer}>
              مشاهده سبد
            </Link>
            <button type="button" className="cart-clear" onClick={() => void clear()}>
              خالی کردن سبد
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
