import Link from 'next/link';
import { BrandWordmark } from './brand-wordmark';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#admin-main">
        رفتن به محتوای اصلی
      </a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <BrandWordmark />
          <small>مدیریت کاتالوگ</small>
        </Link>
        <nav aria-label="فهرست مدیریت">
          <Link href="/">محصولات</Link>
          <Link href="/products/new">محصول تازه</Link>
          <Link href="/outfits">استایل‌ها</Link>
          <Link href="/outfits/new">استایل تازه</Link>
        </nav>
        <p>نشست توسعهٔ Super Admin</p>
      </aside>
      <main id="admin-main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
