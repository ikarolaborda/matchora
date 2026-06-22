// Standard Expo + pnpm monorepo Metro config.
// Lets Metro resolve the workspace packages (@matchora/*) from the repo root.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so changes in packages/* hot-reload.
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from the app first, then the monorepo root (hoisted deps).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Honor package "exports" so the @matchora/* barrels resolve correctly.
config.resolver.unstable_enablePackageExports = true;

// 4. The @matchora/* workspace packages are ESM-with-extensions TS: their
// internal imports end in `.js` but resolve to `.ts` source (tsc "Bundler"
// resolution). Metro does not rewrite `.js`->`.ts`, so teach the resolver to
// fall back to the TS source when a `.js` specifier can't be found as-is.
// (The web app does the equivalent via webpack `extensionAlias`.)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      for (const ext of ['.ts', '.tsx']) {
        try {
          return context.resolveRequest(context, moduleName.replace(/\.js$/, ext), platform);
        } catch {
          // try next extension
        }
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
