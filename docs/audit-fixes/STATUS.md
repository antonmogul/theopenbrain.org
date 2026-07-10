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

(Filled in per task below, with commit hashes and before/after numbers.)

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
