import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  distDir: process.env.KELE_E2E_BUILD === 'true' ? '.next-e2e' : '.next',
};

export default nextConfig;
