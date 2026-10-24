// Writes public/_headers and vercel.json from security/headers.js (spec A1).
// Run with: npm run gen:headers
import { writeFileSync } from 'node:fs';
import { HEADER_RULES, toNetlifyHeaders, toVercelConfig } from '../security/headers.js';

const root = new URL('../', import.meta.url);

writeFileSync(new URL('public/_headers', root), toNetlifyHeaders(HEADER_RULES));
writeFileSync(
  new URL('vercel.json', root),
  `${JSON.stringify(toVercelConfig(HEADER_RULES), null, 2)}\n`,
);

console.log('Wrote public/_headers and vercel.json');
