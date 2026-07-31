import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const peyda = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/PeydaWebVF.woff2',
  variable: '--font-peyda',
  display: 'swap',
  weight: '100 900',
});

const elize = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/Elize-Regular.woff2',
  variable: '--font-elize',
  display: 'swap',
  weight: '400',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.STOREFRONT_BASE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'KELE | پوشاک رسمی پسرانه',
    template: '%s | KELE',
  },
  description: 'کاتالوگ پوشاک رسمی پسرانه KELE با نمایش رنگ، اندازه و موجودی.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body className={`${peyda.className} ${peyda.variable} ${elize.variable}`}>{children}</body>
    </html>
  );
}
