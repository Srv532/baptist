/**
 * Conversion engine.
 *
 * ffmpeg.wasm runs inside its own Web Worker (the wrapper spawns it), and the
 * multithreaded core spawns more workers for encoding, so the page's main
 * thread never blocks and animations stay smooth.
 *
 * MEMORY SAFETY: every job ends in a `finally` that deletes the input and
 * output from ffmpeg's in-memory file system and then TERMINATES the worker.
 * Deleting files alone does not shrink WebAssembly memory; terminating the
 * worker is what really hands the RAM back to the operating system.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { zipSync } from 'fflate';
import workerEntryURL from './ffmpeg.worker.js?worker&url';
import { buildArgs, memfsNames } from './ffmpegArgs.js';
import {
  DATA,
  MAX_FILE_BYTES,
  extensionOf,
  getOutputs,
  outputFileName,
} from './SmartFormatEngine.js';

const CORE_DIR = '/engines/ffmpeg-core-mt/';
const coreURL = (file) => new URL(`${CORE_DIR}${file}`, globalThis.location.origin).href;

let ffmpeg = null;
let loading = null;

/** Kill the ffmpeg worker(s) and drop every reference so the GC can collect. */
export function releaseEngine() {
  const instance = ffmpeg;
  ffmpeg = null;
  loading = null;
  try {
    instance?.terminate();
  } catch {
    // Already terminated: nothing to do.
  }
}

/** Create (once) and load the multithreaded ffmpeg core. */
async function getEngine() {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loading) return loading;
  const instance = new FFmpeg();
  ffmpeg = instance;
  loading = instance
    .load({
      classWorkerURL: workerEntryURL,
      coreURL: coreURL('ffmpeg-core.js'),
      wasmURL: coreURL('ffmpeg-core.wasm'),
      workerURL: coreURL('ffmpeg-core.worker.js'),
    })
    .then(() => instance)
    .catch((err) => {
      releaseEngine();
      throw err;
    });
  return loading;
}

/** Run a cleanup step; it must never hide the real error. */
async function quietly(fn) {
  try {
    await fn();
  } catch {
    // Ignored on purpose.
  }
}

/**
 * @param {{
 *   file: File,
 *   category: string,
 *   format: string,
 *   stripMetadata: boolean,
 *   onProgress?: (fraction: number) => void,
 * }} job
 * @returns {Promise<{ blob: Blob, name: string }>}
 */
export async function convertFile({
  file,
  category,
  format,
  stripMetadata,
  onProgress = () => {},
}) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      'This file is larger than 2 GB. Baptist blocks it so your browser tab does not crash.',
    );
  }
  const target = getOutputs(category).find((o) => o.id === format);
  if (!target) throw new Error(`"${format}" is not available for ${category} files.`);
  const name = outputFileName(file.name, target.id);

  if (category === DATA) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // With "strip metadata" the zip entry also gets a fixed 1980 timestamp.
    const mtime = stripMetadata ? new Date(1980, 0, 1) : new Date(file.lastModified);
    const zipped = zipSync({ [file.name.replace(/[\\/]/g, '_')]: [bytes, { mtime }] });
    onProgress(1);
    return { blob: new Blob([zipped], { type: target.mime }), name };
  }

  const names = memfsNames(extensionOf(file.name), format);
  const logTail = [];
  let engine = null;
  let progressHandler = null;
  let logHandler = null;
  try {
    engine = await getEngine();
    progressHandler = ({ progress }) => {
      if (Number.isFinite(progress)) onProgress(Math.min(1, Math.max(0, progress)));
    };
    logHandler = ({ message }) => {
      logTail.push(message);
      if (logTail.length > 12) logTail.shift();
    };
    engine.on('progress', progressHandler);
    engine.on('log', logHandler);

    await engine.writeFile(names.input, new Uint8Array(await file.arrayBuffer()));
    const code = await engine.exec(buildArgs({ ...names, format, stripMetadata }));
    if (code !== 0) {
      throw new Error(`Conversion failed. ${logTail.at(-1) ?? ''}`.trim());
    }
    const data = await engine.readFile(names.output);
    onProgress(1);
    return { blob: new Blob([data], { type: target.mime }), name };
  } finally {
    // BULLETPROOF CLEANUP: each step is isolated so one failure cannot skip the rest.
    if (engine) {
      if (progressHandler) engine.off('progress', progressHandler);
      if (logHandler) engine.off('log', logHandler);
      await quietly(() => engine.deleteFile(names.input));
      await quietly(() => engine.deleteFile(names.output));
    }
    releaseEngine();
  }
}
