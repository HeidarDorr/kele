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
  title: 'مدیریت کاتالوگ KELE',
  description: 'ایجاد، اعتبارسنجی، پیش‌نمایش و انتشار کاتالوگ KELE',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body className={`${peyda.className} ${peyda.variable} ${elize.variable}`}>{children}</body>
    </html>
  );
}
