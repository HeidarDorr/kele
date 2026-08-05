import { randomUUID } from 'node:crypto';
import { createJournalAction } from '../../../actions';
import { AdminShell } from '../../../../components/admin-shell';
import { JournalEditorForm } from '../../../../components/journal-editor-form';
import { listMedia, type AdminJournalArticle } from '../../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function NewJournalPage() {
  const media = await listMedia();
  const article: Pick<
    AdminJournalArticle,
    'slug' | 'title' | 'excerpt' | 'coverMediaId' | 'seoTitle' | 'seoDescription' | 'blocks'
  > = {
    slug: '',
    title: '',
    excerpt: null,
    coverMediaId: null,
    seoTitle: null,
    seoDescription: null,
    blocks: [
      { id: randomUUID(), type: 'heading' as const, level: 2, text: '' },
      { id: randomUUID(), type: 'paragraph' as const, text: '' },
      { id: randomUUID(), type: 'quote' as const, text: '' },
      { id: randomUUID(), type: 'unordered_list' as const, items: [''] },
      { id: randomUUID(), type: 'image', mediaId: media[0]?.id ?? '' },
      { id: randomUUID(), type: 'product_reference' as const, referenceId: '', label: '' },
    ],
  };
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Editorial / Journal</p>
          <h1>مقالهٔ تازه</h1>
        </div>
      </header>
      <JournalEditorForm article={article} media={media} action={createJournalAction} />
    </AdminShell>
  );
}
