'use client';

import { BagIcon } from '@phosphor-icons/react/Bag';
import { ListIcon } from '@phosphor-icons/react/List';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass';
import { UserIcon } from '@phosphor-icons/react/User';
import { XIcon } from '@phosphor-icons/react/X';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Category } from '../lib/catalog-api';

type NavigationItem = Readonly<{ label: string; href: string }>;

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNavigation({
  navigation,
  categories,
}: {
  navigation: NavigationItem[];
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => trigger.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
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
  }, [close, open]);

  return (
    <div className="mobile-navigation">
      <button
        ref={trigger}
        className="header-icon-button mobile-menu-trigger"
        type="button"
        aria-label="باز کردن فهرست"
        aria-expanded={open}
        aria-controls="mobile-navigation-panel"
        onClick={() => {
          setOpen(true);
        }}
      >
        <ListIcon size={23} weight="light" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="mobile-navigation-overlay"
          role="presentation"
          onMouseDown={() => {
            close();
          }}
        >
          <div
            ref={panel}
            id="mobile-navigation-panel"
            className="mobile-navigation-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
          >
            <header>
              <p id="mobile-navigation-title">فهرست KELE</p>
              <button
                className="header-icon-button"
                type="button"
                aria-label="بستن فهرست"
                onClick={close}
              >
                <XIcon size={22} weight="light" aria-hidden="true" />
              </button>
            </header>
            <nav className="mobile-primary-links" aria-label="فهرست اصلی موبایل">
              {navigation.map((item) => (
                <Link key={`${item.href}-${item.label}`} href={item.href} onClick={close}>
                  {item.label}
                </Link>
              ))}
            </nav>
            {categories.length > 0 ? (
              <nav className="mobile-category-links" aria-label="دسته‌های محصول">
                <p>دسته‌ها</p>
                {categories.map((category) => (
                  <Link key={category.id} href={`/category/${category.slug}`} onClick={close}>
                    {category.name}
                  </Link>
                ))}
              </nav>
            ) : null}
            <div className="mobile-customer-links">
              <Link href="/catalog" onClick={close}>
                <MagnifyingGlassIcon size={20} weight="light" aria-hidden="true" />
                جست‌وجوی محصولات
              </Link>
              <Link href="/account" onClick={close}>
                <UserIcon size={20} weight="light" aria-hidden="true" />
                حساب مشتری
              </Link>
              <Link href="/cart" onClick={close}>
                <BagIcon size={20} weight="light" aria-hidden="true" />
                سبد خرید
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
