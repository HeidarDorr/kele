import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { resolveTypographyVariant } from '@kele/design-system/typography';
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
  const typographyVariant = resolveTypographyVariant(process.env.KELE_TYPOGRAPHY);

  return (
    <html lang="fa-IR" dir="rtl">
      <body
        className={`${peyda.className} ${peyda.variable} ${elize.variable}`}
        data-typography={typographyVariant}
      >
        {children}
      </body>
    </html>
  );
}
