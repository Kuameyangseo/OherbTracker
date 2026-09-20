import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['100.90.104.20'],
  // Keep the long-running PM2 dev server isolated from production builds.
  distDir: process.env.NEXT_PHASE === 'phase-production-build' ? '.next' : '.next-dev',
  webpack(config) {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: 'http://localhost:3333/api/:path*',
    }];
  },
};

export default nextConfig;
