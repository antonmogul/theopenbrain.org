# OPENBRAIN-5 — Case Cabinet: keep the 2D GSAP folders, do not build a three.js shelf

**Date** 2026-09-03 · **Ticket** OPENBRAIN-5 (status `needs-input`) · **Decision** keep 2D, close the 3D spike as won't-do for the folders.

## Question

The History chapter's "Case Cabinet" opens a patient folder into a two-leaf spread (brain + regions | transcript). `/case-cabinet` is a 2D GSAP Flip prototype (`src/views/CaseCabinetView.vue`). OPENBRAIN-5 asked whether a three.js shelf, modelled on `complete-shelf.html`, feels better and is affordable: **ship 3D, keep 2D, or hybrid?** The parallel `/case-cabinet-3d` route was never built, so the 3D evidence comes from the sibling prototype that did ship: `/phrenology-3d` (`@google/model-viewer` + `skull.glb`).

## Evidence

Production build of `main` (`npm run build`, 72 JS chunks, 7.1 MB raw / 2.8 MB gzip). Runtime measured with headless Chromium against `vite preview`, 1440×900 and 390×844, fps sampled with `requestAnimationFrame` during the interaction.

### Bundle cost

| Asset                                                    | Raw                      | Gzip               | Who pays                                                                          |
| -------------------------------------------------------- | ------------------------ | ------------------ | --------------------------------------------------------------------------------- |
| Main entry `index-*.js` + preloaded `vendor-vue`         | 148.6 KB + 113.2 KB      | 51.3 KB + 43.2 KB  | Everyone. Contains **zero** three/model-viewer code (grep: 0 hits)                |
| `vendor-gsap`                                            | 139.9 KB                 | 54.3 KB            | Every chapter reader already (`ChapterView` imports it) — shared, not extra       |
| `CaseCabinetView` js + css                               | 7.6 KB + 6.3 KB          | 3.2 KB + 1.8 KB    | Only `/case-cabinet`                                                              |
| `PhrenologyView` (2D) js + css + 6 engraving PNGs        | 5.3 KB + 3.7 KB + 1.2 MB | 2.3 KB + 1.2 KB    | Only `/phrenology`                                                                |
| `Phrenology3DView` (model-viewer with its bundled three) | 1,095 KB                 | 307 KB (250 KB br) | Only `/phrenology-3d`                                                             |
| `skull.glb` (quantized + webp)                           | 398 KB                   | incompressible     | Only `/phrenology-3d`                                                             |
| Draco / KTX2 decoders, 7 files in `dist/assets`          | 1.9 MB                   | —                  | Nobody: `new URL()` lazy refs, **0 bytes fetched** (the quantized GLB needs none) |

A reader who never opens a 3D route pays **0 extra bytes** — the split is real. A reader who opens `/phrenology-3d` pays about **+0.7 MB on the wire** (+307 KB gzip JS, +398 KB GLB) on top of a 2D route; the whole route is 2.08 MB raw. A raw-three.js cabinet, as the ticket specified, would add a **second** copy of three (`three@0.185.1` beside model-viewer's bundled r183): `three.module.min.js` is 366 KB raw, and the renderer pulls in most of the core, so the realistic floor is ~300 KB raw / ~80–100 KB gzip for the route — 25–30× the current cabinet chunk, before textures.

### Runtime feel

| Route            | Viewport | View root visible | Ready                    | fps during interaction | Horizontal scroll         | Console errors |
| ---------------- | -------- | ----------------- | ------------------------ | ---------------------- | ------------------------- | -------------- |
| `/case-cabinet`  | 1440×900 | 123 ms            | immediate                | 59 (folder morph)      | none                      | 0              |
| `/case-cabinet`  | 390×844  | 51 ms             | immediate                | 60                     | **yes, 425/390 (+35 px)** | 0              |
| `/phrenology`    | 1440×900 | 42 ms             | FCP 516 ms (engravings)  | 60 (view swap)         | none                      | 0              |
| `/phrenology`    | 390×844  | 41 ms             | FCP 520 ms               | 59                     | none                      | 0              |
| `/phrenology-3d` | 1440×900 | 154 ms            | model ready **1,414 ms** | 56 (orbit drag)        | none                      | 0              |
| `/phrenology-3d` | 390×844  | 117 ms            | model ready **1,135 ms** | 60                     | none                      | 0              |

JS heap: 10 MB on the 2D routes, 14 MB on the 3D one. At 1440×900 the open spread is 960×640 px and fits. At 390 px the cabinet drawer overflows by 35 px (already logged in OPENBRAIN-9 §5) and the open spread collapses to 359×239 px with the transcript clipped to two lines — it does not break, but it is not readable. The 3D route's bottom-sheet card at 390 px works.

### Code and maintainability

- **`CaseCabinetView.vue`** — 879 lines, 127 comment lines (14%), 12 commits 2026-07-29 → 08-05. The morph model is documented in the header; open and close are one GSAP Flip on the real `v-for` node; reduced motion via `reducedMotionK()`; data through the `useCaseFiles()` seam; folders and close are real `<button>`s. Gaps: no Escape-to-close, no focus return, no `role="dialog"`; no `onUnmounted` (timelines are not killed — harmless, no GPU resources); fixed-pixel layout at phone width. Tooling: `?slow=N`, `?scrub=1`, `scripts/filmstrip.mjs`, 16 committed frames in `docs/case-cabinet/filmstrip/`; seams unit-tested (`debugFlags`, `motion`); story in `Widgets/Full-page Views`; smoke-tested at 1280/1440/1920.
- **`Phrenology3DView.vue`** — 581 lines, 67 comment lines (12%). model-viewer web component with hotspots as slots; arrow keys cycle hotspots, Escape closes, `aria-label`s; reduced motion incl. `jumpCameraToGoal()`; bottom sheet ≤ 760 px; a data test pins every hotspot to the GLB bounding box. Gaps: no `onUnmounted` (model-viewer disposes its renderer on disconnect, so acceptable); **not in `scripts/smoke.mjs`** at all. The global CSP relaxations (`'wasm-unsafe-eval'`, `blob:`) cannot be reverted by dropping 3D — Pyodide needs `'wasm-unsafe-eval'` too (`index.html` note).
- `src/` has **zero** `import … from "three"`; `three@0.185.1` in `package.json` is unused (model-viewer bundles its own). A 3D cabinet would be the first raw three.js in the codebase: rig factory, raycaster, canvas-text textures, disposal, responsive camera — greenfield.

### Design fit

- Figma `3-1653` (Sonia's folder board, saved at `scratchpad/reference/fig1-1653.png`) is **flat throughout**: row 1 scattered numbered folders → single folder → two-panel spread; row 2 a hanging-file drawer with staggered tabs (S.B. / Y.M. / N.E. / A.BRA. / R.W.) → one folder lifts → opens to the spread — which is what `/case-cabinet` renders today; row 3, marked **WIP**, vertical folder strips with side tabs opening to the same spread, annotated as the mobile-friendly redesign. No perspective, shelf, lighting or camera anywhere.
- The three.js reference (`complete-shelf.html`, three@0.165 via CDN importmap, 5.9k lines, 900 KB) came from Anton's research, not from the design file. Nothing in the repo or the vault records Sonia asking for 3D folders; Sonia owns design (OPENBRAIN-12/13/14).
- The client's 3D ambition is the **brain as homepage navigation** (Stuart, 2026-04-09; `open-brain-explorer` in React Three Fiber; Tyler prototyping a 3D brain with 2D slices). The 2026-08-28 plan already deferred OPENBRAIN-5 as off the critical path.

## Options

| Option                                                                   | Cost                                                                                                                                                                                                   | Risk                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Ship 3D** — build `/case-cabinet-3d` in raw three.js per the ticket | 3–5 days to reach parity with the 2D morph (rig, raycaster, canvas-text tabs, dispose-on-unmount, `setViewOffset` camera for phones). +80–100 KB gzip on the route and a second three copy in the app. | The transcript becomes canvas texture: not selectable, not highlightable, invisible to screen readers and to the reader's highlight system. Mobile needs camera engineering to match what CSS gives free. Diverges from the flat board. |
| **B. Keep 2D** — the GSAP Flip cabinet                                   | ~1 day: WIP vertical-strip layout at ≤ 760 px, Escape + focus return, restore 390 to its smoke widths. 3.2 KB gzip.                                                                                    | Less spectacle than a shelf. The board does not ask for spectacle; it asks for mobile-friendly.                                                                                                                                         |
| **C. Hybrid** — 2D folders, 3D brain inside the open spread              | Reuses the model-viewer path already proven on `/phrenology-3d` (307 KB gzip chunk, fetched only when a folder opens). Needs a brain GLB with region hotspots.                                         | That GLB is the brain-navigation deliverable; producing it here first duplicates Tyler's work.                                                                                                                                          |

## Recommendation: keep 2D

Do not build `/case-cabinet-3d`; close OPENBRAIN-5 as won't-do for the folders.

1. The design source is flat, and the shipped prototype already matches row 2 of the board; the WIP row is a layout change, not a rendering change.
2. 3D costs ~100× the bytes of the 2D chunk (307 KB vs 3 KB gzip on the route we actually have, ≥ 80 KB gzip for raw three) and 1.1–1.4 s to interactive, for a folder morph that CSS 3D transforms already run at 59–60 fps.
3. The case transcript is reading content. It must stay DOM text so students can select, highlight and hear it; canvas-textured three.js pages break all three.
4. The client's 3D appetite is the brain, and model-viewer has already proven that pipeline (0 console errors, 12 tracked hotspots, 56–60 fps). One 3D investment, made where Stuart wants it, not two.
5. Mobile is first-class in the Figma WIP: 2D needs a CSS fix; 3D needs a camera system.

**Next step:** open a `fix/openbrain-<n>-cabinet-mobile-a11y` ticket that gives `/case-cabinet` the WIP vertical-strip layout at ≤ 760 px plus Escape/focus-return, puts 390 back into its smoke widths, and hands the folder board back to Sonia to finish the WIP row.

## What would change this

- Sonia's final folder design is drawn in perspective — an angled drawer, lighting, depth cues CSS cannot fake. Reopen with three.js, sharing one three copy with the brain project.
- The brain-navigation GLB and its hotspot schema stabilise. Switch to option C: drop the brain into the open spread's left leaf via model-viewer — a content swap, not a rebuild.
- Real-device numbers move: if `/phrenology-3d` stays above ~1.5 s to interactive on a mid-range Android phone, 3D belongs nowhere inside a chapter; if it lands well under 1 s, option C gets cheaper.
- Analytics show History-chapter readers open case files often enough to justify a 0.7 MB route.

Sources: `npm run build` output and `dist/assets` on `main` at `67d64c5`; Playwright run against `vite preview` (screenshots and `results.json` in the session scratchpad, not committed); `docs/case-cabinet/filmstrip/`, `docs/phrenology/`; vault tickets OPENBRAIN-2/5/6/7/8/9 and `plans/2026-08-28-open-brain-overnight-iteration.md`.
