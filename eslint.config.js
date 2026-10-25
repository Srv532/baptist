import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'test-results/', 'playwright-report/', 'public/engines/'] },
  js.configs.recommended,
  {
    // Browser code (pages + workers).
    files: ['src/**/*.{js,jsx}', 'public/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Without the React plugin, JSX tags are not counted as "uses":
      // ignore components (Capitalised) and framer-motion's `motion`.
      'no-unused-vars': ['error', { varsIgnorePattern: '^([A-Z]|motion$)' }],
    },
  },
  {
    // Node code: build scripts, config files and tests.
    files: ['scripts/**/*.js', 'security/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright specs run page.evaluate() code inside the browser.
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
