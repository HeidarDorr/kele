'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  navigationItemIsActive,
  productNavigation,
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
                  <ul aria-label="گروه‌های محصولات">
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
                            {productItem.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
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
