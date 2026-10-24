// Security checks from brief §8.12 that apply from Phase 0 onwards.
import { expect, test } from '@playwright/test';
import { headersForPath } from '../../security/headers.js';

test('home page is served with every security header', async ({ page }) => {
  const response = await page.goto('/');
  const actual = response.headers(); // header names are lower-cased here
  for (const [name, value] of Object.entries(headersForPath('/'))) {
    expect(actual[name.toLowerCase()], name).toBe(value);
  }
});

test('page is cross-origin isolated (SharedArrayBuffer available)', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true);
});

test('page loads without errors or CSP violations', async ({ page }) => {
  const problems = [];
  page.on('pageerror', (err) => problems.push(err.message));
  page.on('console', (msg) => msg.type() === 'error' && problems.push(msg.text()));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Baptist');
  expect(problems).toEqual([]);
});

test('no request ever leaves our own origin', async ({ page, baseURL }) => {
  const foreign = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== baseURL) {
      foreign.push(req.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(foreign).toEqual([]);
});

test('Trusted Types default policy is installed where supported', async ({ page }) => {
  await page.goto('/');
  const state = await page.evaluate(() => {
    if (!('trustedTypes' in self)) return 'unsupported';
    return self.trustedTypes.defaultPolicy ? 'installed' : 'missing';
  });
  expect(['installed', 'unsupported']).toContain(state);
});

test('Trusted Types blocks innerHTML with a plain string where supported', async ({ page }) => {
  await page.goto('/');
  const outcome = await page.evaluate(() => {
    if (!('trustedTypes' in self)) return 'unsupported';
    try {
      document.body.innerHTML = '<img src=x onerror=alert(1)>';
      return 'allowed';
    } catch {
      return 'blocked';
    }
  });
  expect(['blocked', 'unsupported']).toContain(outcome);
});
