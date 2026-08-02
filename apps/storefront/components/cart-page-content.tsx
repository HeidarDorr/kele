'use client';

import Link from 'next/link';
import { CartLineItem, noticeLabels } from './cart-drawer';
import { useCart } from './cart-provider';

export function CartPageContent() {
  const { cart, loading, error, refresh, clear } = useCart();
  return (
    <main id="main-content" className="shell commerce-page cart-page-main">
      <header className="commerce-page-heading">
        <p>انتخاب‌های فعلی</p>
        <h1>سبد خرید</h1>
        <span>قیمت و موجودی این صفحه همواره از وضعیت فعلی فروشگاه خوانده می‌شود.</span>
      </header>

      {loading ? (
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال دریافت سبد…
        </div>
      ) : null}
      {error ? (
        <div className="commerce-page-state state-error" role="alert">
          <p>{error}</p>
          <button type="button" className="button-secondary" onClick={() => void refresh()}>
            تلاش دوباره
          </button>
        </div>
      ) : null}
      {!loading && !error && cart?.lines.length === 0 ? (
        <section className="cart-empty-state">
          <p>هنوز چیزی برای نگه‌داشتن انتخاب نکرده‌اید.</p>
          <Link className="button-primary" href="/catalog">
            دیدن کاتالوگ
          </Link>
        </section>
      ) : null}
      {cart?.mergeNotices.length ? (
        <ul className="merge-notices" aria-label="تغییرهای ادغام سبد">
          {cart.mergeNotices.map((notice) => (
            <li key={notice.id}>{noticeLabels[notice.code]}</li>
          ))}
        </ul>
      ) : null}
      {cart?.lines.length ? (
        <div className="cart-page-grid">
          <section aria-labelledby="cart-lines-heading">
            <h2 id="cart-lines-heading" className="visually-hidden">
              اقلام سبد
            </h2>
            <ul className="cart-lines cart-page-lines">
              {cart.lines.map((line) => (
                <CartLineItem key={line.id} line={line} />
              ))}
            </ul>
          </section>
          <aside className="cart-summary" aria-labelledby="cart-summary-heading">
            <p>خلاصه</p>
            <h2 id="cart-summary-heading">جمع تقریبی</h2>
            <strong>{cart.informationalTotal.display}</strong>
            <p>قیمت نهایی و امکان تأمین، پیش از پرداخت دوباره محاسبه می‌شود.</p>
            {cart.checkoutBlocked ? (
              <div className="checkout-blocked" role="status">
                ادامه خرید تا رفع انتخاب‌های ناموجود یا نیازمند بررسی مسدود است.
              </div>
            ) : (
              <>
                <div className="cart-ready" role="status">
                  همه انتخاب‌های سبد در وضعیت فعلی قابل تأمین‌اند.
                </div>
                <Link className="button-primary cart-checkout-link" href="/checkout">
                  ادامه و انتخاب ارسال
                </Link>
              </>
            )}
            <Link className="button-secondary" href="/account">
              مدیریت حساب مشتری
            </Link>
            <button type="button" className="cart-clear" onClick={() => void clear()}>
              خالی کردن سبد
            </button>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
