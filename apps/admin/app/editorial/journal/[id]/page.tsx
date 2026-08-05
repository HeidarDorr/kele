import Link from 'next/link';
import { archiveJournalAction, publishJournalAction, saveJournalAction } from '../../../actions';
import { AdminShell } from '../../../../components/admin-shell';
import { JournalEditorForm } from '../../../../components/journal-editor-form';
import { getJournalDraft, listMedia } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function EditJournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const [{ id }, parameters] = await Promise.all([params, searchParams]);
  const [article, media] = await Promise.all([getJournalDraft(id), listMedia()]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Journal</p>
          <h1>{article.title}</h1>
        </div>
        <Link className="admin-secondary" href={`/editorial/journal/${id}/preview`}>
          پیش‌نمایش محافظت‌شده
        </Link>
      </header>
      {parameters.notice ? (
        <div className="admin-success" role="status">
          {parameters.notice === 'published'
            ? 'یک snapshot تغییرناپذیر منتشر شد.'
            : 'پیش‌نویس ذخیره شد؛ انتشار قبلی دست‌نخورده ماند.'}
        </div>
      ) : null}
      <div className="editorial-version-bar">
        <span>وضعیت {article.status}</span>
        <span>نسخه {article.version.toLocaleString('fa-IR')}</span>
        <span>{article.publicationCount.toLocaleString('fa-IR')} انتشار تاریخی</span>
      </div>
      <JournalEditorForm
        article={article}
        media={media}
        action={saveJournalAction.bind(null, id, article.version)}
      />
      <div className="editorial-action-row">
        <form action={publishJournalAction.bind(null, id, article.version)}>
          <button className="admin-primary" type="submit">
            اعتبارسنجی و انتشار snapshot
          </button>
        </form>
        <form action={archiveJournalAction.bind(null, id, article.version)}>
          <button className="admin-danger" type="submit">
            بایگانی مسیر عمومی
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
