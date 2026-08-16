'use client';

import Link from 'next/link';
import { type SyntheticEvent, useCallback, useEffect, useState } from 'react';
import { commerceApi, commerceErrorMessage, type Order } from '../lib/commerce-api';

const statusLabels: Record<string, string> = {
  paid: 'پرداخت‌شده',
  preparing: 'در حال آماده‌سازی',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغوشده',
  returned: 'مرجوع‌شده',
};

const eventLabels: Record<string, string> = {
  created: 'سفارش ایجاد شد',
  tracking_updated: 'اطلاعات رهگیری به‌روزرسانی شد',
  return_submitted: 'درخواست مرجوعی ثبت شد',
  return_decided: 'دربارهٔ مرجوعی تصمیم‌گیری شد',
  refund_updated: 'وضعیت بازپرداخت به‌روزرسانی شد',
};

export function OrderContent({
  orderNumber,
  acceptanceState = null,
}: {
  orderNumber: string;
  acceptanceState?: 'loading' | 'error' | 'unavailable' | null;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [declarations, setDeclarations] = useState({
    unused: false,
    unwashed: false,
    tagsAttached: false,
  });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (acceptanceState === 'loading') return;
    setLoading(true);
    setError('');
    try {
      if (acceptanceState === 'error') throw new Error('forced acceptance state');
      const result = await commerceApi.order(orderNumber);
      setOrder(result);
      setQuantities(Object.fromEntries(result.items.map((item) => [item.id, 0])));
    } catch (requestError: unknown) {
      setError(
        acceptanceState === 'error'
          ? 'دریافت سفارش ممکن نشد. دوباره تلاش کنید.'
          : commerceErrorMessage(requestError),
      );
    } finally {
      setLoading(false);
    }
  }, [acceptanceState, orderNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitReturn(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    const items = order.items
      .map((item) => ({ orderItemId: item.id, quantity: quantities[item.id] ?? 0 }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) {
      setError('دست‌کم یک قلم و تعداد معتبر انتخاب کنید.');
      return;
    }
    if (!declarations.unused || !declarations.unwashed || !declarations.tagsAttached) {
      setError('هر سه اظهار وضعیت کالا باید تأیید شوند.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await commerceApi.submitReturn(
        {
          orderNumber: order.orderNumber,
          items,
          reason,
          unused: true,
          unwashed: true,
          tagsAttached: true,
        },
        crypto.randomUUID(),
      );
      setSuccess(
        'درخواست مرجوعی ثبت شد و برای بررسی مدیر موجودی در صف قرار گرفت. هنوز بازپرداختی قطعی نشده است.',
      );
      await load();
    } catch (requestError: unknown) {
      setError(commerceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <main id="main-content" className="shell commerce-page">
        <div className="commerce-page-state" role="status">
          <span className="commerce-loader" aria-hidden="true" />
          دریافت سفارش…
        </div>
      </main>
    );
  if (order === null)
    return (
      <main id="main-content" className="shell commerce-page">
        <section className="commerce-page-state state-error" role="alert">
          <h1>سفارش در دسترس نیست</h1>
          <p>{error}</p>
          <Link className="button-secondary" href="/orders">
            بازگشت به سفارش‌ها
          </Link>
        </section>
      </main>
    );

  const eligibility =
    acceptanceState === 'unavailable'
      ? { ...order.returnEligibility, eligible: false, code: 'window_expired' as const }
      : order.returnEligibility;
  return (
    <main id="main-content" className="shell commerce-page order-page">
      <header className="order-heading">
        <div>
          <p className="commerce-eyebrow">سفارش {statusLabels[order.fulfillmentStatus]}</p>
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
              {new Intl.DateTimeFormat('fa-IR', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Asia/Tehran',
              }).format(new Date(order.paidAt))}
            </dd>
          </div>
        </dl>
      </header>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}
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
                  {item.kind === 'outfit' && item.outfitRevisionNumber ? (
                    <section className="order-outfit-snapshot" aria-label="ترکیب ثبت‌شدهٔ ست">
                      <span>
                        نسخه {item.outfitRevisionNumber.toLocaleString('fa-IR')}، سایز{' '}
                        {item.outfitSize}
                      </span>
                      <ul>
                        {item.outfitComponents.map((component) => (
                          <li key={component.skuId}>
                            <span>
                              {component.productName}، {component.colorName}، {component.sizeLabel}
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
            {order.tracking ? (
              <div className="tracking-fact">
                <strong>{order.tracking.carrier}</strong>
                <bdi>{order.tracking.trackingNumber}</bdi>
                {order.tracking.trackingUrl ? (
                  <a href={order.tracking.trackingUrl} rel="noreferrer" target="_blank">
                    پیگیری مرسوله
                  </a>
                ) : null}
              </div>
            ) : (
              <span>کد رهگیری پس از ارسال نمایش داده می‌شود.</span>
            )}
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
      <section className="customer-timeline" aria-labelledby="customer-timeline-title">
        <h2 id="customer-timeline-title">مسیر سفارش</h2>
        <ol>
          {order.timeline.map((event) => (
            <li key={event.id}>
              <time>
                {new Intl.DateTimeFormat('fa-IR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                  timeZone: 'Asia/Tehran',
                }).format(new Date(event.occurredAt))}
              </time>
              <strong>
                {event.toStatus
                  ? statusLabels[event.toStatus]
                  : (eventLabels[event.type] ?? event.type)}
              </strong>
              <span>{event.reason ?? 'ثبت سیستمی'}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="return-panel" aria-labelledby="return-title">
        <div>
          <p className="commerce-eyebrow">مرجوعی</p>
          <h2 id="return-title">درخواست بررسی مرجوعی</h2>
          {eligibility.deadline ? (
            <p>
              مهلت ثبت:{' '}
              {new Intl.DateTimeFormat('fa-IR', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Asia/Tehran',
              }).format(new Date(eligibility.deadline))}
            </p>
          ) : null}
        </div>
        {eligibility.eligible ? (
          <form
            className="commerce-form return-form"
            onSubmit={(event) => void submitReturn(event)}
          >
            <fieldset>
              <legend>قلم و تعداد</legend>
              {order.items.map((item) => (
                <label key={item.id}>
                  {item.title}
                  <input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={quantities[item.id] ?? 0}
                    onChange={(event) => {
                      setQuantities({ ...quantities, [item.id]: Number(event.target.value) });
                    }}
                  />
                </label>
              ))}
            </fieldset>
            <label>
              دلیل درخواست
              <textarea
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                }}
              />
            </label>
            <fieldset className="declaration-list">
              <legend>اظهار وضعیت کالا</legend>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={declarations.unused}
                  onChange={(event) => {
                    setDeclarations({ ...declarations, unused: event.target.checked });
                  }}
                />
                کالا استفاده نشده است
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={declarations.unwashed}
                  onChange={(event) => {
                    setDeclarations({ ...declarations, unwashed: event.target.checked });
                  }}
                />
                کالا شسته نشده است
              </label>
              <label>
                <input
                  type="checkbox"
                  required
                  checked={declarations.tagsAttached}
                  onChange={(event) => {
                    setDeclarations({ ...declarations, tagsAttached: event.target.checked });
                  }}
                />
                همهٔ برچسب‌ها متصل‌اند
              </label>
            </fieldset>
            <button className="button-primary" disabled={busy}>
              {busy ? 'در حال ثبت…' : 'ثبت درخواست برای بررسی'}
            </button>
            <p className="return-disclaimer">ثبت درخواست به معنی تأیید یا بازپرداخت قطعی نیست.</p>
          </form>
        ) : (
          <div className="commerce-page-state return-unavailable">
            <strong>درخواست تازه در دسترس نیست</strong>
            <p>
              {eligibility.code === 'not_delivered'
                ? 'این امکان پس از تأیید تحویل فعال می‌شود.'
                : eligibility.code === 'window_expired'
                  ? 'مهلت ۲۴ ساعته پس از تحویل پایان یافته است.'
                  : 'تعداد قابل مرجوعی دیگری باقی نمانده است.'}
            </p>
          </div>
        )}
        {order.returns.length > 0 ? (
          <ul className="return-history">
            {order.returns.map((request) => (
              <li key={request.id}>
                <strong>{request.status}</strong>
                <time>
                  {new Intl.DateTimeFormat('fa-IR', {
                    dateStyle: 'long',
                    timeZone: 'Asia/Tehran',
                  }).format(new Date(request.requestedAt))}
                </time>
                <span>
                  {request.refund?.status === 'confirmed'
                    ? `بازپرداخت تأیید شد، ${request.refund.amount.display}`
                    : request.refund
                      ? `بازپرداخت: ${request.refund.status}`
                      : 'در انتظار تصمیم مدیر'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
