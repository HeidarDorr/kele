'use client';

import { ArrowUpIcon } from '@phosphor-icons/react/ArrowUp';

export function BackToTopButton() {
  return (
    <button
      className="back-to-top"
      type="button"
      aria-label="بازگشت به بالای صفحه"
      title="بازگشت به بالا"
      onClick={() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
      }}
    >
      <ArrowUpIcon size={19} weight="light" aria-hidden="true" />
    </button>
  );
}
