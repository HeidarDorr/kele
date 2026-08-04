'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CommerceApiError,
  commerceApi,
  commerceErrorMessage,
  type OrderPage,
} from '../lib/commerce-api';

const labels: Record<string, string> = {
  paid: 'پرداخت‌شده',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  returned: 'مرجوع‌شده',
};

export function OrderListContent() {
  const searchParams = useSearchParams();
  const forcedState = searchParams.get('state');
  const [page, setPage] = useState<OrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (forcedState === 'loading')
      return () => {
        active = false;
      };
    if (forcedState === 'error') {
      setError('دریافت سفارش‌ها ممکن نشد. دوباره تلاش کنید.');
      setLoading(false);
      return () => {
        active = false;
      };
    }
    void commerceApi
      .orders()
      .then((result) => {
        if (active) setPage(forcedState === 'empty' ? { ...result, items: [] } : result);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof CommerceApiError && requestError.status === 401)
          setUnauthorized(true);
        else setError(commerceErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [forcedState]);

  if (loading)
    return (
      <main id="main-content" className="shell commerce-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          در حال دریافت سفارش‌ها…
        </div>
      </main>
    );
  if (unauthorized)
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="commerce-page-state">
          <h1>برای دیدن سفارش‌ها وارد شوید</h1>
          <p>اطلاعات سفارش فقط برای مالک حساب نمایش داده می‌شود.</p>
          <Link className="button-primary" href="/sign-in">
            ورود امن
          </Link>
        </section>
      </main>
    );
  if (error)
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="commerce-page-state state-error" role="alert">
          <h1>سفارش‌ها در دسترس نیستند</h1>
          <p>{error}</p>
          <button
            className="button-secondary"
            onClick={() => {
              window.location.reload();
            }}
          >
            تلاش دوباره
          </button>
        </section>
      </main>
    );

  return (
    <main id="main-content" className="shell commerce-page orders-index">
      <header className="commerce-page-heading">
        <div>
          <p>حساب مشتری</p>
          <h1>سفارش‌های من</h1>
        </div>
        <span>{(page?.items.length ?? 0).toLocaleString('fa-IR')} سفارش</span>
      </header>
      {page?.items.length === 0 ? (
        <section className="commerce-page-state">
          <h2>هنوز سفارشی ثبت نشده است</h2>
          <p>پس از پرداخت تأییدشده، سفارش و وضعیت اجرایی آن اینجا دیده می‌شود.</p>
          <Link className="button-primary" href="/products">
            دیدن محصولات
          </Link>
        </section>
      ) : (
        <ul className="customer-order-list">
          {page?.items.map((order) => (
            <li key={order.orderNumber}>
              <div>
                <bdi>{order.orderNumber}</bdi>
                <strong>{labels[order.fulfillmentStatus]}</strong>
              </div>
              <div>
                <time>
                  {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(
                    new Date(order.createdAt),
                  )}
                </time>
                <span>{order.paidTotal.display}</span>
              </div>
              <Link
                className="button-secondary"
                href={`/orders/${encodeURIComponent(order.orderNumber)}`}
              >
                جزئیات و رهگیری
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
