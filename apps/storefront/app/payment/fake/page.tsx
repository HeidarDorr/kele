import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FakePaymentContent } from '../../../components/fake-payment-content';

export const metadata: Metadata = {
  title: 'درگاه آزمایشی',
  robots: { index: false, follow: false },
};

export default function FakePaymentPage() {
  return (
    <Suspense fallback={null}>
      <FakePaymentContent />
    </Suspense>
  );
}
