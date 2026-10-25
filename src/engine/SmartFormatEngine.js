/**
 * SmartFormatEngine: decides what a dropped file is and which output formats
 * Baptist offers for it. Pure functions, no DOM, no side effects.
 */

export const MAX_FILE_BYTES = 2 * 1024 ** 3; // 2 GiB: above this the tab may run out of memory.

export const VIDEO = 'Video';
export const AUDIO = 'Audio';
export const IMAGE = 'Image';
export const DATA = 'Data';

const VIDEO_EXT = new Set([
  'mp4',
  'm4v',
  'mov',
  'mkv',
  'webm',
  'avi',
  'wmv',
  'flv',
  'mpg',
  'mpeg',
  'mts',
  'm2ts',
  '3gp',
  'ogv',
]);
const AUDIO_EXT = new Set([
  'mp3',
  'wav',
  'flac',
  'aac',
  'm4a',
  'ogg',
  'oga',
  'opus',
  'wma',
  'aiff',
  'aif',
  'amr',
]);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'avif']);

/** Output formats per category. `id` doubles as the file extension. */
export const OUTPUTS = {
  [VIDEO]: [
    { id: 'mp4', label: 'MP4', badge: 'Recommended', mime: 'video/mp4' },
    { id: 'webm', label: 'WebM', badge: 'Web', mime: 'video/webm' },
    { id: 'mkv', label: 'MKV', badge: 'Lossless', mime: 'video/x-matroska' },
    { id: 'mov', label: 'MOV', badge: 'Editing', mime: 'video/quicktime' },
  ],
  [AUDIO]: [
    { id: 'mp3', label: 'MP3', badge: 'Universal', mime: 'audio/mpeg' },
    { id: 'flac', label: 'FLAC', badge: 'Lossless', mime: 'audio/flac' },
    { id: 'aac', label: 'AAC', badge: 'Mobile', mime: 'audio/aac' },
    { id: 'wav', label: 'WAV', badge: 'Studio', mime: 'audio/wav' },
  ],
  [IMAGE]: [
    { id: 'webp', label: 'WebP', badge: 'Next-Gen', mime: 'image/webp' },
    { id: 'png', label: 'PNG', badge: 'Transparent', mime: 'image/png' },
    { id: 'jpg', label: 'JPG', badge: 'Standard', mime: 'image/jpeg' },
  ],
  [DATA]: [{ id: 'zip', label: 'ZIP', badge: 'Archive', mime: 'application/zip' }],
};

/**
 * Lower-case extension without the dot, or '' when there is none.
 * @param {string} name
 */
export function extensionOf(name) {
  const dot = String(name).lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Categorise a file by MIME type first, then by extension. Anything we do not
 * recognise is 'Data', which can always be packed into a ZIP.
 * `.ts` is deliberately not in the video list: it is far more often TypeScript.
 * @param {{ name: string, type?: string }} file
 * @returns {'Video'|'Audio'|'Image'|'Data'}
 */
export function categorize(file) {
  const type = String(file?.type ?? '').toLowerCase();
  if (type.startsWith('video/')) return VIDEO;
  if (type.startsWith('audio/')) return AUDIO;
  if (type.startsWith('image/') && type !== 'image/svg+xml') return IMAGE;

  const ext = extensionOf(file?.name ?? '');
  if (VIDEO_EXT.has(ext)) return VIDEO;
  if (AUDIO_EXT.has(ext)) return AUDIO;
  if (IMAGE_EXT.has(ext)) return IMAGE;
  return DATA;
}

/**
 * @param {'Video'|'Audio'|'Image'|'Data'} category
 */
export function getOutputs(category) {
  return OUTPUTS[category] ?? OUTPUTS[DATA];
}

/** Human-readable size, e.g. "12.4 MB". */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Safe download name: original base name with the new extension. Strips path
 * separators and control characters.
 * @param {string} originalName
 * @param {string} ext
 */
export function outputFileName(originalName, ext) {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim() || 'baptist-output';
  return `${clean}.${ext}`;
}
