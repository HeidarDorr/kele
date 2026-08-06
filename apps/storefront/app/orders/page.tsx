import type { Metadata } from 'next';
import { OrderListContent } from '../../components/order-list-content';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';
import { getAcceptancePresentationState } from '../../lib/acceptance-presentation-state.server';

export const metadata: Metadata = {
  title: 'سفارش‌های من',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const [categories, acceptanceState] = await Promise.all([
    getCategories().catch(() => ({ items: [] })),
    getAcceptancePresentationState(['loading', 'empty', 'error'] as const),
  ]);
  return (
    <>
      <SiteHeader categories={categories.items} />
      <OrderListContent acceptanceState={acceptanceState} />
      <SiteFooter />
    </>
  );
}
