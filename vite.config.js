import { defineConfig } from 'vite';
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
  plugins: [securityHeaders()],
  build: {
    // Never inline assets as data: URLs; keep everything as real files.
    assetsInlineLimit: 0,
  },
});
