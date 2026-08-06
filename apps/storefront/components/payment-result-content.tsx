'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/CheckCircle';
import { HourglassIcon } from '@phosphor-icons/react/Hourglass';
import { WarningCircleIcon } from '@phosphor-icons/react/WarningCircle';
import { XCircleIcon } from '@phosphor-icons/react/XCircle';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  CommerceApiError,
  commerceApi,
  commerceErrorMessage,
  type CheckoutSession,
  type PaymentAttempt,
} from '../lib/commerce-api';

const retryable = new Set<PaymentAttempt['status']>(['created', 'redirected', 'pending']);

export function PaymentResultContent() {
  const search = useSearchParams();
  const attemptId = search.get('attempt') ?? '';
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (attemptId === '') {
      setError('شناسهٔ پرداخت در نشانی صفحه وجود ندارد.');
      setLoading(false);
      return;
    }
    try {
      const current = await commerceApi.payment(attemptId);
      const currentCheckout = await commerceApi.checkout(current.checkoutSessionId);
      setAttempt(current);
      setCheckout(currentCheckout);
      setUnauthorized(false);
    } catch (requestError: unknown) {
      if (requestError instanceof CommerceApiError && requestError.status === 401) {
        setUnauthorized(true);
      } else {
        setError(commerceErrorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (attempt === null || retryable.has(attempt.status)) void load();
    }, 2_000);
    return () => {
      window.clearInterval(timer);
    };
  }, [attempt?.status, load]);

  if (loading) {
    return (
      <main id="main-content" className="shell commerce-page payment-result-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال بررسی نتیجهٔ قطعی…
        </div>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main id="main-content" className="shell commerce-page payment-result-page">
        <section className="commerce-page-state">
          <h1>برای دیدن نتیجه وارد شوید</h1>
          <Link className="button-primary" href="/sign-in">
            ورود دوباره
          </Link>
        </section>
      </main>
    );
  }

  const status: PaymentAttempt['status'] | 'expired' | undefined =
    checkout?.status === 'expired'
      ? 'expired'
      : checkout?.status === 'cancelled'
        ? 'cancelled'
        : attempt?.status;
  const paid = status === 'verified' && attempt?.orderNumber;
  return (
    <main id="main-content" className="shell commerce-page payment-result-page">
      <section className={`payment-result payment-result-${status ?? 'error'}`} aria-live="polite">
        <div className="payment-result-symbol" aria-hidden="true">
          {paid ? (
            <CheckCircleIcon size={52} weight="light" />
          ) : status === 'reconciliation' ? (
            <WarningCircleIcon size={52} weight="light" />
          ) : status !== 'expired' && retryable.has(status ?? 'failed') ? (
            <HourglassIcon size={52} weight="light" />
          ) : (
            <XCircleIcon size={52} weight="light" />
          )}
        </div>
        {paid ? (
          <>
            <p className="commerce-eyebrow">پرداخت تأیید شد</p>
            <h1>سفارش شما ثبت شد</h1>
            <p>موجودی کسر و همهٔ قیمت‌ها، نشانی و روش ارسال به‌صورت تاریخی ثبت شدند.</p>
            <Link
              className="button-primary"
              href={`/orders/${encodeURIComponent(attempt.orderNumber as string)}`}
            >
              مشاهدهٔ سفارش
            </Link>
          </>
        ) : status === 'reconciliation' ? (
          <>
            <p className="commerce-eyebrow">نیازمند بررسی</p>
            <h1>پرداخت در حال تطبیق است</h1>
            <p>
              هیچ سفارش یا کسر موجودی تکراری انجام نشده است. برای جلوگیری از پرداخت دوباره، این
              تراکنش را تکرار نکنید.
            </p>
            <bdi className="reconciliation-code">{attempt?.reconciliationReason}</bdi>
            <Link className="button-secondary" href="/account">
              بازگشت به حساب
            </Link>
          </>
        ) : status === 'expired' ? (
          <>
            <p className="commerce-eyebrow">پایان مهلت رزرو</p>
            <h1>مهلت پرداخت تمام شده است</h1>
            <p>موجودی رزروشده آزاد شده و هیچ سفارشی ساخته نشده است. از سبد دوباره شروع کنید.</p>
            <Link className="button-primary" href="/cart">
              بازگشت به سبد
            </Link>
          </>
        ) : status === 'failed' || status === 'cancelled' ? (
          <>
            <p className="commerce-eyebrow">پرداخت کامل نشد</p>
            <h1>{status === 'cancelled' ? 'از پرداخت منصرف شدید' : 'پرداخت ناموفق بود'}</h1>
            <p>سفارش تجاری ایجاد نشده است؛ تا پایان مهلت رزرو می‌توانید دوباره تلاش کنید.</p>
            <Link
              className="button-primary"
              href={`/payment/fake?attempt=${encodeURIComponent(attemptId)}`}
            >
              تلاش دوباره
            </Link>
            <Link className="text-link" href="/cart">
              بازگشت به سبد
            </Link>
          </>
        ) : (
          <>
            <p className="commerce-eyebrow">در انتظار پاسخ قطعی</p>
            <h1>نتیجهٔ پرداخت هنوز نهایی نیست</h1>
            <p>این صفحه خودکار وضعیت را بررسی می‌کند. تا دریافت نتیجهٔ قطعی صفحه را نبندید.</p>
            <button type="button" className="button-secondary" onClick={() => void load()}>
              بررسی دوباره
            </button>
          </>
        )}
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
      </section>
    </main>
  );
}
