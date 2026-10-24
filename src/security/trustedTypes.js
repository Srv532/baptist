/**
 * Trusted Types "default" policy (spec A5).
 *
 * Our CSP says `require-trusted-types-for 'script'`, so the browser refuses to
 * run strings as HTML or scripts unless a policy approves them. This policy:
 *   - allows script URLs (workers, WASM loaders) only from our own origin;
 *   - never allows turning a string into HTML or JavaScript.
 * It is called "default" so the browser also applies it inside libraries
 * (e.g. ffmpeg.wasm's `new Worker(url)`) that don't know about Trusted Types.
 */

/**
 * Is this URL safe to load as a script? Only our own origin is allowed.
 * `blob:` URLs carry the origin that created them, so our own blobs pass and
 * blobs made by anyone else fail.
 * @param {string} url
 * @param {string} origin our page origin, e.g. "https://baptist.app"
 * @returns {boolean}
 */
export function isAllowedScriptURL(url, origin) {
  let parsed;
  try {
    parsed = new URL(url, origin);
  } catch {
    return false;
  }
  if (parsed.protocol === 'blob:') {
    // new URL('blob:https://x/uuid').origin is "https://x".
    return parsed.origin === origin;
  }
  return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.origin === origin;
}

/**
 * Install the policy. Safe to call in browsers without Trusted Types support
 * (it simply does nothing there).
 * @param {typeof globalThis} scope `window` or a worker's `self`
 */
export function installDefaultPolicy(scope = globalThis) {
  const tt = scope.trustedTypes;
  if (!tt || tt.defaultPolicy) return;

  tt.createPolicy('default', {
    createScriptURL(url) {
      if (isAllowedScriptURL(url, scope.location.origin)) return url;
      throw new TypeError(`Blocked script URL from another origin: ${url}`);
    },
    createHTML() {
      throw new TypeError('Baptist never builds HTML from strings.');
    },
    createScript() {
      throw new TypeError('Baptist never runs strings as code.');
    },
  });
}
