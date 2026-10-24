// Tests for the single source of truth for HTTP headers (spec A1, A4, A8).
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  DEV_HEADERS,
  HEADER_RULES,
  headersForPath,
  toNetlifyHeaders,
  toVercelConfig,
} from '../../security/headers.js';

const root = new URL('../../', import.meta.url);
const read = (file) => readFileSync(new URL(file, root), 'utf8');

describe('security headers', () => {
  const all = headersForPath('/');
  const csp = all['Content-Security-Policy'];

  test('CSP locks everything down by default', () => {
    for (const directive of [
      "default-src 'none'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
      "require-trusted-types-for 'script'",
      'trusted-types default',
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).not.toContain('unsafe-inline');
  });

  test('cross-origin isolation headers are set (needed by multithreaded FFmpeg)', () => {
    expect(all['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(all['Cross-Origin-Embedder-Policy']).toBe('require-corp');
    expect(all['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  test('Permissions-Policy uses browsing-topics, not the obsolete interest-cohort', () => {
    expect(all['Permissions-Policy']).toContain('browsing-topics=()');
    expect(all['Permissions-Policy']).not.toContain('interest-cohort');
  });

  test('engine files get long-lived immutable caching on top of the security headers', () => {
    const engine = headersForPath('/engines/ffmpeg@0.12.10/ffmpeg-core.wasm');
    expect(engine['Cache-Control']).toContain('immutable');
    expect(engine['Content-Security-Policy']).toBe(csp);
  });

  test('HTML pages are not cached forever', () => {
    expect(all['Cache-Control']).toBeUndefined();
  });

  test('dev server only sends the isolation headers (full CSP breaks Vite HMR)', () => {
    expect(Object.keys(DEV_HEADERS).sort()).toEqual([
      'Cross-Origin-Embedder-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
    ]);
  });
});

describe('generated host config files are in sync with security/headers.js', () => {
  test('public/_headers (Cloudflare Pages, Netlify)', () => {
    expect(read('public/_headers')).toBe(toNetlifyHeaders(HEADER_RULES));
  });

  test('vercel.json (Vercel)', () => {
    expect(JSON.parse(read('vercel.json'))).toEqual(toVercelConfig(HEADER_RULES));
  });
});
