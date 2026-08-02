'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { commerceApi, commerceErrorMessage, type Order } from '../lib/commerce-api';

export function OrderContent({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void commerceApi
      .order(orderNumber)
      .then((result) => {
        if (active) setOrder(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(commerceErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderNumber]);

  if (loading) {
    return (
      <main id="main-content" className="shell commerce-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" /> دریافت سفارش…
        </div>
      </main>
    );
  }
  if (order === null) {
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="commerce-page-state state-error">
          <h1>سفارش در دسترس نیست</h1>
          <p>{error}</p>
          <Link className="button-secondary" href="/account">
            بازگشت به حساب
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="shell commerce-page order-page">
      <header className="order-heading">
        <div>
          <p className="commerce-eyebrow">سفارش پرداخت‌شده</p>
          <h1>جزئیات سفارش</h1>
        </div>
        <dl>
          <div>
            <dt>شماره سفارش</dt>
            <dd>
              <bdi>{order.orderNumber}</bdi>
            </dd>
          </div>
          <div>
            <dt>زمان پرداخت</dt>
            <dd>
              {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeStyle: 'short' }).format(
                new Date(order.paidAt),
              )}
            </dd>
          </div>
        </dl>
      </header>
      <div className="order-grid">
        <section aria-labelledby="order-items-title">
          <h2 id="order-items-title">انتخاب‌های ثبت‌شده</h2>
          <ul className="order-items">
            {order.items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.selection}</span>
                  {item.skuCode ? <bdi>{item.skuCode}</bdi> : null}
                  {item.kind === 'outfit' && item.outfitRevisionNumber !== null ? (
                    <section className="order-outfit-snapshot" aria-label="ترکیب ثبت‌شده استایل">
                      <span>
                        نسخه {item.outfitRevisionNumber.toLocaleString('fa-IR')} · سایز{' '}
                        {item.outfitSize}
                      </span>
                      <ul>
                        {item.outfitComponents.map((component) => (
                          <li key={component.skuId}>
                            <span>
                              {component.productName} · {component.colorName} ·{' '}
                              {component.sizeLabel}
                            </span>
                            <bdi>{component.skuCode}</bdi>
                            <span>{component.totalQuantity.toLocaleString('fa-IR')} عدد</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
                <span>{item.quantity.toLocaleString('fa-IR')} عدد</span>
                <strong>{item.lineTotal.display}</strong>
              </li>
            ))}
          </ul>
        </section>
        <aside className="order-facts">
          <section>
            <h2>تحویل</h2>
            <strong>{order.address.recipientName}</strong>
            <p>
              {order.address.province}، {order.address.city}، {order.address.addressLine}
            </p>
            <bdi>{order.address.postalCode}</bdi>
          </section>
          <section>
            <h2>ارسال</h2>
            <p>{order.shipping.name}</p>
            <p>{order.shipping.chargedPrice.display}</p>
          </section>
          <dl className="order-total">
            <div>
              <dt>محصول‌ها</dt>
              <dd>{order.itemsSubtotal.display}</dd>
            </div>
            <div>
              <dt>ارسال</dt>
              <dd>{order.shippingTotal.display}</dd>
            </div>
            <div>
              <dt>پرداخت‌شده</dt>
              <dd>{order.paidTotal.display}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </main>
  );
}
