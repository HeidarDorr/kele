'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react/MagnifyingGlass';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  catalogSearchHash,
  catalogSearchHref,
  focusCatalogSearch,
} from '../lib/focus-catalog-search';

export function HeaderSearchLink() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/catalog') return;
    if (new URLSearchParams(window.location.search).get('focus') !== 'search') return;

    const focusTimers = [0, 200, 600].map((delay) =>
      window.setTimeout(() => {
        focusCatalogSearch();
      }, delay),
    );

    const cancelScheduledFocus = () => {
      focusTimers.forEach((timer) => {
        window.clearTimeout(timer);
      });
    };

    window.addEventListener('pointerdown', cancelScheduledFocus, { capture: true, once: true });
    window.addEventListener('keydown', cancelScheduledFocus, { capture: true, once: true });

    return () => {
      cancelScheduledFocus();
      window.removeEventListener('pointerdown', cancelScheduledFocus, { capture: true });
      window.removeEventListener('keydown', cancelScheduledFocus, { capture: true });
    };
  }, [pathname]);

  return (
    <Link
      className="header-search"
      href={catalogSearchHref}
      aria-label="جست‌وجوی محصولات"
      onClick={(event) => {
        if (pathname !== '/catalog') return;
        event.preventDefault();
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${catalogSearchHash}`,
        );
        focusCatalogSearch();
      }}
    >
      <MagnifyingGlassIcon size={20} weight="light" aria-hidden="true" />
    </Link>
  );
}
