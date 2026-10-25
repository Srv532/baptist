// End-to-end checks of the real app in the production build.
import { expect, test } from '@playwright/test';

/** A 1-second 8 kHz mono WAV, built in memory (no fixture file needed). */
function wavBytes() {
  const rate = 8000;
  const samples = rate;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    buf.writeInt16LE(Math.round(Math.sin(i / 10) * 8000), 44 + i * 2);
  return buf;
}

test('dropping an audio file shows only audio formats', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'tone.wav',
    mimeType: 'audio/wav',
    buffer: wavBytes(),
  });
  const cards = page.getByRole('radio');
  await expect(cards).toHaveText([/MP3/, /FLAC/, /AAC/, /WAV/]);
});

test('unknown file types offer ZIP only', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await expect(page.getByRole('radio')).toHaveText([/ZIP/]);
});

test('WAV to MP3 converts with the multithreaded engine and downloads', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'tone.wav',
    mimeType: 'audio/wav',
    buffer: wavBytes(),
  });
  const download = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: /^Convert$/ }).click();
  expect((await download).suggestedFilename()).toBe('tone.mp3');
  await expect(page.getByRole('button', { name: /Done/ })).toBeVisible();
});

test('right-click and DevTools shortcuts are blocked in production', async ({ page }) => {
  await page.goto('/');
  const prevented = await page.evaluate(() => {
    const fire = (type, init) => {
      const e = new KeyboardEvent(type, { cancelable: true, bubbles: true, ...init });
      document.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const menu = new MouseEvent('contextmenu', { cancelable: true, bubbles: true });
    document.dispatchEvent(menu);
    return [
      menu.defaultPrevented,
      fire('keydown', { key: 'F12' }),
      fire('keydown', { key: 'I', ctrlKey: true, shiftKey: true }),
      fire('keydown', { key: 'J', ctrlKey: true, shiftKey: true }),
      fire('keydown', { key: 'u', ctrlKey: true }),
    ];
  });
  expect(prevented).toEqual([true, true, true, true, true]);
});
