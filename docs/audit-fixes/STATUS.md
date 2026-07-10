# Audit-Fix Groundwork — Status

Branch: `audit/mini-groundwork` (based on `main` @ 81d0d42, 2026-07-10, unattended run).
Source audit: `claude/audit/AUDIT-SCORECARD.md` (Nov 2025).
Baseline verified before any change: `npm run build` exit 0, `npm test` 141/141 green.

Scope of this pass: diagnosis + safe mechanical fixes only (B2 partial, B3, B5).
Deliberately NOT touched: B1 sanitizer, B4 font rip-out, any Chapter-1 rendering logic.

---

## B1 — XSS via v-html (DIAGNOSIS ONLY — reserved for Anton)

**Verified current state:** 17 `v-html` instances across 14 files, no sanitizer anywhere
(no dompurify in package.json, no escaping helper).

Chapter-render files (HIGH RISK — interact with `<mark>` highlight injection, do not touch mechanically):

| File | count |
|---|---|
| src/components/chapter/TextComp.vue | 3 |
| src/components/chapter/HighlightRenderer.vue | 2 |
| src/components/chapter/text/SubSubSection.vue | 2 |
| src/components/chapter/text/SectionComp.vue | 1 |
| src/components/chapter/text/SubSection.vue | 1 |
| src/components/chapter/text/BreakSection.vue | 1 |
| src/components/chapter/text/BreakText.vue | 1 |
| src/components/chapter/text/EditableBlock.vue | 1 |
| src/components/chapter/text/FootNotes.vue | 1 |
| src/components/chapter/text/FootNotesWindow.vue | 1 |
| src/components/chapter/Illus/TextOverlay.vue | 1 |

Lower-risk (non-chapter):

| File | count | note |
|---|---|---|
| src/components/dashboard/chapters/ChapterBlockEditor.vue | 1 | previews `block.htmlContent` — user/DB-sourced, real stored-XSS surface for multi-user dashboard |
| src/components/UI/ActionButton.vue | 1 | `help` prop — currently developer-supplied strings; low risk but trivially convertible |

**Recommended approach (for Anton):** add `dompurify`, create one wrapper
(`SafeHtml.vue` or a `vSafeHtml` directive) with an allowlist that includes
`mark` + the classes/data-attrs the highlight system injects (see
`src/helper/marking.js` and stores). Convert the 3 low-risk instances first,
then chapter-render files one by one with visual QA of highlights/footnotes.
Risk: over-strict allowlist strips `<mark data-*>` and silently kills highlights —
test highlight create/restore round-trip after each file.

## B2 — 29MB animations / code-splitting

**Verified current state:**
- `public/publicAssets/animations/` = 35 Lottie JSONs, ~29MB total.
- They are **runtime-fetched, not bundled**: all players use
  `lottie.loadAnimation({ path: "/publicAssets/animations/<id>.json" })`
  (IllustrationComp, IllustrationOnScroll, FullScreenIllustration*, etc.).
  So they already lazy-load per-illustration; no bundling problem.
- The JSONs are already minified (single-line). The size is **embedded base64 PNG
  image sequences** inside the JSON `assets` arrays:
  - `animationStart.json` — 18MB = 137 embedded PNG frames (~136KB each)
  - `animationLatteralOrganizationRight.json` — 4.5MB (3 embedded images, 4.7MB b64)
  - `animationEyeStructurTransition.json` — 2.3MB (2 embedded, 2.4MB b64)
  - `animationDragon.json` — 1.1MB (4 embedded, 0.9MB b64)
- Vite build had **no manualChunks**; chunk names like `lottie.*.js` /
  `supabase.*.js` in the baseline output come from Vite's automatic dynamic-import
  splitting, not explicit config.

**Done this pass:** see Task 3 section below (lossless frame recompression + manualChunks).

**Left for Anton:** aggressive `animationStart` reduction (lossy WebP frames,
frame decimation, or re-export from After Effects at lower resolution/without
image sequence). Potential ~10-15MB further saving but not provably lossless.

## B3 — Unoptimized images

**Verified current state (files >1MB under public/ + src/assets):**

| File | size |
|---|---|
| public/publicAssets/images/ramonYCajal.png | 6.6MB |
| public/publicAssets/images/00-matisse-augen-cutout.png | 5.2MB |
| public/publicAssets/images/9-1-glaucoma.jpg | 2.1MB |
| public/publicAssets/images/marguerite.jpg | 2.0MB |
| public/publicAssets/images/00-matisse-bg.jpg | 2.0MB |
| public/publicAssets/images/9-1-macular-degeneration.jpg | 1.1MB |
| public/publicAssets/images/placeholders/monaLisa.webp | 1.0MB |

Plus ~6 files in 300KB–900KB range. `New Design Ideas/` uploads are reference
material, not shipped — ignored.

**Done this pass:** see Task 2 section below.

## B4 — font-size: 62.5% hack (DIAGNOSIS ONLY — reserved for Anton)

**Verified current state:**
- `src/index.css:325` sets `font-size: 62.5%` (1rem = 10px).
- 1,407 rem-valued tokens across 114 .vue/.css files under src/.
- Two stylesheets explicitly document the 10px assumption:
  `src/styles/brand.css:40`, `src/styles/dashboard-sections.css:11`.
- Reading-size prefs (`usePreferences` + pre-paint script in index.html) set rem-based
  CSS vars — these assume the 10px root and must be recomputed together.

**Recommended rip-out approach (NOT executed):**
1. Codemod: for every `N rem` token in src/**/*.{vue,css}, replace with `N/1.6 rem`
   rounded to ≤4 decimals (e.g. `1.6rem` → `1rem`, `11rem` → `6.875rem`). Pure
   regex on `([0-9]*\.?[0-9]+)rem` is safe because rem appears only as a CSS length.
2. Delete the `font-size: 62.5%` rule; same-pass update the two documenting comments,
   Tailwind config rem values (if any), and the pre-paint script's size vars.
3. Human visual QA across breakpoints/themes — rounding drift of <0.1px is expected;
   the risk is any place that mixes rem with hardcoded px assumptions.
   Estimated: 1 codemod + 2-4h visual QA. Do in one atomic commit for bisectability.

## B5 — No CSP

**Verified current state (baseline):** no CSP anywhere (no meta in index.html, no
headers config in repo). index.html has one inline pre-paint `<script>` (theme/prefs).

**Done this pass:** see Task 4 section below.

---

# Work log

Commits on `audit/mini-groundwork`:
- a06e7cf — audit(diagnosis): this status doc (Task 1)
- 5b91bb4 — audit(B3): image compression (Task 2)
- 510dd9b — audit(B2): lossless Lottie recompression + manualChunks (Task 3)
- b568eef — audit(B5): CSP meta (Task 4)

Every commit gated on `npm run build` exit 0 and `npm test` 141/141.
Note: vitest prints unhandled-rejection stack noise on some suites — pre-existing
on main baseline, all 30 files / 141 tests pass.

**Reserved for Anton (untouched):**
- B1 XSS sanitizer — approach in B1 section above (dompurify wrapper, allowlist
  must include the highlight system's `<mark>` markup; convert low-risk files first).
- B4 62.5% font rip-out — codemod plan in B4 section above; needs visual QA.
- Lossy animationStart reduction (13.9MB → ~2-4MB possible) — needs visual sign-off.
- Pre-existing IBM Plex split-font 404s (see Task 4) — fonts referenced by CSS
  missing from public/.

## Task 2 — B3 image compression (done)

Strategy: recompress **in place, same filename + extension**, because chapter
templates hard-code extensions in URL builders (`InlineImages.vue` appends
`.png`, `IllustrationFlip.vue` appends `.jpg`, etc.) and Supabase-driven
chapters may reference these public URLs. Originals recoverable from git history.

Tools: `sips` (resize + JPEG re-encode q75, max edge 2000/2048px),
`pngquant --quality=70-95 --speed 1`, `cwebp -q 80`.

| File | before | after |
|---|---|---|
| ramonYCajal.png (3396px → 2048px) | 6.6MB | 1.1MB |
| 00-matisse-augen-cutout.png (5174px → 2048px) | 5.2MB | 1.0MB |
| 9-1-glaucoma.jpg (2192px → 2000px) | 2.1MB | 500KB |
| marguerite.jpg (5473px → 2000px) | 2.0MB | 847KB |
| 00-matisse-bg.jpg (5473px → 2000px) | 2.0MB | 847KB |
| 9-1-macular-degeneration.jpg | 1.1MB | 595KB |
| placeholders/monaLisa.webp (→1200px) | 1.0MB | 170KB |
| marguerite.png | 891KB | 441KB |
| breakVideos/dowling-and-werblin.png | 687KB | 233KB |
| retinoRecipientRegions.png | 613KB | 66KB |

Total: ~22.2MB → ~5.8MB (−16.4MB).

Reverted (sips re-encode came out LARGER than original — already well
compressed): background.jpg (500KB), 9-1-cataracts.jpg (289KB),
9-1-retinitis-pigmentosa.jpg (333KB). Left as-is.

Over-500KB stragglers, justified: the two large PNGs are detailed artwork kept
at 2048px for retina displays; converting them to WebP would need the shared
`.png` URL-builder templates changed (affects all inline images) — left for a
follow-up. eyeDots.svg (278KB) untouched (SVG minification out of scope tonight).

Verified: build exit 0, tests 141/141.

## Task 4 — B5 CSP (done)

Added an enforcing `<meta http-equiv="Content-Security-Policy">` to index.html
(note: `<meta>` CSP cannot be Report-Only — that requires a response header, so
this is a deliberately permissive enforcing policy instead):

```
default-src 'self';
script-src 'self' 'unsafe-inline';   ← pre-paint prefs script in index.html
style-src 'self' 'unsafe-inline';    ← Vue SFC injected styles / inline styles
img-src 'self' data: blob: https://*.supabase.co;  ← Lottie base64 frames + Supabase storage
media-src 'self' blob: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;  ← REST + realtime
font-src 'self' data:;
worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'
```

Required external domains: only `*.supabase.co` (http + websocket). Fonts,
Lottie JSONs, images, and break videos are all same-origin.

Verified with the built app (`npm run preview` + headless Chromium): zero CSP
violations on load. Only console errors are **pre-existing 404s** for IBM Plex
split font files (`public/publicAssets/fonts/IBM-Plex/.../fonts/split/...`
paths referenced by CSS but not present in repo) — unrelated to this change,
flagged for follow-up.

Hardening plan (hosting layer, for Anton):
- Move policy to a response header at the host/CDN; add `frame-ancestors 'none'`
  and `report-uri`/`report-to` (both unsupported in `<meta>`).
- Replace `script-src 'unsafe-inline'` with the sha256 hash of the pre-paint
  script (stable per build via vite-plugin-html) or a nonce.
- `style-src 'unsafe-inline'` is hard to drop with Vue runtime style bindings;
  keep, or adopt hashes if Vue 3.5 trusted-types work lands.
- Tighten `https://*.supabase.co` to the exact project ref from VITE_SUPABASE_URL.

Verified: build exit 0, tests 141/141, app loads under CSP.

## Task 3 — B2 Lottie + code-splitting (done)

**(a) Lottie optimization — lossless only.**
- Confirmed: all Lottie JSONs are runtime-fetched
  (`lottie.loadAnimation({ path: "/publicAssets/animations/…" })`), never
  bundled, and load only when the owning component mounts. No bundling fix needed.
- JSONs were already single-line minified; the weight is embedded `data:` frames.
  `animationStart.json`'s 137 frames are actually **JPEGs** (1920×1080, ~100KB each).
- Applied **lossless** recompression to embedded frames: `jpegtran -optimize
  -progressive -copy none` for JPEG frames, `oxipng -o4 --strip safe` for PNG
  frames. Pixel-identical output; new base64 substituted into the raw JSON text
  so everything else in each file is byte-identical (re-validated as JSON).
- Results: animations dir 29MB → 23MB. Per file: animationStart 18.7→13.9MB
  (109 unique frames), EyeStructurTransition 2.4→1.8MB, LatteralOrganizationRight
  4.7→4.3MB, Dragon 1.1→1.0MB, AccommodationVergence 0.3→0.2MB, EyeMovements /
  ImpairedVision small gains. Files with vector-only content unchanged.
- **Skipped (not lossless — for Anton):** lossy WebP/quality-reduced frames or
  frame decimation on animationStart could take 13.9MB → ~2-4MB but changes
  pixels; needs visual sign-off. Base64 33% overhead is inherent to embedded
  Lottie assets; the real fix is re-exporting with external asset folder or
  a .lottie (zip) pipeline.

**(b) Vite manualChunks.** Added `build.rollupOptions.output.manualChunks` in
vite.config.js splitting `vendor-lottie` (300KB), `vendor-gsap` (112KB),
`vendor-supabase` (208KB), `vendor-vue` (109KB); all other modules keep
Rollup's default per-route splitting (a first attempt with a catch-all
`vendor` chunk produced an eager 1.13MB chunk and was dropped).
Entry `index.js` 253KB → 145KB; ChapterView chunk 468KB → 356KB; vendor chunks
are now long-term cacheable across deploys. Remaining large chunks (494KB,
393KB) are app data/JSON-heavy chunks — candidates for later work.

Verified: build exit 0, tests 141/141.
