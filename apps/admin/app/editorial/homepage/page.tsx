import Link from 'next/link';
import { publishHomepageAction, saveHomepageAction } from '../../actions';
import { AdminShell } from '../../../components/admin-shell';
import { MediaSelect } from '../../../components/media-select';
import { getHomepageDraft, listMedia } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

const labels: Record<string, string> = {
  hero: 'تصویر اصلی',
  editorial_banner: 'بنر تحریریه',
  featured_products: 'محصولات منتخب',
  featured_outfits: 'ست‌های منتخب',
  occasion_grid: 'موقعیت‌ها',
  journal_highlights: 'ژورنال',
  brand_story: 'روایت برند',
};

export default async function HomepageEditor({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const [draft, media, parameters] = await Promise.all([
    getHomepageDraft(),
    listMedia(),
    searchParams,
  ]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Homepage</p>
          <h1>صفحهٔ اصلی</h1>
        </div>
        <Link className="admin-secondary" href="/editorial/homepage/preview">
          پیش‌نمایش محافظت‌شده
        </Link>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          {parameters.notice === 'published'
            ? 'نسخه پس از اعتبارسنجی منتشر شد.'
            : 'پیش‌نویس ذخیره شد؛ نسخهٔ منتشرشده تغییری نکرد.'}
        </div>
      ) : null}
      <div className="editorial-version-bar">
        <span>پیش‌نویس {draft.revisionNumber.toLocaleString('fa-IR')}</span>
        <span>نسخهٔ هم‌روندی {draft.version.toLocaleString('fa-IR')}</span>
        <time dateTime={draft.updatedAt}>
          {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(draft.updatedAt),
          )}
        </time>
      </div>
      <form className="editorial-builder" action={saveHomepageAction.bind(null, draft.version)}>
        {draft.sections
          .sort((a, b) => a.order - b.order)
          .map((section) => {
            const content = section.content;
            const mediaContent = 'mediaId' in content;
            return (
              <fieldset key={section.id}>
                <input type="hidden" name="sectionId" value={section.id} />
                <input type="hidden" name={`type:${section.id}`} value={section.type} />
                <legend>
                  <span>{String(section.order).padStart(2, '0')}</span>
                  {labels[section.type] ?? section.type}
                </legend>
                <div className="compact-form">
                  <label className="editorial-toggle">
                    <input
                      type="checkbox"
                      name={`enabled:${section.id}`}
                      defaultChecked={section.enabled}
                    />
                    نمایش در نسخهٔ بعدی
                  </label>
                  <label>
                    ترتیب
                    <input
                      name={`order:${section.id}`}
                      type="number"
                      min={0}
                      defaultValue={section.order}
                      required
                    />
                  </label>
                  <label>
                    عنوان
                    <input
                      name={`title:${section.id}`}
                      defaultValue={content.title}
                      maxLength={180}
                      required
                    />
                  </label>
                  {mediaContent ? (
                    <>
                      <label>
                        زیرعنوان
                        <textarea
                          name={`subtitle:${section.id}`}
                          defaultValue={content.subtitle ?? ''}
                          rows={2}
                        />
                      </label>
                      <MediaSelect
                        name={`mediaId:${section.id}`}
                        label="رسانه"
                        media={media}
                        defaultValue={content.mediaId}
                        required
                        allowEmpty={false}
                      />
                      <div className="inline-fields">
                        <label>
                          متن اقدام
                          <input
                            name={`ctaLabel:${section.id}`}
                            defaultValue={content.ctaLabel ?? ''}
                          />
                        </label>
                        <label>
                          مسیر داخلی
                          <input
                            dir="ltr"
                            name={`href:${section.id}`}
                            defaultValue={content.href ?? ''}
                            placeholder="/catalog"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label>
                      شناسه‌های ارجاع‌شده
                      <textarea
                        dir="ltr"
                        name={`referenceIds:${section.id}`}
                        defaultValue={content.referenceIds.join('\n')}
                        rows={3}
                      />
                      <small>هر شناسه در یک خط؛ تنها محتوای منتشرشده قابل انتشار است.</small>
                    </label>
                  )}
                </div>
              </fieldset>
            );
          })}
        <button className="admin-primary" type="submit">
          ذخیرهٔ پیش‌نویس
        </button>
      </form>
      <form className="editorial-publish" action={publishHomepageAction.bind(null, draft.version)}>
        <div>
          <strong>انتشار نسخه</strong>
          <p>دقیقاً یک Hero فعال، رسانه‌های موجود و ارجاع‌های منتشرشده لازم است.</p>
        </div>
        <button className="admin-primary" type="submit">
          اعتبارسنجی و انتشار
        </button>
      </form>
    </AdminShell>
  );
}
