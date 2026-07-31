import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell standalone-state">
      <p className="wordmark">KELE</p>
      <h1>این صفحه پیدا نشد</h1>
      <p>ممکن است محصول آرشیو شده باشد یا نشانی تغییر کرده باشد.</p>
      <Link className="button-primary" href="/catalog">
        بازگشت به کاتالوگ
      </Link>
    </main>
  );
}
