import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FakePaymentContent } from '../../../components/fake-payment-content';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { getCategories } from '../../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'درگاه آزمایشی',
  robots: { index: false, follow: false },
};

export default async function FakePaymentPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <Suspense fallback={null}>
        <FakePaymentContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
