# G4 — Penfield maps and labels

R09 and R10 implemented on main baseline `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR143). [PR #145](https://github.com/antonmogul/theopenbrain.org/pull/145), implementation commit `b0fc2242742fb8ad1ece6fa32626f3811128aff5`; the coordinator receives the final head after this documentation follow-up for independent review. Not merged, deployed or applied to Supabase.

## Research: code versus deployment

- The [original Retina chapter](https://theopenbrain.org/chapter) still serves the 2023 chapter (`index.31e00edc.js`), with no Penfield cabinet. It is a visual reference, not a competing History dataset.
- The [demo cabinet](https://theopenbrainorg-production.up.railway.app/case-cabinet) served `index-B6TK0WZV.js` during this run. Its old cabinet has rounded controls and black scan numerals with purple outlines; see [production before](G4-evidence/production-before.png). It lacks main's Fit control and revised reading workspace. The full-map sizing fix is already in PR143 and awaits deployment; this PR preserves that implementation.
- Main still had `Be Penfield` in fallback placement metadata and the historical database migration. The black labels are part of the original PNGs, and the old interactive marker hid its text. Those are current source issues addressed here.

## Implementation and source safeguards

- Exact corrected title: **Find out what it was like to be Dr. Wilder Penfield**, shared by standalone heading/accessibility name, widget catalog and reader placement.
- Purple IBM Plex numbers replace square marker outlines and duplicate printed numerals. The color is the established chapter-deep token; hover/selection underline and keyboard focus outline are distinct from color alone.
- A separate source-pixel SVG mask layer hides mapped printed numerals. No PNG was regenerated, cropped, inpainted or overwritten. Hand-bounded polygons stop short of anatomical strokes at joined numeral/line junctions, notably S. Be., A. Bra. and N.C.; shared black junction ink is retained rather than guessing/redrawing anatomy. Masks and number text scale with the source image, while button centers retain the original percentage coordinates exactly.
- **Original scan** removes the entire presentation layer. **View original scan** opens the original file. Neither changes the point list, notes or selected point. Case changes restore the default presentation.
- All seven patients, 47 transcript points, 45 mapped positions and 82 events remain intact. G.P. 16 and G.E. 4 retain their unconfirmed-location disclosures and have no invented map buttons; G.P.'s original `17d` label remains black and unaltered.
- Kept PR143's fit calculation, immediate case switches and reversible spatial storyboard. Fixed a browser-observed phone hit-test issue: glyph overflow from S. Be. 25 intercepted point 24. The label span now ignores pointer events so its coordinate-positioned native button owns the hit target, consistent with [MDN pointer-events](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/pointer-events). SVG source-pixel alignment follows the [viewBox coordinate mapping](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/viewBox).

## Files changed

- `src/views/CaseCabinetView.vue`: visible labels, reversible presentation layer, original-scan access and title.
- `src/helper/penfieldPresentation.js`: shared title and source-pixel mask geometry.
- `src/widgets/placements.js`, `src/widgets/catalog.js`: case-cabinet title only.
- `src/views/__tests__/CaseCabinetView.test.js`, `src/__tests__/penfieldPresentation.test.js`, `src/__tests__/penfieldTitle.sql.test.js`: source, component and migration coverage.
- `scripts/penfield-browser.mjs`: focused read-only browser acceptance.
- `supabase/migrations/20261022020000_penfield_experience_title.sql`: unapplied title update.
- This report, `G4-research-plan.md` and `G4-evidence/`: research and browser receipts.

## Validation

| Check                       | Result                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scoped Vitest               | 54/54 passed: cabinet, placements, source integrity, executed SQL migration                                                                                                                                                                                              |
| Source integrity            | SHA-256 of every original scan matches appendix metadata; all 47 points and 82 event strings compared exactly, including original whitespace                                                                                                                             |
| PostgreSQL behavior         | PGlite executed migration twice; correct History blocks at any index updated, custom titles/unrelated widgets/other chapter/malformed or absent blocks untouched; second run does not touch timestamps                                                                   |
| Chromium                    | 1440×900, 1024×768, 390×844: all 7 complete maps fit without internal scrolling at 100%; 141 point selections, 246 event comparisons                                                                                                                                     |
| Firefox                     | Same 21 fit checks, 141 selections and 246 event comparisons passed                                                                                                                                                                                                      |
| Interaction in both engines | Actual pointer hits on all 45 map labels at each viewport, native keyboard activation, Escape/focus restoration, mobile map→notes→map, original toggle, magnification/Fit, OS and explicit app reduced motion, interrupted opening/reversal and immediate case switching |
| Visual inspection           | All seven source scans and rendered desktop maps inspected; close-up mask checks at joined anatomical strokes; phone maps and unconfirmed disclosures inspected                                                                                                          |
| Scoped ESLint / Prettier    | Passed                                                                                                                                                                                                                                                                   |
| Production build            | Passed via Vite build API with isolated `/tmp/openbrain-g4/build-cache`; existing large-chunk warning only                                                                                                                                                               |
| Whitespace                  | `git diff --check` passed                                                                                                                                                                                                                                                |

Reproduction (no backend writes): run the app on port 6104 with its own Vite cache, then `node scripts/penfield-browser.mjs`; repeat with `PENFIELD_ENGINE=firefox`. Browser evidence defaults to `/tmp/openbrain-g4/browser`. The committed [Chromium results](G4-evidence/chromium-results.json) and screenshots show actual artwork and fit dimensions, not just console status.

Scoped unit command: `HISTORY_SQL_HARNESS=/tmp/tahiti-smoke/node_modules/@electric-sql/pglite node_modules/.bin/vitest run --maxWorkers=1 --minWorkers=1 src/views/__tests__/CaseCabinetView.test.js src/__tests__/penfieldPresentation.test.js src/__tests__/penfieldTitle.sql.test.js src/widgets/__tests__/placements.test.js --cache=false`.

Desktop artwork: [G.E.](G4-evidence/chromium-1440-ge.png), [S. Be.](G4-evidence/chromium-1440-sbe.png), [G.P.](G4-evidence/chromium-1440-gp.png), [Y.N.](G4-evidence/chromium-1440-yn.png), [N.C.](G4-evidence/chromium-1440-nc.png), [A. Bra.](G4-evidence/chromium-1440-abra.png), [R.W.](G4-evidence/chromium-1440-rw.png). Phone: [S. Be.](G4-evidence/chromium-390-sbe.png), [R.W.](G4-evidence/chromium-390-rw.png).

## Migration, limitations and handoff

- **Unapplied migration:** `supabase/migrations/20261022020000_penfield_experience_title.sql`. Only History `case-cabinet` widget blocks whose title is still exactly `Be Penfield` change. Author-edited titles are deliberately preserved. It must be applied separately after approval; code deployment alone will not rename an already-stored reader card.
- The whole-map fit necessarily makes tightly packed labels on the tall S. Be./A. Bra. plates small, especially on phones. Zoom and the equivalent 44px point-list buttons provide comfortable access without displacing the scientific positions. No new location is inferred.
- Browser tests use the bundled standalone cabinet, without live Supabase reads or writes. Reader placement is unit-tested and its stored title is SQL-tested; authenticated deployed chapter acceptance remains outstanding. No broad full-suite or Storybook build was run alongside the other workers.
- Independent review is still required at the exact PR head. Pay particular attention to presentation masks at shared ink junctions, tall-map readability and the unapplied title migration. No additional Stuart decision was assigned to G4.
- Shared-file overlap: only the case-cabinet entries in `src/widgets/placements.js` and `src/widgets/catalog.js`, reserved with the coordinator. The existing shared History browser fixture is untouched; `scripts/penfield-browser.mjs` is a separate, repeatable focused check.

## Note ready for Stuart

The Penfield experience now has your requested title and purple clickable point numbers. Every patient's original notes and scan is preserved, and you can switch back to the original scan for comparison. Complete maps fit the desktop panel, with magnification and larger point buttons available for the dense plates; this is ready for review and still needs deployment plus the small title update before it is live.
