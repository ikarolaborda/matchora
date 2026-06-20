/** Web app ESLint config — extends Next.js, keeps barrel-import guard. */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  ignorePatterns: ['.next/', 'node_modules/', 'e2e/', '*.config.*'],
  rules: {
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
