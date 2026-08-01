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
  const fakeOtpCode =
    process.env.NODE_ENV === 'production' ? undefined : (process.env.FAKE_SMS_OTP_CODE ?? '111111');
  return (
    <>
      <SiteHeader categories={categories.items} />
      <main id="main-content" className="shell commerce-page auth-page">
        <SignInForm fakeOtpCode={fakeOtpCode} />
      </main>
      <SiteFooter />
    </>
  );
}
