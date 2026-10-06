import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { resolveTypographyVariant } from '@kele/design-system/typography';
import './globals.css';
import { CartProvider } from '../components/cart-provider';

const vazirmatn = localFont({
  src: '../../../packages/design-system/assets/fonts/open-source/Vazirmatn-Variable.woff2',
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: '100 900',
});

const estedad = localFont({
  src: '../../../packages/design-system/assets/fonts/open-source/Estedad-Variable.woff2',
  variable: '--font-estedad',
  display: 'swap',
  weight: '100 900',
});

const parastoo = localFont({
  src: '../../../packages/design-system/assets/fonts/open-source/Parastoo-Variable.ttf',
  variable: '--font-parastoo',
  display: 'swap',
  weight: '400 700',
});

const peyda = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/PeydaWebVF.woff2',
  variable: '--font-peyda',
  display: 'swap',
  weight: '100 900',
  preload: false,
});

const elize = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/Elize-Regular.woff2',
  variable: '--font-elize',
  display: 'swap',
  weight: '400',
  preload: false,
});

const markazi = localFont({
  src: '../../../packages/design-system/assets/fonts/provisional/MarkaziText-Arabic-VF.woff2',
  variable: '--font-markazi',
  display: 'swap',
  weight: '400 700',
  preload: false,
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
  const fontClasses =
    typographyVariant === 'parastoo-vazirmatn'
      ? `${vazirmatn.className} ${vazirmatn.variable} ${parastoo.variable}`
      : typographyVariant === 'estedad-vazirmatn'
        ? `${vazirmatn.className} ${vazirmatn.variable} ${estedad.variable}`
        : `${peyda.className} ${peyda.variable} ${elize.variable} ${markazi.variable}`;

  return (
    <html lang="fa-IR" dir="rtl">
      <body className={fontClasses} data-typography={typographyVariant}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
