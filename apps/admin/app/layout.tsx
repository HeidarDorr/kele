import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'مدیریت KELE', description: 'پایهٔ مدیریت KELE' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
