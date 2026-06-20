import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === 'development';

/**
 * Next-15-SAFE Content-Security-Policy (NON-nonce).
 *
 * This deliberately avoids a strict-nonce policy because that requires a
 * middleware/proxy rewrite to inject a per-request nonce into every inline
 * script. The Next.js runtime emits inline bootstrap scripts and inline
 * styles, so we allow `'unsafe-inline'` for script/style. `'unsafe-eval'` is
 * permitted ONLY in development (React refresh / fast-refresh tooling needs
 * it); production omits it.
 *
 * `connect-src 'self'` keeps the same-origin SSE stream
 * (`/api/live/matches/[fixtureId]/events`) working — EventSource connects back
 * to the same origin, so no extra source is required.
 *
 * TODO(security): tighten to a strict-dynamic nonce-based CSP once a
 * middleware/proxy is introduced (see Next.js CSP guide). At that point drop
 * `'unsafe-inline'` from script-src in favor of `'nonce-<value>' 'strict-dynamic'`.
 */
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
]
  .join('; ')
  .concat(';');

/** Baseline security headers applied to every route. */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Minimal Permissions-Policy: disable powerful features the app does not use.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Content-Security-Policy', value: cspHeader },
  // HSTS only in production; harmless on http during local dev but pointless,
  // and we avoid surprising developers behind plain-http proxies.
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
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
