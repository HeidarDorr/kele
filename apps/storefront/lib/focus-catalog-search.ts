export const catalogSearchHash = '#catalog-search';
export const catalogSearchHref = `/catalog?focus=search${catalogSearchHash}`;

export function focusCatalogSearch(): boolean {
  const input = document.querySelector<HTMLInputElement>('#catalog-query');
  const form = document.querySelector<HTMLElement>(catalogSearchHash);
  if (!input || !form) return false;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const formBox = form.getBoundingClientRect();
  const targetCenter = window.innerHeight * (window.innerWidth >= 1024 ? 0.62 : 0.58);
  const targetTop = Math.max(0, window.scrollY + formBox.top - (targetCenter - formBox.height / 2));
  window.scrollTo({ top: targetTop, behavior: reducedMotion ? 'auto' : 'smooth' });
  input.focus({ preventScroll: true });
  return true;
}
