'use client';

import Link from 'next/link';
import { useCart } from './cart-provider';

export function HeaderCommerceActions() {
  const { cart, openDrawer } = useCart();
  const quantity = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  return (
    <div className="header-commerce">
      <Link href="/account" aria-label="حساب مشتری">
        حساب
      </Link>
      <button type="button" onClick={openDrawer} aria-label={`سبد خرید، ${String(quantity)} کالا`}>
        سبد <bdi dir="ltr">({quantity.toLocaleString('fa-IR')})</bdi>
      </button>
    </div>
  );
}
