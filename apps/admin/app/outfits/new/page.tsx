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
          <h1>استایل تازه</h1>
        </div>
      </header>
      <p className="admin-intro">
        اندازهٔ مشتری را تعریف کنید و برای هر جزء، SKU دقیق همان اندازه را انتخاب کنید. نام
        اندازه‌ها لازم نیست یکسان باشد.
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
