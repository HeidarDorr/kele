import Link from 'next/link';
import { BrandWordmark } from './brand-wordmark';
import { logoutAdministrator } from '../app/login/actions';

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-layout">
      <a className="skip-link" href="#admin-main">
        رفتن به محتوای اصلی
      </a>
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/">
          <BrandWordmark />
          <small>مدیریت عملیات</small>
        </Link>
        <nav aria-label="فهرست مدیریت">
          <Link href="/">محصولات</Link>
          <Link href="/products/new">محصول تازه</Link>
          <Link href="/outfits">استایل‌ها</Link>
          <Link href="/outfits/new">استایل تازه</Link>
          <Link href="/editorial">تحریریه</Link>
          <Link href="/editorial/homepage">صفحهٔ اصلی</Link>
          <Link href="/editorial/journal">ژورنال</Link>
          <Link href="/editorial/discovery">کشف موقعیتی</Link>
          <Link href="/editorial/settings">تنظیمات سایت</Link>
          <Link href="/editorial/media">رسانه‌ها</Link>
          <Link href="/operations/orders">سفارش‌ها</Link>
          <Link href="/operations/returns">مرجوعی‌ها</Link>
          <Link href="/operations/bulk">عملیات گروهی</Link>
          <Link href="/operations/audit">رویدادها</Link>
        </nav>
        {process.env.ADMIN_SESSION_PROVIDER === 'postgres_otp' ? (
          <form action={logoutAdministrator}>
            <button className="admin-sidebar-logout" type="submit">
              خروج امن
            </button>
          </form>
        ) : (
          <p>نشست توسعهٔ Super Admin</p>
        )}
      </aside>
      <main id="admin-main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
