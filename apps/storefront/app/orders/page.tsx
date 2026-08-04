import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderListContent } from '../../components/order-list-content';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'سفارش‌های من',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <Suspense
        fallback={
          <main id="main-content" className="shell commerce-page">
            <div className="commerce-page-state" role="status">
              در حال دریافت سفارش‌ها…
            </div>
          </main>
        }
      >
        <OrderListContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
