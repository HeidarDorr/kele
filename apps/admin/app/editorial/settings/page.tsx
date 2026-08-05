import { publishSiteSettingsAction, saveSiteSettingsAction } from '../../actions';
import { AdminShell } from '../../../components/admin-shell';
import { getSiteSettingsDraft } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function SiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [settings, parameters] = await Promise.all([getSiteSettingsDraft(), searchParams]);
  const config = settings.configuration;
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Settings</p>
          <h1>تنظیمات سایت</h1>
        </div>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          {parameters.notice === 'published'
            ? 'تنظیمات به‌صورت نسخهٔ تازه منتشر شد.'
            : 'پیش‌نویس تنظیمات ذخیره شد.'}
        </div>
      ) : null}
      <div className="editorial-version-bar">
        <span>پیش‌نویس {settings.revisionNumber.toLocaleString('fa-IR')}</span>
        <span>نسخه {settings.version.toLocaleString('fa-IR')}</span>
      </div>
      <form
        className="editorial-builder"
        action={saveSiteSettingsAction.bind(null, settings.version)}
      >
        <fieldset>
          <legend>هویت برند</legend>
          <div className="compact-form">
            <label>
              نام برند
              <input name="brandName" defaultValue={config.brandName} required />
            </label>
            <label>
              عبارت برند
              <input name="brandTagline" defaultValue={config.brandTagline} required />
            </label>
            <label>
              ایمیل تماس
              <input
                dir="ltr"
                type="email"
                name="contactEmail"
                defaultValue={config.contactEmail ?? ''}
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>ناوبری نوع‌دار</legend>
          <div className="compact-form">
            <label>
              ناوبری اصلی
              <textarea
                name="primaryNavigation"
                rows={6}
                defaultValue={config.primaryNavigation
                  .map((item) => `${item.label}|${item.href}`)
                  .join('\n')}
                required
              />
              <small>هر خط: برچسب|/مسیر-داخلی</small>
            </label>
            <label>
              ناوبری پاورقی
              <textarea
                name="footerNavigation"
                rows={6}
                defaultValue={config.footerNavigation
                  .map((item) => `${item.label}|${item.href}`)
                  .join('\n')}
                required
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>پیام عمومی و تأیید محتوا</legend>
          <div className="compact-form">
            <label>
              پیام کوتاه
              <textarea name="announcement" rows={2} defaultValue={config.announcement ?? ''} />
            </label>
            <label>
              نوع پیام
              <select name="announcementKind" defaultValue={config.announcementKind ?? ''}>
                <option value="">بدون پیام</option>
                <option value="brand">برند</option>
                <option value="legal">حقوقی</option>
                <option value="pricing">قیمت‌گذاری</option>
                <option value="shipping">ارسال</option>
                <option value="returns">مرجوعی</option>
              </select>
            </label>
            <p className="admin-warning">
              متن حقوقی، قیمت، ارسال یا مرجوعی بدون نام و زمان تأییدکننده منتشر نمی‌شود.
            </p>
            <label>
              تأییدکننده
              <input name="contentApprovedBy" defaultValue={settings.contentApprovedBy ?? ''} />
            </label>
            <label>
              زمان تأیید ISO
              <input
                dir="ltr"
                name="contentApprovedAt"
                defaultValue={settings.contentApprovedAt ?? ''}
                placeholder="2026-08-05T12:00:00.000Z"
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>SEO پیش‌فرض</legend>
          <div className="compact-form">
            <label>
              عنوان
              <input name="seoTitle" defaultValue={config.seoDefaults.title} required />
            </label>
            <label>
              توضیح
              <textarea
                name="seoDescription"
                rows={3}
                defaultValue={config.seoDefaults.description}
                required
              />
            </label>
          </div>
        </fieldset>
        <button className="admin-primary" type="submit">
          ذخیرهٔ پیش‌نویس
        </button>
      </form>
      <form
        className="editorial-publish"
        action={publishSiteSettingsAction.bind(null, settings.version)}
      >
        <div>
          <strong>انتشار نسخهٔ تنظیمات</strong>
          <p>نسخهٔ قبلی در تاریخچه باقی می‌ماند و محتوای حساس دوباره کنترل می‌شود.</p>
        </div>
        <button className="admin-primary" type="submit">
          اعتبارسنجی و انتشار
        </button>
      </form>
    </AdminShell>
  );
}
