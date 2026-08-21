import { createOutfitAction } from '../../actions';
import { AdminShell } from '../../../components/admin-shell';
import { OutfitForm } from '../../../components/outfit-form';
import { listCategories, listMedia, listProducts } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function NewOutfitPage() {
  const [categories, media, products] = await Promise.all([
    listCategories(),
    listMedia(),
    listProducts(),
  ]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Outfit / Create</p>
          <h1>ست تازه</h1>
        </div>
      </header>
      <p className="admin-intro">
        اندازه‌ای را که مشتری می‌بیند تعریف کنید و برای هر جزء، رنگ و اندازهٔ دقیق همان محصول را
        انتخاب کنید. نام اندازه‌ها لازم نیست یکسان باشد.
      </p>
      <OutfitForm
        action={createOutfitAction}
        categories={categories}
        media={media}
        products={products.items}
      />
    </AdminShell>
  );
}
