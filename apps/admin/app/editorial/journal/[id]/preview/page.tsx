import Image from 'next/image';
import Link from 'next/link';
import { AdminShell } from '../../../../../components/admin-shell';
import { previewJournal } from '../../../../../lib/admin-api';

export const dynamic = 'force-dynamic';
export default async function JournalPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await previewJournal(id);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Protected preview</p>
          <h1>{article.title}</h1>
        </div>
        <Link className="admin-secondary" href={`/editorial/journal/${id}`}>
          بازگشت
        </Link>
      </header>
      <div className="admin-preview-banner">
        این نسخه draft است و برای مشتری یا موتور جست‌وجو قابل دسترس نیست.
      </div>
      <article className="journal-admin-preview">
        <Image
          src={article.coverMedia.url}
          alt={article.coverMedia.alt}
          width={article.coverMedia.width}
          height={article.coverMedia.height}
        />
        <p>{article.excerpt}</p>
        {article.blocks.map((block) =>
          block.type === 'heading' ? (
            <h2 key={block.id}>{block.text}</h2>
          ) : block.type === 'paragraph' || block.type === 'quote' ? (
            <p key={block.id}>{block.text}</p>
          ) : block.type === 'ordered_list' || block.type === 'unordered_list' ? (
            <ul key={block.id}>
              {block.items?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null,
        )}
      </article>
    </AdminShell>
  );
}
