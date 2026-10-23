# G3 — Phrenology research and implementation plan

Scope: R06, R07, P01–P05. Baseline: fetched `origin/main` and this checkout at `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR #143), 22 October 2026.

## Research

- Read the coordinator brief and repository `CLAUDE.md`, design-core craft guidance and the existing Open Brain tokens in `src/styles/brand.css`. This is a repair of the established IBM Plex, square-control interface.
- Opened the [original Retina chapter](https://theopenbrain.org/chapter) in Chromium: it is the original Retina prototype, not the History/phrenology source. It provides presentation context but no replacement phrenology geometry.
- Compared [demo production](https://theopenbrainorg-production.up.railway.app/phrenology) with current main served read-only on port 6103. Both reproduce all seven R06 selections: lateral 31 renders nine filled paths; posterior 5/2/4/3/11/10 render 14/13/26/13/14/7. The source maps have respectively 1/2/1/2/1/2/1 actual filled region shapes. The other paths are decorative open border segments, incorrectly copied into the clickable fill layer. [SVG 2 fill semantics](https://www.w3.org/TR/SVG2/painting.html#FillProperties) close open subpaths for filling, causing wedges and compounded purple opacity.
- R07: selecting 12 from anterior leaves anterior active and zero selected regions, while showing its text. Current main has the same unconditional `selectRegion` call. These defects survive PR #143; the known production deployment lag does not explain them. This task does not independently establish Railway's deployed commit.
- P01: Organ 12 blocks 583 and 584 split the first paragraph (three displayed paragraphs rather than two). P02: Organ 24 blocks 788/789/790 split the second paragraph (five rather than three). P03/P04: 6 and 11 display the manuscript-caption editorial notes. P05: 22 still displays the old quoted manuscript note. All five reproduce on production and main.
- Original source SVGs, appendix JSON, image hashes, label anchors and scientific wording are authoritative and will remain unchanged. Local before screenshots for all seven selections and original Retina are in `/tmp/openbrain-g3-evidence/`.

## Implementation

1. Extract only the explicitly filled paths from the known source SVG format, retaining decorative paths in the outline layer. Reuse the same geometry filter for the 3D picking map so it cannot reintroduce filled decorative segments. Do not redraw, renumber or reposition the source artwork.
2. Make the 2D organ picker retain the current view when its loaded map contains the organ, otherwise choose the first available view in anterior/lateral/posterior order. Await the entire transition before selecting. Disable controls during transitions; keep Organ 22 text-only with no invented geometry.
3. Add a display adapter shared by the 2D and 3D detail cards. Join only the specified source blocks with spaces, retain all contributing block IDs, suppress the two requested display notes and set Organ 22's exact requested wording. Keep canonical records and provenance tests unchanged.
4. Verify real source geometry, transition completion, keyboard/focus behavior, content and source hashes with scoped tests. Run lint/format and a production build without modifying shared dependencies/cache.
5. Use Chromium at desktop and mobile sizes to inspect all seven highlighted selections, view switching/retention, Organ 22, text repairs, and both OS and explicit reduced-motion settings. Save reproducible browser checks and durable visual evidence. Commit/push and open a focused PR for independent review; do not merge, deploy or write live data.

No migration or deferred Stuart decision is expected for this group. Browser QA uses the bundled standalone phrenology route and never saves/publishes admin content.

## Browser-driven refinement

The first mobile pass showed the existing detail sheet obscuring almost the entire skull at 390 × 844. The coordinator explicitly accepted a scoped visibility repair: reserve the skull above a scrolling text row, retain usable keyboard/touch controls and natural page scrolling, and check short landscape. The implemented layout keeps a 24 px gap between skull and details on mobile and a 12 rem skull floor on short screens. Controls continue using square tokens; numbered labels use the existing UI font. Original SVGs, anchors and source records remain unchanged.

## Independent-review follow-up — PR 144

The review at `fa232f4cb02f0281eb69fea8403c1a64f4195e4b` identified two P2 issues. Both reproduced against the reviewer's production and Storybook builds on isolated ports: selecting Organ 12 from anterior left focus on `BODY` and Escape did nothing; the real FullScreenBand at 390 × 844 placed the final paragraph bottom at y967.39 below the widget's y934 clipping edge even at maximum card scroll.

Research: the [HTML focus model](https://html.spec.whatwg.org/multipage/interaction.html#focusable-area) excludes disabled form controls, while [CSS Grid sizing](https://www.w3.org/TR/css-grid/#algo-track-sizing) separates track allocation from an item's overflow. Reenabling a control and reaching a card's maximum scroll therefore do not establish usable focus or visible text. Native Chromium reproduction confirmed both mechanisms here.

Implementation decisions:

1. Retain native disabled controls during the transition. Remember the initiating picker/tab before disabling, await animation completion and Vue's DOM update, then restore it only if focus is still on the body. Do not steal focus from an independently focused control.
2. Make mobile artwork/text tracks share available host height, with a 150 px artwork floor and 9 rem reading floor. Cap the card to its allocated row. Reserve body, chrome and citation space; permit local widget overflow in short hosts so content remains reachable rather than clipped. Do not alter FullBleed or WidgetBreakout.
3. Add a G3-owned responsive Storybook fixture using the actual WidgetBreakout/FullBleed host, alongside the original reviewer fixture (whose prose wrapper is desktop-specific). Check native picker and tab focus, Escape without any refocus, final rendered line against every clipping ancestor, citation separation, and effective normal/OS/app reduced-motion settings at desktop, portrait and landscape sizes.
4. Re-run source-preservation/artwork checks, full unit tests, format/lint and isolated production/Storybook builds. Push the same PR and return its exact new head for independent review; no merge, deployment or database action.
