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

module.exports = config;
