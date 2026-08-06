import type { Metadata } from 'next';
import { OrderContent } from '../../../components/order-content';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { getCategories } from '../../../lib/catalog-api';
import { getAcceptancePresentationState } from '../../../lib/acceptance-presentation-state.server';

export const metadata: Metadata = {
  title: 'جزئیات سفارش',
  robots: { index: false, follow: false },
};

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const [{ orderNumber }, categories, acceptanceState] = await Promise.all([
    params,
    getCategories().catch(() => ({ items: [] })),
    getAcceptancePresentationState(['loading', 'error', 'unavailable'] as const),
  ]);
  return (
    <>
      <SiteHeader categories={categories.items} />
      <OrderContent orderNumber={orderNumber} acceptanceState={acceptanceState} />
      <SiteFooter />
    </>
  );
}
