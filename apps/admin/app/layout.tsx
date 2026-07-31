import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const peyda = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/PeydaWebVF.woff2',
  variable: '--font-peyda',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'مدیریت کاتالوگ KELE',
  description: 'ایجاد، اعتبارسنجی، پیش‌نمایش و انتشار کاتالوگ KELE',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body className={peyda.variable}>{children}</body>
    </html>
  );
}
