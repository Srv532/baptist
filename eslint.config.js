import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'coverage/', 'test-results/', 'playwright-report/', 'public/engines/'] },
  js.configs.recommended,
  {
    // Browser code (pages + workers).
    files: ['src/**/*.js', 'public/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.worker } },
  },
  {
    // Node code: build scripts, config files and tests.
    files: ['scripts/**/*.js', 'security/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
