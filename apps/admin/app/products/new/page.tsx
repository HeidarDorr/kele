import { createProductAction } from '../../actions';
import { AdminShell } from '../../../components/admin-shell';
import { ProductForm } from '../../../components/product-form';
import { listCategories, listMedia } from '../../../lib/admin-api';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const [categories, media] = await Promise.all([listCategories(), listMedia()]);
  return (
    <AdminShell>
      <header className="admin-heading">
        <div>
          <p>Catalog / Create</p>
          <h1>محصول تازه</h1>
        </div>
      </header>
      <p className="admin-intro">
        یک پیش‌نویس کامل بسازید. انتشار فقط پس از اعتبارسنجی قواعد CAT و PUB ممکن است.
      </p>
      <ProductForm action={createProductAction} categories={categories} media={media} />
    </AdminShell>
  );
}
