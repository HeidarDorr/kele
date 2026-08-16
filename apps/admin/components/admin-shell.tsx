import Link from 'next/link';
import { BrandWordmark } from './brand-wordmark';
import { logoutAdministrator } from '../app/login/actions';
import { AdminNavigation } from './admin-navigation';

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
        <AdminNavigation />
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
