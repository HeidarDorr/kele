import Link from 'next/link';
import { AdminShell } from '../../components/admin-shell';
import { getHomepageDraft, getSiteSettingsDraft, listJournalDrafts } from '../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function EditorialHubPage() {
  const [homepage, journal, settings] = await Promise.all([
    getHomepageDraft(),
    listJournalDrafts(),
    getSiteSettingsDraft(),
  ]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Content / Editorial</p>
          <h1>تحریریهٔ KELE</h1>
        </div>
      </header>
      <p className="admin-lead">
        پیش‌نویس‌ها از محتوای مشتری جدا هستند. انتشار فقط پس از اعتبارسنجی و با نسخهٔ جاری انجام
        می‌شود.
      </p>
      <div className="editorial-admin-grid">
        <Link href="/editorial/homepage">
          <small>صفحهٔ اصلی</small>
          <strong>نسخهٔ پیش‌نویس {homepage.revisionNumber.toLocaleString('fa-IR')}</strong>
          <span>{homepage.sections.length.toLocaleString('fa-IR')} بخش نوع‌دار</span>
        </Link>
        <Link href="/editorial/journal">
          <small>ژورنال</small>
          <strong>{journal.length.toLocaleString('fa-IR')} مقاله</strong>
          <span>نگارش ساخت‌یافته و پیش‌نمایش محافظت‌شده</span>
        </Link>
        <Link href="/editorial/discovery">
          <small>کشف</small>
          <strong>دسته و موقعیت</strong>
          <span>روایت، تصویر و SEO هر مسیر</span>
        </Link>
        <Link href="/editorial/settings">
          <small>تنظیمات سایت</small>
          <strong>نسخهٔ {settings.revisionNumber.toLocaleString('fa-IR')}</strong>
          <span>ناوبری، برند و محتوای نیازمند تأیید</span>
        </Link>
        <Link href="/editorial/media">
          <small>رسانه</small>
          <strong>حذف ایمن</strong>
          <span>مشاهدهٔ همهٔ ارجاع‌ها پیش از حذف</span>
        </Link>
      </div>
    </AdminShell>
  );
}
