/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@matchora/shared', '@matchora/config', '@matchora/data', '@matchora/ui'],
  experimental: {
    externalDir: true,
  },
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
