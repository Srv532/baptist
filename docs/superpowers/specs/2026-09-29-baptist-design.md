# Baptist — Design Spec

- **Date:** 2026-09-29
- **Status:** Awaiting review
- **Base document:** [`Baptist_Development_Plan_Prompt.md`](../../../Baptist_Development_Plan_Prompt.md) (the "brief")

This spec is the brief **plus** the amendments and decisions below. Where they
disagree, this document wins. Everything in the brief not mentioned here stands
as written.

---

## 1. Goal (unchanged from the brief)

Baptist is a free, static website that converts files between formats entirely
in the browser. Files never leave the device. Only conversions from a
registry-driven compatibility matrix are offered. No accounts, cookies,
tracking or ads. Plain JavaScript + Vite, built phase by phase with a review
stop after each phase.

---

## 2. Amendments to the brief

### A1. Host-neutral deployment (Vercel, Cloudflare Pages or Netlify)

The owner may deploy to Vercel, so nothing may depend on one host.

- **One source of truth for headers:** `security/headers.js` exports the header
  list (path pattern → header name → value).
- `npm run gen:headers` writes two committed files from it:
  - `public/_headers` — read by Cloudflare Pages and Netlify.
  - `vercel.json` — read by Vercel (`headers` array).
- A unit test regenerates both in memory and fails if the committed files
  differ from `security/headers.js`. This stops the three from drifting.
- On Vercel, deploy **from Git** (Vercel builds it), not by uploading a local
  build with the CLI: Hobby CLI uploads are capped at 100 MB, and the engines
  alone exceed that.
- Vercel Hobby is non-commercial only. That fits a hobby project.

### A2. Large engine files are split into chunks

Cloudflare Pages caps each file at 25 MiB. `ffmpeg-core.wasm` (multithreaded)
is 32.7 MB and `pandoc.wasm` is 58.6 MB. To work on every host:

- `scripts/prepare-engines.js` copies engine files from `node_modules` into
  `public/engines/<engine>@<version>/`. Any file over 20 MB is split into
  20 MB parts (`pandoc.wasm.part0`, `.part1`, …).
- It writes `public/engines/manifest.json` with, for each file: name, total
  size, part list and SHA-256 hash.
- `src/engines/loader.js` (used inside workers) fetches the parts, reports
  download progress, joins them, **verifies the SHA-256 with
  `crypto.subtle.digest`** and only then hands the bytes to WebAssembly. A hash
  mismatch aborts with a friendly "Converter download was corrupted, please
  reload" error.
- Engine files are served with long-lived immutable caching because the
  version is in the path.

### A3. SheetJS from the official tarball

The `xlsx` package on npm (0.18.5) is abandoned and has known prototype
pollution and ReDoS advisories. Install the pinned official tarball instead:
`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. This is an
install-time download. The lockfile records its integrity hash. Nothing loads
from a third party at runtime.

### A4. Dev server vs. preview headers

The strict CSP breaks Vite's dev server (injected `<style>` tags and HMR code).

- `npm run dev` sends only COOP, COEP and CORP (needed for SharedArrayBuffer).
- `npm run preview` serves the production build with **the full header set
  from `security/headers.js`**, applied by a small Vite plugin.
- All security end-to-end tests run against `preview`.

### A5. Trusted Types default policy

`require-trusted-types-for 'script'` also blocks `new Worker(url)`, including
inside libraries such as ffmpeg.wasm. Add a policy named `default` in
`src/security/trustedTypes.js`, loaded first by every page:

- `createScriptURL`: allow only URLs whose origin is our own origin (this
  includes `blob:` URLs we create ourselves). Anything else throws.
- `createHTML` and `createScript`: always throw. Baptist never builds HTML from
  strings.
- The CSP gains `trusted-types default`.

### A6. File-type detection that works for every format family

Not every format has a unique magic number. `src/formats/sniff.js` uses these
strategies in order:

1. **Unique magic bytes:** PNG, JPEG, GIF, BMP, TIFF, PDF, PSD, FLAC, etc.
2. **Container inspection:**
   - ZIP (`PK`): read the central directory. `[Content_Types].xml` plus
     `word/`, `xl/` or `ppt/` distinguishes DOCX/XLSX/PPTX. A `mimetype` entry
     identifies ODT/ODS/EPUB. Plain ZIPs are unsupported.
   - ISO-BMFF (`ftyp`): the brand tells MP4/M4A/MOV/3GP/HEIC/AVIF apart.
   - RIFF: the subtype tells WAV/AVI/WEBP apart.
   - EBML: the DocType tells MKV from WEBM.
   - Ogg: the first codec header tells OGG (Vorbis), OPUS and OGV apart.
3. **Text formats** (CSV, TSV, JSON, Markdown, HTML, SVG, SRT, VTT, ASS, TXT,
   LaTeX, RST, Org, Textile): the file must look like text (valid UTF-8, or
   UTF-16 with a BOM, and no NUL bytes in the first 64 KB). It must also pass a
   light structure check for the claimed type, for example VTT starts with
   `WEBVTT`, JSON parses, SRT has a `-->` timing line, SVG has an `<svg` root.
4. **Extension mismatch policy:**
   - Content matches a *different* supported format → use the real format and
     tell the user ("This file is actually a PNG").
   - Content is executable (`MZ`, ELF, Mach-O) or unknown binary claiming a
     text or image type → reject: "This file isn't really a .jpg."

### A7. No document → PDF in v1

Pandoc-wasm cannot write PDF. That makes the brief's §6 example
(Markdown → HTML → PDF) impossible with the listed engines, so it is removed.
The registry still supports two-step routes. A later option is
Pandoc → Typst → PDF using Typst's WebAssembly build.

### A8. Permissions-Policy fix

Replace the obsolete `interest-cohort=()` with `browsing-topics=()`.

### A9. Static page per tool (no client-side router)

- A Vite plugin generates one static HTML file per tool at build time:
  `/mp4-to-mp3/index.html`, etc. Each file has its own `<title>`, meta
  description and `<body data-page="tool" data-from="mp4" data-to="mp3">`.
- Links between pages are ordinary links, so there is no router to learn or
  break. Clean URLs work on every host without rewrite rules, and each tool
  page is indexable by search engines.
- Also generated: `/formats/`, `/privacy/` and `404.html`.

### A10. Licensing (decision deferred to Phase 5)

`@ffmpeg/core` and Pandoc are GPL-2.0-or-later. Serving them publicly means
offering their source. The recommendation is to publish the Baptist repo under
GPL-3.0-or-later and add a "Licenses" page linking each engine's source.
Decide before launch.

### A11. Phase 3 notes

- Large inputs are mounted with FFmpeg's WORKERFS (read in place, not copied
  into WASM memory). This is required for the 500 MB MP4 → MP3 target.
- If multithreaded ffmpeg proves unreliable in Safari, fall back to the
  single-thread `@ffmpeg/core`. Decide during Phase 3 testing.

---

## 3. Visual design — "Neo-pop"

Loud, playful and confident: flat colour blocks, thick ink outlines and hard
offset shadows. No blur, glow or soft shadows.

### 3.1 Colour tokens (CSS variables in `src/styles/tokens.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#FFFDF7` | `#16131F` | Page background |
| `--surface` | `#FFFFFF` | `#221E30` | Neutral cards, file rows, inputs |
| `--ink` | `#111111` | `#F4F0E6` | Body text on paper/surface |
| `--ink-soft` | `#4A4A4A` | `#B9B4C8` | Secondary text |
| `--outline` | `#111111` | `#F4F0E6` | Outlines on neutral elements |
| `--shadow-hard` | `#111111` | `#000000` | Offset shadow |
| `--brand` | `#6B4BFF` | `#8D75FF` | Logo block, primary button |
| `--on-brand` | `#FFFFFF` | `#111111` | Text on brand |

**Category colours:** used for tool cards, badges and progress bars. They are
the same in both themes, and text on them is always `#111111`.

| Category | Colour |
|---|---|
| Video (incl. subtitles) | Pink `#FF8FB8` |
| Audio | Tangerine `#FFB84D` |
| Image | Sky `#7BD8FF` |
| PDF | Lime `#C6F432` |
| Documents | Sunflower `#FFE14D` |
| Spreadsheets | Lilac `#B9A6FF` |

Every text/background pair must meet WCAG AA. A unit test computes contrast
ratios for all token pairs, and any tweak that breaks AA fails the build.

### 3.2 Shape and motion

- 2 px outlines, 12–16 px corner radius, and a hard shadow `4px 4px 0`.
- Buttons and cards "lift" on hover (translate −2 px, shadow 6 px) and "press"
  on click (translate +2 px, shadow 0).
- The drop zone is a big sunflower block. It wiggles on drag-over, and the
  border turns to a dashed brand colour.
- Progress bars are chunky, striped and in the category colour.
- All motion is disabled under `prefers-reduced-motion`.

### 3.3 Typography

- **Display:** Bricolage Grotesque (OFL), a self-hosted variable WOFF2 with a
  Latin subset from `@fontsource-variable`, with `font-display: swap`.
- **Body:** the system UI font stack, so there is no extra download.
- Headlines use tight letter-spacing. Highlight words get a lime "sticker"
  background (see the hero).

### 3.4 Brand and icons

- **Logo:** a purple `B` block with an ink outline, next to the lowercase
  wordmark "baptist".
- **Icons:** a hand-picked set of Tabler outline icons (MIT), copied into the
  repo as one SVG sprite, `public/icons/sprite.svg`. No icon font and no CDN.

### 3.5 Theme switching

- The theme follows the system by default. The toggle cycles
  System → Light → Dark.
- The choice is stored in `localStorage` under `baptist-theme`, the only thing
  ever stored.
- Theme is set via `data-theme` on `<html>`. It is applied by a tiny
  **external** script loaded in `<head>` (not inline, because of the CSP) to
  avoid a flash of the wrong theme.

---

## 4. Architecture (brief §6 stands; module boundaries clarified)

| Module | Responsibility | Depends on |
|---|---|---|
| `src/formats/registry.js` | Pure data: every format (extensions, MIME, category, engine, read/write) and conversion routes | nothing |
| `src/formats/matrix.js` | Derives "what can X become" from the registry plus runtime engine capabilities | registry |
| `src/formats/sniff.js` | Detects the real format from bytes (A6) | registry |
| `src/engines/loader.js` | Chunked, hash-verified engine download (A2) | manifest |
| `src/converters/*.js` | One per engine, `{ id, engine, canConvert, convert }` | engine libs |
| `src/workers/*.worker.js` | Runs one converter in isolation; posts progress and results | converters |
| `src/queue.js` | Concurrency, cancel (terminates the worker), timeout, limits | workers |
| `src/download.js` | Safe filenames, blob URLs, ZIP via fflate | fflate |
| `src/security/trustedTypes.js` | Default TT policy (A5) | nothing |
| `src/ui/*.js` | Pages and components. Uses `textContent` only for data | all of the above |

Each module can be unit-tested without a browser, except the workers and UI,
which are covered by Playwright.

---

## 5. Dependencies (pinned exact, as of 2026-09-29)

| Package | Version | Notes |
|---|---|---|
| vite | 8.3.1 | build |
| vitest | 5.0.2 | unit tests |
| @playwright/test | 1.63.0 | e2e: Chromium, Firefox, WebKit |
| eslint / prettier | latest at install, pinned | lint |
| @ffmpeg/ffmpeg | 0.12.15 | Phase 3 |
| @ffmpeg/core-mt | 0.12.10 | Phase 3, GPL |
| @imagemagick/magick-wasm | 0.0.43 | Phase 2 |
| pdf-lib | 1.17.1 | Phase 2 |
| pdfjs-dist | 6.3.289 | Phase 4; `isEvalSupported: false` for the CSP |
| pandoc-wasm | 1.1.0 | Phase 4; official Pandoc 3.9 binary, GPL |
| xlsx | 0.20.3 (tarball, A3) | Phase 4 |
| fflate | 0.8.3 | Phase 2 |
| @fontsource-variable/bricolage-grotesque | latest, pinned | Phase 1 |

Each engine is installed in the phase that first needs it, not up front.

---

## 6. Testing

- **Unit (Vitest):**
  - Registry and matrix, including every "must not be offered" case from brief
    §3.2.
  - Sniffing: every family in A6, plus the renamed EXE.
  - Filename sanitising.
  - Headers sync (A1).
  - Colour contrast (§3.1).
- **E2E (Playwright, against `vite preview`):**
  - All headers present on every page type.
  - Zero requests to any origin other than our own.
  - The XSS filename renders as text.
  - A renamed EXE is rejected.
  - An oversized image is refused.
  - The conversion flows for each phase.
- **CI (GitHub Actions):** install with `npm ci`, lint, unit tests, build,
  e2e, then `npm audit --audit-level=high`. Dependabot for npm and actions.

---

## 7. Phases

Brief §9 stands, with this change to Phase 0:

- **Phase 0 done when:** `npm run dev` shows a blank Baptist page, **and**
  `npm run preview` serves it with every header from `security/headers.js`,
  proven by an automated test.

Every phase gets its own implementation plan (written and reviewed before
coding) and ends with a summary and a review stop.

---

## 8. Open items

| Item | Decide in |
|---|---|
| Project licence (A10) | Phase 5 |
| Safari single-thread fallback (A11) | Phase 3 |
| Final per-format read/write list (runtime-verified) | Phases 2–4 |
| GitHub repo and remote (CI needs one) | Before Phase 0 CI is useful |
