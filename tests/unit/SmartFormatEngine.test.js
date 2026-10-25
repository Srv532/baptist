import { describe, expect, test } from 'vitest';
import {
  MAX_FILE_BYTES,
  categorize,
  formatBytes,
  getOutputs,
  outputFileName,
} from '../../src/engine/SmartFormatEngine.js';

describe('categorize', () => {
  test.each([
    [{ name: 'a.mov', type: 'video/quicktime' }, 'Video'],
    [{ name: 'a.mkv', type: '' }, 'Video'],
    [{ name: 'a.mp3', type: 'audio/mpeg' }, 'Audio'],
    [{ name: 'a.flac', type: '' }, 'Audio'],
    [{ name: 'a.png', type: 'image/png' }, 'Image'],
    [{ name: 'a.HEIC.jpg', type: '' }, 'Image'],
    [{ name: 'notes.txt', type: 'text/plain' }, 'Data'],
    [{ name: 'main.ts', type: '' }, 'Data'],
    [{ name: 'logo.svg', type: 'image/svg+xml' }, 'Data'],
    [{ name: 'noextension', type: '' }, 'Data'],
  ])('%j -> %s', (file, expected) => {
    expect(categorize(file)).toBe(expected);
  });

  test('MIME type beats a misleading extension', () => {
    expect(categorize({ name: 'song.txt', type: 'audio/mpeg' })).toBe('Audio');
  });
});

describe('getOutputs', () => {
  test('matches the spec matrix with badges', () => {
    const pairs = (c) => getOutputs(c).map((o) => `${o.label}:${o.badge}`);
    expect(pairs('Video')).toEqual(['MP4:Recommended', 'WebM:Web', 'MKV:Lossless', 'MOV:Editing']);
    expect(pairs('Audio')).toEqual(['MP3:Universal', 'FLAC:Lossless', 'AAC:Mobile', 'WAV:Studio']);
    expect(pairs('Image')).toEqual(['WebP:Next-Gen', 'PNG:Transparent', 'JPG:Standard']);
    expect(pairs('Data')).toEqual(['ZIP:Archive']);
  });
});

describe('helpers', () => {
  test('2 GB limit', () => {
    expect(MAX_FILE_BYTES).toBe(2147483648);
  });
  test('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(-1)).toBe('');
  });
  test('outputFileName strips path characters', () => {
    expect(outputFileName(`my..${String.fromCharCode(92)}clip.mov`, 'mkv')).toBe('my.._clip.mkv');
    expect(outputFileName('a/b:c.mp4', 'webm')).toBe('a_b_c.webm');
    expect(outputFileName('.mp4', 'mkv')).toBe('.mp4.mkv');
  });
});
