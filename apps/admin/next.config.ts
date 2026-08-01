import type { NextConfig } from 'next';

const storefrontOrigin = process.env.STOREFRONT_ORIGIN ?? 'http://127.0.0.1:3000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.KELE_E2E_BUILD === 'true' ? '.next-e2e' : '.next',
  rewrites: () =>
    Promise.resolve([
      {
        source: '/media/:path*',
        destination: `${storefrontOrigin}/media/:path*`,
      },
    ]),
};

export default nextConfig;
