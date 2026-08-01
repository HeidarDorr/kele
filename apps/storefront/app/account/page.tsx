import type { Metadata } from 'next';
import { AccountContent } from '../../components/account-content';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'حساب مشتری',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <AccountContent />
      <SiteFooter />
    </>
  );
}
