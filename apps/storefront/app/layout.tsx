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

const markazi = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/MarkaziText-Arabic-VF.woff2',
  variable: '--font-markazi',
  display: 'swap',
  weight: '400 700',
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
  const typographyVariant = resolveTypographyVariant(process.env.KELE_TYPOGRAPHY);

  return (
    <html lang="fa-IR" dir="rtl">
      <body
        className={`${peyda.className} ${peyda.variable} ${elize.variable} ${markazi.variable}`}
        data-typography={typographyVariant}
      >
        {children}
      </body>
    </html>
  );
}
