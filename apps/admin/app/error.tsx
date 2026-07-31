'use client';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="admin-error" role="alert">
      <h1>دریافت اطلاعات مدیریت ممکن نشد</h1>
      <p>اتصال API یا نشست مدیریت را بررسی کنید.</p>
      <button type="button" className="admin-primary" onClick={reset}>
        تلاش دوباره
      </button>
    </main>
  );
}
