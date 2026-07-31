import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <div className="footer-wordmark">KELE</div>
          <p>پوشاک رسمی پسرانه با نگاهی آرام به فرم و جزئیات.</p>
        </div>
        <nav aria-label="راهنمای فروشگاه">
          <h2>فروشگاه</h2>
          <Link href="/catalog">همهٔ محصولات</Link>
          <Link href="/catalog?sort=newest">تازه‌ها</Link>
        </nav>
        <div>
          <h2>راهنمای محصول</h2>
          <p>رنگ، اندازه و وضعیت موجودی هر محصول در صفحهٔ همان محصول نمایش داده می‌شود.</p>
        </div>
      </div>
    </footer>
  );
}
