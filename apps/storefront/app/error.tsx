'use client';

import { BrandWordmark } from '../components/brand-wordmark';

export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="shell standalone-state" role="alert">
      <BrandWordmark className="wordmark" alt="KELE" priority />
      <h1>نمایش صفحه ممکن نشد</h1>
      <p>اتصال کاتالوگ را بررسی کنید و دوباره تلاش کنید.</p>
      <button className="button-primary" type="button" onClick={reset}>
        تلاش دوباره
      </button>
    </main>
  );
}
