'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  navigationItemIsActive,
  productNavigation,
  productsMenuPromo,
  type NavigationItem,
} from '../lib/store-navigation';

export function DesktopNavigation({ navigation }: { navigation: readonly NavigationItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="desktop-nav" aria-label="فهرست اصلی">
      <ul>
        {navigation.map((item) => {
          const active = navigationItemIsActive(pathname, item.href);
          if (item.href === '/catalog') {
            return (
              <li className="desktop-products-item" key={item.href}>
                <Link
                  className={active ? 'is-active' : undefined}
                  href={item.href}
                  aria-current={active ? (pathname === item.href ? 'page' : 'location') : undefined}
                  aria-haspopup="true"
                >
                  {item.label}
                </Link>
                <div className="desktop-products-menu">
                  <div className="desktop-products-panel">
                    <Link className="desktop-products-promo" href={productsMenuPromo.href}>
                      <Image
                        src={productsMenuPromo.imageSrc}
                        alt={productsMenuPromo.imageAlt}
                        fill
                        loading="eager"
                        unoptimized
                        sizes="(max-width: 1279px) 32vw, 28rem"
                      />
                      <span className="desktop-products-promo-copy">
                        <strong>{productsMenuPromo.title}</strong>
                        <span>{productsMenuPromo.action}</span>
                      </span>
                    </Link>
                    <ul className="desktop-products-grid" aria-label="گروه‌های محصولات">
                      {productNavigation.map((productItem) => {
                        const childActive = navigationItemIsActive(pathname, productItem.href);
                        return (
                          <li key={productItem.href}>
                            <Link
                              className={childActive ? 'is-active' : undefined}
                              href={productItem.href}
                              aria-current={
                                childActive
                                  ? pathname === productItem.href
                                    ? 'page'
                                    : 'location'
                                  : undefined
                              }
                            >
                              <Image
                                src={productItem.iconSrc}
                                alt=""
                                aria-hidden="true"
                                width={512}
                                height={512}
                                loading="eager"
                                unoptimized
                              />
                              <strong>{productItem.label}</strong>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          }
          return (
            <li key={`${item.href}-${item.label}`}>
              <Link
                className={active ? 'is-active' : undefined}
                href={item.href}
                aria-current={active ? (pathname === item.href ? 'page' : 'location') : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
