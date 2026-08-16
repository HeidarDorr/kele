'use client';

import { BagIcon } from '@phosphor-icons/react/Bag';
import { CaretDownIcon } from '@phosphor-icons/react/CaretDown';
import { ListIcon } from '@phosphor-icons/react/List';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass';
import { UserIcon } from '@phosphor-icons/react/User';
import { XIcon } from '@phosphor-icons/react/X';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  navigationItemIsActive,
  productNavigation,
  type NavigationItem,
} from '../lib/store-navigation';

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNavigation({ navigation }: { navigation: NavigationItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setProductsOpen(false);
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
              <div className="mobile-products-entry">
                <div>
                  <Link
                    href="/catalog"
                    className={
                      navigationItemIsActive(pathname, '/catalog') ? 'is-active' : undefined
                    }
                    aria-current={
                      navigationItemIsActive(pathname, '/catalog')
                        ? pathname === '/catalog'
                          ? 'page'
                          : 'location'
                        : undefined
                    }
                    onClick={close}
                  >
                    محصولات
                  </Link>
                  <button
                    type="button"
                    aria-label={productsOpen ? 'بستن گروه‌های محصولات' : 'نمایش گروه‌های محصولات'}
                    aria-expanded={productsOpen}
                    aria-controls="mobile-product-links"
                    onClick={() => {
                      setProductsOpen((value) => !value);
                    }}
                  >
                    <CaretDownIcon size={22} weight="light" aria-hidden="true" />
                  </button>
                </div>
                {productsOpen ? (
                  <div id="mobile-product-links" className="mobile-product-links">
                    {productNavigation.map((item) => {
                      const active = navigationItemIsActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          className={active ? 'is-active' : undefined}
                          aria-current={
                            active ? (pathname === item.href ? 'page' : 'location') : undefined
                          }
                          href={item.href}
                          onClick={close}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {navigation
                .filter((item) => item.href !== '/catalog')
                .map((item) => {
                  const active = navigationItemIsActive(pathname, item.href);
                  return (
                    <Link
                      className={active ? 'is-active' : undefined}
                      aria-current={
                        active ? (pathname === item.href ? 'page' : 'location') : undefined
                      }
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      onClick={close}
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </nav>
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
