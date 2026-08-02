import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentResultContent } from '../../../components/payment-result-content';
import { SiteFooter } from '../../../components/site-footer';
import { SiteHeader } from '../../../components/site-header';
import { getCategories } from '../../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'نتیجه پرداخت',
  robots: { index: false, follow: false },
};

export default async function PaymentResultPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <Suspense fallback={null}>
        <PaymentResultContent />
      </Suspense>
      <SiteFooter />
    </>
  );
}
