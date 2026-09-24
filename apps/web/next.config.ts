import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['100.88.49.91', '100.90.104.20', 'localhost', '127.0.0.1'],
  // Keep development output isolated from production builds and starts.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
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
