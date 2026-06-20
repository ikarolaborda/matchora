/** Root ESLint config. Packages may extend with framework-specific configs. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: { node: true, es2022: true, browser: true },
  ignorePatterns: ['dist/', '.next/', 'node_modules/', '.expo/', '*.config.js', '*.config.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@matchora/*/src/*', '@matchora/*/dist/*'],
            message: 'Import from the package barrel (@matchora/<pkg>), not deep internals.',
          },
        ],
      },
    ],
  },
};
