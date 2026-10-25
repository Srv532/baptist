/**
 * Builds the ffmpeg command line for one conversion. Pure function so it can
 * be unit tested without loading WebAssembly.
 */

const CODEC_ARGS = {
  // Video
  mp4: [
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
  ],
  webm: [
    '-c:v',
    'libvpx-vp9',
    '-crf',
    '32',
    '-b:v',
    '0',
    '-row-mt',
    '1',
    '-deadline',
    'realtime',
    '-cpu-used',
    '8',
    '-c:a',
    'libopus',
  ],
  mkv: ['-c', 'copy'], // remux only: no re-encoding, no quality loss
  mov: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac'],
  // Audio (-vn drops cover art / video streams)
  mp3: ['-vn', '-c:a', 'libmp3lame', '-q:a', '2'],
  flac: ['-vn', '-c:a', 'flac'],
  aac: ['-vn', '-c:a', 'aac', '-b:a', '192k'],
  wav: ['-vn', '-c:a', 'pcm_s16le'],
  // Image (first frame only)
  webp: ['-frames:v', '1', '-c:v', 'libwebp', '-quality', '85'],
  png: ['-frames:v', '1', '-c:v', 'png'],
  jpg: ['-frames:v', '1', '-q:v', '2'],
};

/**
 * @param {{ input: string, output: string, format: string, stripMetadata: boolean }} job
 * @returns {string[]} arguments for `ffmpeg.exec`
 */
export function buildArgs({ input, output, format, stripMetadata }) {
  const codec = CODEC_ARGS[format];
  if (!codec) throw new Error(`Unsupported output format: ${format}`);
  return [
    '-i',
    input,
    ...codec,
    // ALWAYS appended when the toggle is on: wipes title, GPS, camera, etc.
    ...(stripMetadata ? ['-map_metadata', '-1'] : []),
    '-y',
    output,
  ];
}

/**
 * Names used inside ffmpeg's in-memory file system. The user's real file name
 * never goes in: it could contain characters ffmpeg treats specially.
 * @param {string} inputExt
 * @param {string} format
 */
export function memfsNames(inputExt, format) {
  const safeExt = /^[a-z0-9]{1,8}$/.test(inputExt) ? inputExt : 'bin';
  return { input: `input.${safeExt}`, output: `output.${format}` };
}
