'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  CommerceApiError,
  commerceApi,
  commerceErrorMessage,
  type PaymentAttempt,
} from '../lib/commerce-api';

type Outcome = 'success' | 'failed' | 'cancelled' | 'pending' | 'tampered_amount';

export function FakePaymentContent() {
  const router = useRouter();
  const search = useSearchParams();
  const attemptId = search.get('attempt') ?? '';
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Outcome | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (attemptId === '') {
      setError('شناسهٔ پرداخت در نشانی صفحه وجود ندارد.');
      setLoading(false);
      return;
    }
    try {
      setAttempt(await commerceApi.payment(attemptId));
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

  useEffect(() => void load(), [load]);

  async function complete(outcome: Outcome) {
    setBusy(outcome);
    setError('');
    try {
      await commerceApi.completeFakePayment(attemptId, outcome);
      router.push(`/payment/result?attempt=${encodeURIComponent(attemptId)}`);
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <main id="main-content" className="shell commerce-page payment-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال دریافت درخواست پرداخت…
        </div>
      </main>
    );
  }

  if (unauthorized) {
    return (
      <main id="main-content" className="shell commerce-page payment-page">
        <section className="commerce-page-state">
          <h1>نشست شما در دسترس نیست</h1>
          <Link className="button-primary" href="/sign-in">
            ورود دوباره
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="shell commerce-page payment-page">
      <section className="fake-gateway" aria-labelledby="fake-gateway-title">
        <header>
          <p className="fake-gateway-mark" aria-hidden="true">
            KELE / FAKE PAY
          </p>
          <div>
            <p className="commerce-eyebrow">محیط غیرتولیدی</p>
            <h1 id="fake-gateway-title">شبیه‌ساز درگاه پرداخت</h1>
          </div>
        </header>
        {error ? (
          <div className="form-error" role="alert">
            {error}
          </div>
        ) : null}
        {attempt ? (
          <>
            <dl className="gateway-facts">
              <div>
                <dt>مبلغ تراکنش</dt>
                <dd>{attempt.amount.display}</dd>
              </div>
              <div>
                <dt>وضعیت فعلی</dt>
                <dd>{attempt.status}</dd>
              </div>
              <div>
                <dt>شناسهٔ درخواست</dt>
                <dd>
                  <bdi>{attempt.id}</bdi>
                </dd>
              </div>
            </dl>
            <div className="gateway-actions" aria-label="نتیجهٔ شبیه‌سازی‌شده">
              <button
                type="button"
                className="button-primary"
                disabled={busy !== null || attempt.status === 'verified'}
                onClick={() => void complete('success')}
              >
                {busy === 'success' ? 'تأیید…' : 'پرداخت موفق'}
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={busy !== null || attempt.status === 'verified'}
                onClick={() => void complete('pending')}
              >
                در انتظار تأیید
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={busy !== null || attempt.status === 'verified'}
                onClick={() => void complete('failed')}
              >
                پرداخت ناموفق
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy !== null || attempt.status === 'verified'}
                onClick={() => void complete('cancelled')}
              >
                انصراف مشتری
              </button>
            </div>
            <details className="gateway-adversarial">
              <summary>آزمون امنیتی مبلغ</summary>
              <p>این گزینه callback موفق با مبلغ متفاوت می‌فرستد و باید قرنطینه شود.</p>
              <button
                type="button"
                className="text-button"
                disabled={busy !== null || attempt.status === 'verified'}
                onClick={() => void complete('tampered_amount')}
              >
                ارسال مبلغ دست‌کاری‌شده
              </button>
            </details>
          </>
        ) : null}
      </section>
    </main>
  );
}
