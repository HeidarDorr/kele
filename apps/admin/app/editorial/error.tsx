'use client';

export default function EditorialError({ reset }: { reset: () => void }) {
  return (
    <main id="admin-main" className="editorial-boundary-state" role="alert">
      <p>Editorial / Recovery</p>
      <h1>دریافت تحریریه ممکن نشد</h1>
      <p>تغییری ذخیره یا منتشر نشده است. اتصال را بررسی و دوباره تلاش کنید.</p>
      <button className="admin-primary" type="button" onClick={reset}>
        تلاش دوباره
      </button>
    </main>
  );
}
