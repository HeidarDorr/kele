import type { Metadata } from 'next';
import { CheckoutContent } from '../../components/checkout-content';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'ارسال و پرداخت',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <CheckoutContent />
      <SiteFooter />
    </>
  );
}
