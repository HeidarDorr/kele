import type { AdminJournalArticle, MediaValue } from '../lib/admin-api';
import { MediaSelect } from './media-select';

type JournalBlock = AdminJournalArticle['blocks'][number];

const blockLabels: Record<string, string> = {
  heading: 'تیتر',
  paragraph: 'پاراگراف',
  quote: 'نقل‌قول',
  ordered_list: 'فهرست شماره‌دار',
  unordered_list: 'فهرست',
  image: 'تصویر',
  product_reference: 'ارجاع محصول',
  outfit_reference: 'ارجاع ست',
  external_link: 'پیوند بیرونی HTTPS',
  divider: 'جداکننده',
};

export function JournalEditorForm({
  article,
  media,
  action,
}: {
  article: Pick<
    AdminJournalArticle,
    'slug' | 'title' | 'excerpt' | 'coverMediaId' | 'blocks' | 'seoTitle' | 'seoDescription'
  >;
  media: MediaValue[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form className="editorial-builder journal-editor" action={action}>
      <fieldset>
        <legend>هویت مقاله</legend>
        <div className="compact-form">
          <label>
            عنوان
            <input name="title" defaultValue={article.title} maxLength={180} required />
          </label>
          <label>
            Slug
            <input
              dir="ltr"
              name="slug"
              defaultValue={article.slug}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </label>
          <label>
            خلاصه
            <textarea
              name="excerpt"
              defaultValue={article.excerpt ?? ''}
              rows={3}
              maxLength={500}
            />
          </label>
          <MediaSelect
            name="coverMediaId"
            label="تصویر جلد"
            media={media}
            defaultValue={article.coverMediaId}
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>بلوک‌های مجاز</legend>
        <p className="admin-note">
          هر بلوک به عنصر امن React تبدیل می‌شود. HTML، iframe و اسکریپت پذیرفته نمی‌شود.
        </p>
        {article.blocks.map((block, index) => (
          <BlockEditor block={block} media={media} index={index} key={block.id} />
        ))}
      </fieldset>
      <fieldset>
        <legend>SEO</legend>
        <div className="compact-form">
          <label>
            عنوان موتور جست‌وجو
            <input name="seoTitle" defaultValue={article.seoTitle ?? ''} maxLength={180} />
          </label>
          <label>
            توضیح موتور جست‌وجو
            <textarea
              name="seoDescription"
              defaultValue={article.seoDescription ?? ''}
              maxLength={320}
              rows={3}
            />
          </label>
        </div>
      </fieldset>
      <button className="admin-primary" type="submit">
        ذخیرهٔ پیش‌نویس
      </button>
    </form>
  );
}

function BlockEditor({
  block,
  media,
  index,
}: {
  block: JournalBlock;
  media: MediaValue[];
  index: number;
}) {
  return (
    <div className="journal-block-editor">
      <input type="hidden" name="blockId" value={block.id} />
      <input type="hidden" name={`blockType:${block.id}`} value={block.type} />
      <header>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{blockLabels[block.type] ?? block.type}</strong>
      </header>
      {['heading', 'paragraph', 'quote'].includes(block.type) ? (
        <label>
          متن
          <textarea
            name={`blockText:${block.id}`}
            defaultValue={block.text ?? ''}
            rows={block.type === 'paragraph' ? 5 : 2}
            required
          />
        </label>
      ) : null}
      {block.type === 'heading' ? (
        <label>
          سطح
          <select name={`blockLevel:${block.id}`} defaultValue={block.level ?? 2}>
            <option value="2">H2</option>
            <option value="3">H3</option>
          </select>
        </label>
      ) : null}
      {block.type === 'ordered_list' || block.type === 'unordered_list' ? (
        <label>
          هر مورد در یک خط
          <textarea
            name={`blockItems:${block.id}`}
            defaultValue={block.items?.join('\n') ?? ''}
            rows={4}
            required
          />
        </label>
      ) : null}
      {block.type === 'image' ? (
        <MediaSelect
          name={`blockMediaId:${block.id}`}
          label="رسانه"
          media={media}
          defaultValue={block.mediaId}
          required
          allowEmpty={false}
        />
      ) : null}
      {block.type === 'product_reference' || block.type === 'outfit_reference' ? (
        <div className="inline-fields">
          <label>
            شناسهٔ مرجع
            <input
              dir="ltr"
              name={`blockReferenceId:${block.id}`}
              defaultValue={block.referenceId ?? ''}
              required
            />
          </label>
          <label>
            برچسب
            <input name={`blockLabel:${block.id}`} defaultValue={block.label ?? ''} />
          </label>
        </div>
      ) : null}
      {block.type === 'external_link' ? (
        <div className="inline-fields">
          <label>
            برچسب
            <input name={`blockLabel:${block.id}`} defaultValue={block.label ?? ''} required />
          </label>
          <label>
            نشانی HTTPS
            <input
              dir="ltr"
              name={`blockHref:${block.id}`}
              defaultValue={block.href ?? ''}
              required
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
