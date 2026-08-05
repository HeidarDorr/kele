import Link from 'next/link';
import { BrandWordmark } from './brand-wordmark';
import type { PublishedSiteSettings } from '../lib/editorial-api';

export function SiteFooter({ settings }: { settings?: PublishedSiteSettings | null }) {
  const configuration = settings?.configuration;
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <BrandWordmark className="footer-wordmark" />
          <p>{configuration?.brandTagline ?? 'پوشش کودک با نگاهی آرام به فرم و جزئیات.'}</p>
        </div>
        <nav aria-label="راهنمای فروشگاه">
          <h2>فروشگاه</h2>
          {(
            configuration?.footerNavigation ?? [
              { label: 'همهٔ محصولات', href: '/catalog' },
              { label: 'ژورنال', href: '/journal' },
            ]
          ).map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div>
          <h2>ارتباط</h2>
          {configuration?.contactEmail ? (
            <a href={`mailto:${configuration.contactEmail}`} dir="ltr">
              {configuration.contactEmail}
            </a>
          ) : (
            <p>راه ارتباطی پس از تأیید و انتشار تنظیمات نمایش داده می‌شود.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
