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
