import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Phaser ships browser-only globals; never pull it into a server bundle.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
