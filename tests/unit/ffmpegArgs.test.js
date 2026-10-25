import { describe, expect, test } from 'vitest';
import { buildArgs, memfsNames } from '../../src/engine/ffmpegArgs.js';

const base = { input: 'input.mov', output: 'output.mkv' };

describe('buildArgs', () => {
  test('MKV is a lossless stream copy', () => {
    const args = buildArgs({ ...base, format: 'mkv', stripMetadata: false });
    expect(args).toEqual(['-i', 'input.mov', '-c', 'copy', '-y', 'output.mkv']);
  });

  test('WebM uses VP9', () => {
    const args = buildArgs({
      ...base,
      output: 'output.webm',
      format: 'webm',
      stripMetadata: false,
    });
    expect(args).toContain('libvpx-vp9');
  });

  test('strip metadata appends -map_metadata -1 before the output file', () => {
    const args = buildArgs({ ...base, format: 'mkv', stripMetadata: true });
    const i = args.indexOf('-map_metadata');
    expect(args.slice(i, i + 2)).toEqual(['-map_metadata', '-1']);
    expect(args.at(-1)).toBe('output.mkv');
    expect(i).toBeLessThan(args.length - 1);
  });

  test('metadata is kept when the toggle is off', () => {
    expect(buildArgs({ ...base, format: 'mp4', stripMetadata: false })).not.toContain(
      '-map_metadata',
    );
  });

  test('audio formats drop video streams', () => {
    for (const f of ['mp3', 'flac', 'aac', 'wav']) {
      expect(
        buildArgs({ input: 'input.wav', output: `output.${f}`, format: f, stripMetadata: false }),
      ).toContain('-vn');
    }
  });

  test('unknown format throws', () => {
    expect(() => buildArgs({ ...base, format: 'exe', stripMetadata: false })).toThrow(
      /Unsupported/,
    );
  });
});

describe('memfsNames', () => {
  test('never uses the user-supplied name', () => {
    expect(memfsNames('mov', 'mkv')).toEqual({ input: 'input.mov', output: 'output.mkv' });
  });
  test('rejects odd extensions', () => {
    expect(memfsNames('a b;rm', 'mp4').input).toBe('input.bin');
    expect(memfsNames('', 'mp4').input).toBe('input.bin');
  });
});
