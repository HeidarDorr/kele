import Link from 'next/link';
import { archiveOutfitAction, publishOutfitAction, updateOutfitAction } from '../../../actions';
import { AdminShell } from '../../../../components/admin-shell';
import { OutfitForm } from '../../../../components/outfit-form';
import {
  getOutfit,
  listCategories,
  listMedia,
  listOutfitRevisions,
  listProducts,
  validateOutfit,
} from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';

const messages: Record<string, string> = {
  created: 'پیش‌نویس ست ساخته شد.',
  updated: 'ویرایش در پیش‌نویس ذخیره شد؛ نسخهٔ منتشرشده تغییری نکرد.',
  published: 'ویرایش تازه منتشر و ویرایش قبلی تاریخی شد.',
};

export default async function EditOutfitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [outfit, categories, media, products, validation, revisions] = await Promise.all([
    getOutfit(id),
    listCategories(),
    listMedia(),
    listProducts(),
    validateOutfit(id),
    listOutfitRevisions(id),
  ]);
  const updateAction = updateOutfitAction.bind(null, outfit.id, outfit.version);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Outfit / Revision</p>
          <h1>{outfit.name}</h1>
          <p>
            <span className={`status status-${outfit.status}`}>{outfit.status}</span>
            {' · '}ویرایش {outfit.revisionNumber.toLocaleString('fa-IR')} ({outfit.revisionState})
            {' · '}نسخه {outfit.version.toLocaleString('fa-IR')}
          </p>
        </div>
        <div className="heading-actions">
          <Link className="admin-secondary" href={`/outfits/${outfit.id}/preview`}>
            پیش‌نمایش
          </Link>
          <form action={publishOutfitAction.bind(null, outfit.id, outfit.version)}>
            <button
              className="admin-primary"
              type="submit"
              disabled={!validation.valid || outfit.revisionState !== 'draft'}
            >
              انتشار این ویرایش
            </button>
          </form>
          <form action={archiveOutfitAction.bind(null, outfit.id)}>
            <button className="admin-secondary" type="submit">
              بایگانی
            </button>
          </form>
        </div>
      </header>
      {query.notice ? (
        <div className="admin-success" role="status">
          {messages[query.notice] ?? 'تغییر ثبت شد.'}
        </div>
      ) : null}

      <section
        className={validation.valid ? 'validation-box valid' : 'validation-box invalid'}
        aria-labelledby="outfit-validation-title"
      >
        <h2 id="outfit-validation-title">
          {validation.valid ? 'همهٔ نگاشت‌ها آمادهٔ انتشارند' : 'موانع انتشار'}
        </h2>
        {validation.errors.length ? (
          <ul>
            {validation.errors.map((error) => (
              <li key={`${error.path}-${error.ruleId}`}>
                <bdi dir="ltr">{error.ruleId}</bdi> <span>{error.message}</span>{' '}
                <code dir="ltr">{error.path}</code>
              </li>
            ))}
          </ul>
        ) : (
          <p>دسته، تصویر، اجزا، موجودی و تمام نگاشت‌های SKU معتبرند.</p>
        )}
      </section>

      <section className="admin-section outfit-revision-history" aria-labelledby="history-title">
        <h2 id="history-title">تاریخچهٔ تغییرناپذیر</h2>
        <ol>
          {revisions.map((revision) => (
            <li key={revision.id}>
              <strong>ویرایش {revision.revisionNumber.toLocaleString('fa-IR')}</strong>
              <span className={`status status-${revision.state}`}>{revision.state}</span>
              <span>{revision.name}</span>
              <time dateTime={revision.createdAt}>
                {new Date(revision.createdAt).toLocaleDateString('fa-IR')}
              </time>
            </li>
          ))}
        </ol>
      </section>

      <OutfitForm
        action={updateAction}
        categories={categories}
        media={media}
        products={products.items}
        outfit={outfit}
      />
    </AdminShell>
  );
}
