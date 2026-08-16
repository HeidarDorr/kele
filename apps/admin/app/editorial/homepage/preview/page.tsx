import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../../components/admin-shell';
import { previewHomepage } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function HomepagePreviewPage() {
  const preview = await previewHomepage();
  const media = new Map(preview.media.map((item) => [item.id, item]));
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Protected preview</p>
          <h1>پیش‌نمایش صفحهٔ اصلی</h1>
        </div>
        <Link className="admin-secondary" href="/editorial/homepage">
          بازگشت به ویرایش
        </Link>
      </header>
      <div className="admin-preview-banner" role="status">
        این پیش‌نمایش فقط برای Super Admin است و در فروشگاه عمومی یا موتور جست‌وجو دیده نمی‌شود.
      </div>
      <div className="homepage-admin-preview">
        {preview.sections.map((section) => {
          const content = section.content;
          const asset = 'mediaId' in content ? media.get(content.mediaId) : null;
          return (
            <section key={section.id}>
              {asset ? (
                <span className="homepage-admin-preview-media">
                  <Image src={asset.url} alt={asset.alt} fill sizes="60vw" />
                </span>
              ) : null}
              <div>
                <small>{labels[section.type] ?? section.type}</small>
                <h2>{content.title}</h2>
                {'subtitle' in content ? (
                  <p>{content.subtitle}</p>
                ) : (
                  <p>
                    {'referenceIds' in content
                      ? content.referenceIds.length.toLocaleString('fa-IR')
                      : '۰'}{' '}
                    ارجاع معتبر
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AdminShell>
  );
}

const labels: Record<string, string> = {
  hero: 'تصویر اصلی',
  editorial_banner: 'بنر تحریریه',
  featured_products: 'محصولات منتخب',
  featured_outfits: 'ست‌های منتخب',
  occasion_grid: 'موقعیت‌ها',
  journal_highlights: 'ژورنال',
  brand_story: 'روایت برند',
};
