// Tests for the Trusted Types default policy rules (spec A5).
import { describe, expect, test } from 'vitest';
import { isAllowedScriptURL } from '../../src/security/trustedTypes.js';

const ORIGIN = 'https://baptist.example';

describe('isAllowedScriptURL', () => {
  test.each([
    ['/assets/main.js'],
    ['./worker.js'],
    [`${ORIGIN}/engines/magick@0.0.43/magick.wasm`],
    [`blob:${ORIGIN}/2b1c9d2e-1111-4a4a-9b9b-000000000000`],
  ])('allows our own URL %s', (url) => {
    expect(isAllowedScriptURL(url, ORIGIN)).toBe(true);
  });

  test.each([
    ['https://evil.example/x.js'],
    ['//evil.example/x.js'],
    ['blob:https://evil.example/2b1c9d2e-1111-4a4a-9b9b-000000000000'],
    ['data:text/javascript,alert(1)'],
    ['javascript:alert(1)'],
    ['http://baptist.example/downgraded.js'],
  ])('rejects foreign or dangerous URL %s', (url) => {
    expect(isAllowedScriptURL(url, ORIGIN)).toBe(false);
  });
});
