'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeAdminSection, adminNavigationLinks } from './admin-navigation-state';

export function AdminNavigation() {
  const pathname = usePathname();
  const current = activeAdminSection(pathname);
  return (
    <nav aria-label="فهرست مدیریت">
      {adminNavigationLinks.map((item) => {
        const active = current === item.section;
        return (
          <Link
            key={item.href}
            className={active ? 'is-active' : undefined}
            aria-current={active ? (pathname === item.href ? 'page' : 'location') : undefined}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
