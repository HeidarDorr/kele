import type { Metadata } from 'next';
import { CartPageContent } from '../../components/cart-page-content';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'سبد خرید',
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <CartPageContent />
      <SiteFooter />
    </>
  );
}
