'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CommerceApiError,
  commerceApi,
  commerceErrorMessage,
  type Address,
  type CheckoutSession,
  type ShippingMethodCode,
  type ShippingOption,
} from '../lib/commerce-api';
import { useCart } from './cart-provider';

function commandKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function CheckoutContent() {
  const { cart, loading: cartLoading, error: cartError, refresh } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [method, setMethod] = useState<ShippingMethodCode | ''>('');
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');
  const checkoutKey = useRef(commandKey('storefront-checkout'));
  const paymentKey = useRef(commandKey('storefront-payment'));

  useEffect(() => {
    let active = true;
    void commerceApi
      .addresses()
      .then((owned) => {
        if (!active) return;
        setAddresses(owned);
        setAddressId(owned.find((address) => address.isDefault)?.id ?? owned[0]?.id ?? '');
        setUnauthorized(false);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof CommerceApiError && requestError.status === 401) {
          setUnauthorized(true);
        } else {
          setError(commerceErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (cart === null || addressId === '' || cart.lines.length === 0 || cart.checkoutBlocked) {
      setOptions([]);
      setMethod('');
      return;
    }
    let active = true;
    setQuoting(true);
    setError('');
    checkoutKey.current = commandKey('storefront-checkout');
    paymentKey.current = commandKey('storefront-payment');
    void commerceApi
      .shippingOptions(cart.id, addressId)
      .then((quoted) => {
        if (!active) return;
        setOptions(quoted);
        setMethod(quoted.find((option) => option.eligible)?.method ?? '');
      })
      .catch((requestError: unknown) => {
        if (active) setError(commerceErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setQuoting(false);
      });
    return () => {
      active = false;
    };
  }, [addressId, cart]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cart === null || method === '' || addressId === '') return;
    setBusy(true);
    setError('');
    try {
      const reserved = await commerceApi.createCheckout(
        { cartId: cart.id, addressId, deliveryMethod: method },
        checkoutKey.current,
      );
      setCheckout(reserved);
      const attempt = await commerceApi.startPayment(reserved.id, paymentKey.current);
      if (attempt.redirectUrl === null) throw new Error('Payment redirect is unavailable.');
      window.location.assign(attempt.redirectUrl);
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
      await refresh();
      setBusy(false);
    }
  }

  if (cartLoading || loading) {
    return (
      <main id="main-content" className="shell commerce-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال آماده‌سازی پرداخت…
        </div>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="account-unauthorized">
          <p className="commerce-eyebrow">مرحلهٔ امن</p>
          <h1>برای ادامه وارد حساب شوید</h1>
          <p>رزرو موجودی و ثبت نشانی فقط برای مشتری احرازشده انجام می‌شود.</p>
          <Link className="button-primary" href="/sign-in">
            ورود با شماره موبایل
          </Link>
        </section>
      </main>
    );
  }

  if (cart === null || cart.lines.length === 0) {
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="commerce-page-state">
          <h1>سبد خرید خالی است</h1>
          <Link className="button-primary" href="/catalog">
            بازگشت به کاتالوگ
          </Link>
        </section>
      </main>
    );
  }

  const selected = options.find((option) => option.method === method) ?? null;
  const payable = selected
    ? cart.informationalTotal.amountRial + selected.quotedPrice.amountRial
    : cart.informationalTotal.amountRial;

  return (
    <main id="main-content" className="shell commerce-page checkout-page">
      <header className="commerce-page-heading checkout-heading">
        <p>رزرو ۳۰ دقیقه‌ای</p>
        <h1>ارسال و پرداخت</h1>
        <span>
          قیمت و موجودی در لحظهٔ رزرو از سرور دوباره خوانده می‌شود؛ جمع سبد این صفحه صرفاً پیش‌نمایش
          است.
        </span>
      </header>

      {cartError || error ? (
        <div className="form-error checkout-error" role="alert">
          {error || cartError}
        </div>
      ) : null}
      {cart.checkoutBlocked ? (
        <section className="commerce-page-state state-error">
          <h2>سبد نیازمند بازبینی است</h2>
          <p>انتخاب ناموجود یا نیازمند بررسی را پیش از پرداخت اصلاح کنید.</p>
          <Link className="button-secondary" href="/cart">
            بازگشت به سبد
          </Link>
        </section>
      ) : addresses.length === 0 ? (
        <section className="commerce-page-state">
          <h2>ابتدا یک نشانی ثبت کنید</h2>
          <p>بدون نشانی معتبر، امکان بررسی روش‌های ارسال وجود ندارد.</p>
          <Link className="button-primary" href="/account">
            ثبت نشانی در حساب
          </Link>
        </section>
      ) : (
        <form className="checkout-grid" onSubmit={(event) => void submit(event)}>
          <div className="checkout-steps">
            <fieldset className="checkout-step">
              <legend>
                <span>۰۱</span> نشانی تحویل
              </legend>
              <div className="checkout-options">
                {addresses.map((address) => (
                  <label key={address.id} className="checkout-option">
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                      disabled={busy}
                    />
                    <span>
                      <strong>{address.recipientName}</strong>
                      <small>
                        {address.province}، {address.city}، {address.addressLine}
                      </small>
                      <bdi>{address.postalCode}</bdi>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="checkout-step" aria-busy={quoting}>
              <legend>
                <span>۰۲</span> روش ارسال
              </legend>
              {quoting ? (
                <div className="checkout-inline-state" role="status">
                  <span className="commerce-loader" aria-hidden="true" /> محاسبهٔ روش‌ها…
                </div>
              ) : (
                <div className="checkout-options">
                  {options.map((option) => (
                    <label
                      key={option.method}
                      className={`checkout-option ${option.eligible ? '' : 'is-disabled'}`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={option.method}
                        checked={method === option.method}
                        onChange={() => setMethod(option.method)}
                        disabled={!option.eligible || busy}
                      />
                      <span>
                        <strong>{option.name}</strong>
                        <small>
                          {option.eligible
                            ? option.freeShippingApplied
                              ? 'ارسال رایگان برای این جمع سفارش'
                              : option.quotedPrice.display
                            : option.ineligibilityCode === 'LOCAL_COURIER_OUTSIDE_TEHRAN'
                              ? 'فقط برای شهر تهران'
                              : 'فعلاً غیرفعال'}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          </div>

          <aside className="checkout-summary" aria-labelledby="checkout-summary-title">
            <p className="commerce-eyebrow">جمع سفارش</p>
            <h2 id="checkout-summary-title">پیش از درگاه</h2>
            <dl>
              <div>
                <dt>محصول‌ها</dt>
                <dd>{cart.informationalTotal.display}</dd>
              </div>
              <div>
                <dt>ارسال</dt>
                <dd>{selected?.quotedPrice.display ?? '—'}</dd>
              </div>
              <div className="checkout-payable">
                <dt>مبلغ قابل پرداخت</dt>
                <dd>{new Intl.NumberFormat('fa-IR').format(payable / 10)} تومان</dd>
              </div>
            </dl>
            <p className="checkout-summary-note">
              مبلغ نهایی فقط از CheckoutSession امضاشدهٔ سرور به درگاه فرستاده می‌شود.
            </p>
            {checkout ? (
              <p className="cart-ready" role="status">
                رزرو ایجاد شد؛ انتقال امن به پرداخت…
              </p>
            ) : null}
            <button
              type="submit"
              className="button-primary checkout-submit"
              disabled={busy || quoting || selected === null || !selected.eligible}
            >
              {busy ? 'در حال رزرو…' : 'رزرو موجودی و ورود به پرداخت'}
            </button>
            <Link className="text-link checkout-return" href="/cart">
              بازگشت به سبد
            </Link>
          </aside>
        </form>
      )}
    </main>
  );
}
