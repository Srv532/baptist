# Development Plan Prompt — **Baptist** (browser-based file converter)

> Paste this whole document into your AI coding assistant as the project brief. Build it phase by phase, and stop at the end of each phase for review.

---

## 1. Your role

You are a senior front-end engineer building **Baptist**, a hobby project. Write clean, well-commented, beginner-readable code. Prefer simple solutions over clever ones. If a requirement here is impossible or unclear, **say so and propose an alternative. Do not silently skip it.**

---

## 2. Product summary

**Baptist** is a free website that converts digital files from one format to another. It is inspired by the layout and ease of use of iLovePDF, but it is its own brand.

- **Tagline:** "Convert any file, right in your browser."
- **100% in the browser.** Files are never uploaded to any server; all conversion happens on the user's device using WebAssembly engines.
- **No login, no accounts, no cookies, no tracking, no ads.**
- **Convert only.** There is no editing, compressing, merging or other tools in v1.
- **One file or many at a time.** The user decides. Batch results can be downloaded as one ZIP.
- **Hosting:** a free static host (Cloudflare Pages preferred, Netlify as backup).

### Non-goals (v1)
- No backend or server-side processing.
- No user accounts, history sync or cloud storage.
- No editing features (crop, trim, compress, merge, split).
- No reliable Word/Excel/PowerPoint → PDF with exact layout. That needs LibreOffice and is out of scope; see Phase 5.

---

## 3. The core rule: only offer eligible conversions

Baptist must **only show conversions that make sense and actually work.** The "Convert to" menu for a file is generated from a **compatibility matrix**, never from a hard-coded "everything to everything" list.

### 3.1 Allowed conversion types
| From | To | Meaning |
|---|---|---|
| Video | Other video formats | Re-encode or remux (MP4 → MKV, MOV → MP4) |
| Video | Audio formats | **Extract the soundtrack** (MP4 → MP3 ✅) |
| Video | GIF / animated WEBP | Short clip as animation (cap length, e.g. 60 s) |
| Video | JPG / PNG | Extract a still frame (thumbnail) |
| Audio | Other audio formats | MP3 ↔ WAV ↔ FLAC ↔ OGG … |
| Image | Other image formats | JPG ↔ PNG ↔ WEBP ↔ HEIC … |
| Image(s) | PDF | One image, or several images into one PDF |
| Animated GIF/WEBP | MP4 / WEBM | Animation to a proper video |
| PDF | JPG / PNG | One image per page (ZIP if multi-page) |
| PDF | TXT | Extract text |
| Documents / markup | Other document formats | DOCX ↔ ODT ↔ HTML ↔ Markdown ↔ EPUB ↔ RTF … (via Pandoc) |
| Spreadsheets | CSV / TSV / JSON / XLSX / ODS / HTML | Data conversion (via SheetJS) |
| Subtitles | SRT ↔ VTT ↔ ASS | Text timing formats |

### 3.2 Conversions that must **not** be offered (examples)
- **MP3 → MP4** (audio has no picture to make a video from)
- **JPG → MP4** (a single still image is not a video)
- **MP4 → DOCX, PDF → MP3, MP3 → JPG** (meaningless across categories)
- Any conversion where the target equals the source format (e.g. PNG → PNG)
- Any format the loaded engine cannot actually write (check at runtime, see 3.3)

If a user drops a file with **no eligible targets** or an **unsupported format**, show a friendly message: *"Baptist can't convert this file type yet."* Include the detected type and a link to the list of supported formats.

### 3.3 Build the matrix from real engine capabilities
- Keep a single source of truth, `src/formats/registry.js`. It lists every format with: extension(s), MIME types, magic-byte signature, category, engine, and whether it is **read-only** or **read + write**.
- At startup (or build time), check what the bundled engine builds actually support, for example the ImageMagick-WASM format list or the FFmpeg encoder list. Remove any target that is missing.
- Some formats are **read-only** and appear only as inputs, never as outputs. Examples: camera RAW (CR2, NEF, ARW, DNG), PSD if writing is unsupported, RealMedia, WMA if no encoder.
- Write unit tests that check the matrix, including every "must not be offered" example above.

---

## 4. Supported formats (target list — verify each against the engines)

**Video (FFmpeg.wasm):** MP4, M4V, MOV, MKV, WEBM, AVI, WMV, ASF, FLV, F4V, MPEG/MPG, VOB, TS, MTS/M2TS, 3GP, 3G2, OGV, RM/RMVB (read), DV, MXF, SWF (read, best-effort)
**Audio (FFmpeg.wasm):** MP3, WAV, FLAC, AAC, M4A, OGG, OPUS, WMA, AIFF, AMR, AC3, APE (read), AU, MKA, MP2, CAF, WV, RA (read)
**Image (ImageMagick-WASM):** JPG/JPEG/JFIF, PNG, GIF, BMP, TIFF, WEBP, HEIC/HEIF, AVIF, ICO, PSD, TGA, PCX, PPM/PGM/PBM, JP2, SVG (read), camera RAW: CR2, CR3, NEF, ARW, DNG, ORF, RW2, RAF (read)
**PDF (pdf.js, pdf-lib):** PDF → JPG/PNG/TXT; images → PDF
**Documents & markup (Pandoc WASM):** DOCX, ODT, RTF, HTML, Markdown, EPUB, LaTeX, reStructuredText, Org, Textile, FB2, Jupyter (IPYNB), TXT
**Spreadsheets (SheetJS):** XLSX, XLS, ODS, CSV, TSV, JSON, HTML table
**Subtitles (FFmpeg.wasm or a small JS parser):** SRT, VTT, ASS/SSA

---

## 5. Tech stack
- **Build tool:** Vite
- **Language:** plain JavaScript with ES modules. No framework, to keep the code easy for a beginner to read. Use JSDoc comments for types.
- **Styling:** hand-written CSS with CSS variables (light and dark theme). No CSS framework.
- **Engines:** all self-hosted, never loaded from a CDN, and lazy-loaded only when needed:
  - `@ffmpeg/ffmpeg` + `@ffmpeg/core-mt` (multithreaded) for video, audio and subtitles
  - `@imagemagick/magick-wasm` for images
  - `pdfjs-dist` to read and render PDFs; `pdf-lib` to build PDFs from images
  - the official Pandoc WebAssembly build (pandoc ≥ 3.5) for documents
  - `xlsx` (SheetJS) for spreadsheets
  - `fflate` (or JSZip) for "Download all as ZIP"
- **Testing:** Vitest for unit tests, Playwright for end-to-end tests.

---

## 6. Architecture
```
index.html ── UI (main thread): home page, tool pages, file list, progress
     │  postMessage (files as ArrayBuffers, transferred not copied)
     ▼
Conversion Web Workers (one per engine, created on demand)
  ├─ ffmpeg.worker.js   (video / audio / subtitles)
  ├─ magick.worker.js   (images)
  ├─ pdf.worker.js      (PDF ↔ images / text)
  ├─ pandoc.worker.js   (documents)
  └─ sheet.worker.js    (spreadsheets)
     │  results (Blob) + progress events
     ▼
Download (single file) or ZIP (batch)
```
- **Converter registry.** Each converter exports `{ id, engine, canConvert(from, to), convert(file, to, options, onProgress, signal) }`.
- **Job queue.** Process files with limited concurrency (default 1 for video, 2–3 for images). Each job can be cancelled with an AbortController, which terminates its worker.
- **Lazy loading.** An engine downloads only the first time it's needed. Show "Loading converter… (one-time download, ~X MB)", then rely on the browser cache.
- **Memory safety.** Warn before converting files over about 1 GB, and hard-limit at about 2 GB (WASM memory limit). Free buffers and revoke object URLs after each job.
- **Two-step conversions** are allowed when needed, for example Markdown → HTML → PDF. They must be defined in the registry, not hacked in the UI.

---

## 7. Pages & UX (inspired by iLovePDF, own design)

### 7.1 Home page
- **Header:** Baptist logo and wordmark, "All tools", "Supported formats", and a theme toggle.
- **Hero:** tagline plus one large **"Drop any file"** universal converter area.
- **Category tabs:** All · Video · Audio · Image · PDF · Documents · Spreadsheets.
- **Tool card grid** of popular conversions, each a card with an icon, a title and a one-line description. For example: MP4 to MP3, Video to GIF, MOV to MP4, MKV to MP4, WAV to MP3, M4A to MP3, HEIC to JPG, WEBP to PNG, PNG to JPG, JPG to PDF, PDF to JPG, PDF to Text, DOCX to Markdown, Markdown to DOCX, XLSX to CSV, CSV to XLSX, SRT to VTT.
- **Search box** that filters the tool cards ("heic", "mp3", …).
- **Footer:** "Your files never leave your device", a link to the privacy page and the supported-formats page.

### 7.2 Tool page (e.g. `/mp4-to-mp3`)
1. Big **"Select files"** button, plus a drag-and-drop zone that also accepts paste.
2. **File list:** name, size, detected type, a **"Convert to"** dropdown (only eligible targets; preselected from the tool) and a remove (✕) button.
3. **"Convert all to …"** shortcut when all files share a category.
4. **Convert** button, then per-file progress bars and an overall progress bar, with Cancel.
5. **Results:** a Download button per file, and **"Download all (ZIP)"** when there are two or more.
6. **Errors** are shown per file in plain language, never as raw stack traces.
- **Optional simple settings** per target, collapsed by default. Examples: quality (Low / Medium / High), image size, audio bitrate, GIF frame rate and max length. Every setting has a safe default so beginners never need to touch it.

### 7.3 Other pages
- **Supported formats:** a table generated from the registry, showing each format's category, whether it can be read, and whether it can be written.
- **Privacy & security:** a plain-language explanation that files stay on the device, with no cookies and no tracking.
- **404 page.**

### 7.4 Quality bar
- Responsive from 360 px phones to wide desktops.
- Accessible: keyboard navigation, visible focus, ARIA labels, progress announced to screen readers, WCAG AA contrast.
- Light and dark themes that follow the system preference, with a toggle.
- Fast: home page under 150 KB before engines load; Lighthouse ≥ 90 for performance and accessibility.

---

## 8. Security requirements (must-have, "insanely secure")
There is no server, so the attack surface is the browser page itself. Lock it down.

1. **Strict security headers.** Serve them from `public/_headers` for Cloudflare Pages or Netlify:
   ```
   Content-Security-Policy: default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; require-trusted-types-for 'script'
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Embedder-Policy: require-corp
   Cross-Origin-Resource-Policy: same-origin
   X-Content-Type-Options: nosniff
   Referrer-Policy: no-referrer
   Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
   Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
   ```
   COOP and COEP are also required for multithreaded FFmpeg (SharedArrayBuffer).
2. **No third parties.** There are no CDNs, fonts, analytics or trackers. Every script, font and WASM file is self-hosted and versioned.
3. **No inline scripts or styles**, so the CSP stays strict. Enable **Trusted Types**.
4. **XSS-safe UI.** Never use `innerHTML` with any user data. File names are shown with `textContent` only. The same goes for PDF text and document contents.
5. **Verify real file type.** Read the magic bytes and compare them with the extension. Mismatches go to the engine that matches the actual content, or are rejected with a clear message. Never trust the extension alone.
6. **Untrusted content never renders in the page.**
   - SVG and HTML inputs are only passed to engines, never inserted into the DOM.
   - Previews use `<img src=blob:>` only, where SVG scripts cannot run.
   - Converted HTML output is downloaded, never displayed.
7. **Isolation.** Every conversion runs in a Web Worker, so a malicious or broken file cannot freeze or touch the page. Kill the worker on timeout (e.g. 10 minutes) or on cancel.
8. **Resource limits.**
   - Maximum file size per engine.
   - Maximum number of files per batch (e.g. 100).
   - Maximum pixels for images (e.g. 100 MP, which blocks decompression bombs).
   - Maximum PDF pages (e.g. 500).
   - Maximum GIF duration.
   - ZIP-bomb checks when reading DOCX/XLSX/EPUB (limit total uncompressed size and compression ratio).
9. **Safe downloads.** Sanitize output filenames (strip path characters, control characters and reserved Windows names) and always use `<a download>` with blob URLs. Revoke URLs after use.
10. **Supply chain.**
    - Pin exact dependency versions and commit the lockfile.
    - Run `npm audit` in CI.
    - Enable Dependabot or Renovate.
    - Add Subresource Integrity to built assets where the host allows it.
11. **No data persistence.** Nothing is written to localStorage or IndexedDB except UI preferences such as the theme. Engine caching uses the normal HTTP cache.
12. **Security tests.** Add automated checks that:
    - the headers are present;
    - there are no external requests (Playwright fails on any non-self request);
    - a file named `<img src=x onerror=alert(1)>.png` is rendered harmlessly;
    - a renamed EXE disguised as `.jpg` is rejected;
    - an oversized image is refused.

---

## 9. Development phases (stop for review after each)

### Phase 0 — Setup (½ day)
- Vite project, folder structure, linting (ESLint + Prettier), `_headers` file, basic CI (build, test, audit).
- **Done when:** `npm run dev` shows a blank Baptist page with correct headers in preview.

### Phase 1 — Shell + home page + format registry
- Header, hero, category tabs, tool cards, search, footer, light and dark theme.
- `registry.js` with all formats, the compatibility matrix and unit tests (including every "must not be offered" case).
- Routing for tool pages (`/mp4-to-mp3` etc.) and the Supported Formats page.
- **Done when:** the home page looks finished, tool pages open, and the matrix tests pass.

### Phase 2 — Image converter (first real engine)
- magick-wasm worker, file list UI, Convert-to menus, progress, download, ZIP batch download.
- Images → PDF (pdf-lib).
- **Done when:** JPG/PNG/WEBP/GIF/BMP/TIFF/HEIC/AVIF/ICO/PSD/RAW convert correctly in Chrome, Firefox and Safari (latest); batches of 50 images work; the security tests from section 8 pass.

### Phase 3 — Audio & video
- ffmpeg.wasm (multithreaded) worker with sensible presets per target format.
- Video → audio extraction, video → GIF (length cap), video → frame JPG/PNG, animated GIF → MP4.
- Real progress from FFmpeg logs; Cancel works.
- **Done when:** the main video and audio formats convert; MP3 → MP4 and JPG → MP4 are **not** offered; a 500 MB MP4 → MP3 conversion completes on a mid-range laptop.

### Phase 4 — PDF, documents, spreadsheets, subtitles
- pdf.js: PDF → JPG/PNG (ZIP for multiple pages), PDF → TXT.
- Pandoc WASM: DOCX/ODT/HTML/MD/EPUB/RTF/LaTeX conversions.
- SheetJS: XLSX/XLS/ODS/CSV/TSV/JSON.
- Subtitle conversions.
- **Done when:** each pair in the matrix has a test file that converts successfully.

### Phase 5 — Polish & launch
- Offline support (PWA), keyboard shortcuts, nice empty/error states, favicon and logo, social preview image.
- Lighthouse and accessibility pass, final security review, and deploy to Cloudflare Pages.
- **Optional later:** a tiny self-hosted LibreOffice helper for Word/Excel/PowerPoint → PDF, only if wanted.

---

## 10. Project structure
```
baptist/
├─ public/
│  ├─ _headers              # security headers (CSP, COOP/COEP, …)
│  ├─ engines/              # self-hosted WASM files (ffmpeg, magick, pandoc)
│  └─ icons/
├─ src/
│  ├─ main.js               # app start, routing
│  ├─ ui/                   # home, toolPage, fileList, progress, theme
│  ├─ formats/
│  │  ├─ registry.js        # every format + compatibility matrix
│  │  └─ sniff.js           # magic-byte detection
│  ├─ converters/           # one module per engine (runs in workers)
│  ├─ workers/              # *.worker.js
│  ├─ queue.js              # job queue, cancel, limits
│  ├─ download.js           # safe filenames, ZIP
│  └─ styles/
├─ tests/
│  ├─ unit/                 # registry, sniffing, filenames
│  ├─ e2e/                  # Playwright flows + security checks
│  └─ fixtures/             # small sample files per format
└─ README.md                # how to run, build, deploy
```

---

## 11. Rules for you (the AI) while building
- Work **one phase at a time**. At the end of each phase, summarize what was built, what was tested, and any known limits, then wait for approval.
- Never add a dependency that loads code from a third-party server at runtime.
- Never offer a conversion that isn't in the matrix or that the engine can't really do.
- Keep functions small and commented. Explain anything non-obvious for a beginner.
- If a format fails in testing, remove it from the matrix (or mark it read-only) instead of shipping something broken, and tell me.
