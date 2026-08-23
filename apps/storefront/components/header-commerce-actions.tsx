'use client';

import { BagIcon } from '@phosphor-icons/react/Bag';
import { UserIcon } from '@phosphor-icons/react/User';
import Link from 'next/link';
import { useCart } from './cart-provider';

export function HeaderCommerceActions() {
  const { cart, openDrawer } = useCart();
  const quantity = cart?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  return (
    <div className="header-commerce">
      <Link className="header-account-link" href="/account" aria-label="حساب مشتری">
        <UserIcon size={20} weight="light" aria-hidden="true" />
      </Link>
      <button
        className="header-cart-button"
        type="button"
        onClick={openDrawer}
        aria-label={`سبد خرید، ${String(quantity)} کالا`}
      >
        <BagIcon size={20} weight="light" aria-hidden="true" />
        <bdi className="header-cart-count" dir="ltr">
          {quantity.toLocaleString('fa-IR')}
        </bdi>
      </button>
    </div>
  );
}
