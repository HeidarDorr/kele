import type { Metadata } from 'next';
import { SignInForm } from '../../components/sign-in-form';
import { SiteFooter } from '../../components/site-footer';
import { SiteHeader } from '../../components/site-header';
import { getCategories } from '../../lib/catalog-api';

export const metadata: Metadata = {
  title: 'ورود',
  robots: { index: false, follow: false },
};

export default async function SignInPage() {
  const categories = await getCategories().catch(() => ({ items: [] }));
  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell commerce-page auth-page">
        <SignInForm />
      </main>
      <SiteFooter />
    </>
  );
}
