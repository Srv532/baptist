import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import { DEV_HEADERS, headersForPath } from './security/headers.js';

/**
 * Applies our HTTP headers to Vite's own servers (spec A4):
 *   - `npm run dev`:     only the cross-origin isolation headers;
 *   - `npm run preview`: the full production header set.
 */
function securityHeaders() {
  return {
    name: 'baptist-security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        for (const [name, value] of Object.entries(DEV_HEADERS)) res.setHeader(name, value);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const { pathname } = new URL(req.url ?? '/', 'http://localhost');
        for (const [name, value] of Object.entries(headersForPath(pathname))) {
          res.setHeader(name, value);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    securityHeaders(),
    // Production build only. Our own code is scrambled; node_modules and the
    // ffmpeg engine are left alone. No selfDefending/debugProtection: both
    // rely on eval-style tricks that our CSP (and Trusted Types) forbid.
    obfuscatorPlugin({
      apply: 'build',
      include: [/src\/.*\.(js|jsx)$/],
      exclude: [/node_modules/],
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        renameGlobals: false,
        identifierNamesGenerator: 'hexadecimal',
        sourceMap: false,
        selfDefending: false,
        debugProtection: false,
        disableConsoleOutput: false,
      },
    }),
  ],
  // The ffmpeg wrapper spawns its own worker via `new URL(..., import.meta.url)`,
  // which breaks if Vite pre-bundles it.
  optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] },
  worker: { format: 'es' },
  // Playwright owns tests/e2e; Vitest only runs the unit tests.
  test: { include: ['tests/unit/**/*.test.js'] },
  build: {
    sourcemap: false,
    // Never inline assets as data: URLs; keep everything as real files.
    assetsInlineLimit: 0,
  },
});
