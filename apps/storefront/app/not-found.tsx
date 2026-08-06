import Link from 'next/link';
import { BrandWordmark } from '../components/brand-wordmark';
import { SiteFooter } from '../components/site-footer';
import { SiteHeader } from '../components/site-header';

export default function NotFound() {
  return (
    <>
      <SiteHeader categories={[]} />
      <main id="main-content" className="shell standalone-state">
        <BrandWordmark className="standalone-wordmark" />
        <h1>این صفحه پیدا نشد</h1>
        <p>ممکن است محصول آرشیو شده باشد یا نشانی تغییر کرده باشد.</p>
        <Link className="button-primary" href="/catalog">
          بازگشت به کاتالوگ
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
