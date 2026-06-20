import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build a self-contained server bundle for the Docker runtime image.
  output: 'standalone',
  // Monorepo: trace workspace deps from the repo root (two levels up).
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['@matchora/shared', '@matchora/config', '@matchora/data', '@matchora/ui'],
  experimental: {
    externalDir: true,
  },
  // kafkajs / pg are server-only; never bundle them into client/edge output.
  serverExternalPackages: ['kafkajs', 'pg'],
  webpack: (config) => {
    // The shared workspace packages are authored as ESM-with-extensions TS
    // (imports end in `.js` but resolve to `.ts` under moduleResolution:
    // Bundler). Teach webpack to resolve `.js` specifiers to their TS source.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
