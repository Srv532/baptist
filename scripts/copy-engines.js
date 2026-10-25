// Copies the multithreaded ffmpeg core from node_modules into public/engines/
// so it is served from our own origin (required by our CSP). Spec A2.
// Runs automatically before `npm run dev` and `npm run build`.
import { cpSync, mkdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const from = new URL('node_modules/@ffmpeg/core-mt/dist/esm/', root);
const to = new URL('public/engines/ffmpeg-core-mt/', root);

if (!existsSync(from)) {
  console.error('Missing @ffmpeg/core-mt. Run `npm install` first.');
  process.exit(1);
}
mkdirSync(to, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js']) {
  cpSync(new URL(file, from), new URL(file, to));
}
console.log('Copied ffmpeg core-mt to public/engines/ffmpeg-core-mt/');
