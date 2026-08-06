import type { NextConfig } from 'next';

const storefrontOrigin = process.env.STOREFRONT_ORIGIN ?? 'http://127.0.0.1:3000';
const apiOrigin = new URL(process.env.API_BASE_URL ?? 'http://127.0.0.1:3001/api/v1').origin;
const production = process.env.NODE_ENV === 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  ...(production ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.KELE_E2E_BUILD === 'true' ? '.next-e2e' : '.next',
  headers: () =>
    Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), geolocation=(), microphone=(), payment=()',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...(production
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
    ]),
  rewrites: () =>
    Promise.resolve([
      {
        source: '/media/:path*',
        destination: `${storefrontOrigin}/media/:path*`,
      },
    ]),
};

export default nextConfig;
