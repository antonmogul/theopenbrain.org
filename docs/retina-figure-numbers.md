# Retina figure numbers — OPENBRAIN-67

The Retina's 26 record-backed figures are numbered by first appearance. Its 33 placements reuse their record's number, including repeated upload placements. This follows History's record labels, including Loewi's pane upload, videos and galleries. There are no Retina box figure records and no lettered series.

The coordinator confirmed that the seven standalone inline widget bands and the Cajal `content.image` stay unnumbered, as History's phrenology band does. No artwork, placement, prose, upload HTML, renderer or legacy JSON changes. Browser proof exposed a generic search gap: subsection/group figures were missing because search read only paragraph animation fields. The timeline now exposes queued container record keys only in its existing search source mode, and search resolves those records through the same label path. This also makes the Retina’s development film and disease figures searchable.

## Numbering

| Number | Record key                                            | Title                            | Placements |
| ------ | ----------------------------------------------------- | -------------------------------- | ---------- |
| 1      | `animationDragon`                                     | Dragon                           | 1          |
| 2      | `animationEyeStructur`                                | Eye structure                    | 1          |
| 3      | `animationAccommodationVergence`                      | Accommodation & vergence         | 1          |
| 4      | `widget-upload:retina-retinal-cell-types`             | Retinal cell types               | 4          |
| 5      | `animationLatteralOrganization`                       | Lateral organization             | 1          |
| 6      | `widget-upload:retina-synaptic-architecture`          | Synaptic architecture            | 1          |
| 7      | `widget-upload:retina-photoreceptors`                 | Photoreceptors                   | 2          |
| 8      | `animationRetinaCountingPhotons`                      | Counting photons                 | 1          |
| 9      | `animationRetinalCellTypes3`                          | Retinal cell types               | 1          |
| 10     | `animationRetinalCellTypes2`                          | Retinal cell types               | 1          |
| 11     | `widget-upload:retina-on-off-bipolar-cells`           | ON and OFF bipolar cells         | 4          |
| 12     | `animationRetinalCircuitsTransition`                  | Retinal circuits                 | 1          |
| 13     | `widget-upload:retina-center-surround`                | Center-surround receptive fields | 1          |
| 14     | `animationColorOpponency`                             | Color Opponency                  | 1          |
| 15     | `widget-upload:retina-object-motion-sensitivity`      | Object motion sensitivity        | 1          |
| 16     | `widget-upload:retina-rod-vs-cone-circuits`           | Rod and cone circuits            | 1          |
| 17     | `widget-upload:retina-light-sensitive-ganglion-cells` | Light-sensitive ganglion cells   | 1          |
| 18     | `animationEyeMovements`                               | Eye Movements                    | 1          |
| 19     | `animationRetinaDevelopment`                          | Retinal development              | 1          |
| 20     | `animationWavesOfActivity`                            | Spontaneous waves of activity    | 1          |
| 21     | `animationNormalVision`                               | Normal vision                    | 1          |
| 22     | `animationCataracts`                                  | Cataracts                        | 1          |
| 23     | `animationGlaucoma`                                   | Glaucoma                         | 1          |
| 24     | `animationDiabeticRetinopathy`                        | Diabetic retinopathy             | 1          |
| 25     | `animationAgeRelatedMacularDegeneration`              | Age related macular degeneration | 1          |
| 26     | `animationRetinitisPigmentosa`                        | Retinitis pigmentosa             | 1          |

## Shared records and citations

An anonymous GET export on 20 November 2026 covered all three published chapters visible to readers: Retina, History and Attention. None of the 26 records is referenced by another chapter's paragraph or section. Unpublished chapters are not visible to this read; the migration checks references across **all** chapters when executed and skips any record shared with one. Since the number belongs to the animation record, it cannot safely carry two chapter-specific labels.

There are no `figure_placeholder` blocks or numbered `Figure N` / `Fig. N` citations in current Retina prose. No citations were added or changed. The text “portions of the figure. A-G, retinal layers” in Cajal's image caption names anatomical features, not a numbered figure citation.

## Migration and release

`20261120066700_retina_figure_numbers.sql` changes only `animations.config.figureNumber` and `updated_at`, only for the listed keys still linked to the Retina and only when the number is missing or JSON null. Existing numbers, sibling config, chapter content and shared/unlinked records are preserved. Replaying it changes nothing. It is data only and may run before or after deploy; the existing reader already prints the record's label. This worker did not write to production or change feedback records.

The PGlite execution test is included in the isolated SQL CI lane. Its fixture is a dated anonymous export: Retina prose/config for the citation and order audit, other chapters' reference links/config for the shared-record and non-target preservation checks. No credentials or reader data are included.

## Verification

Run the SQL proof with `HISTORY_SQL_HARNESS=/path/to/@electric-sql/pglite npx vitest run --pool=forks src/__tests__/retinaFigureNumbers.sql.test.js`. It checks all 26 first-use numbers, repeated placements, unchanged prose/config outside the new key, creator numbers, SQL and JSON null config, shared section/paragraph references, unlinked records, no-module behavior and idempotence. It also exercises the actual rail and search helpers with numbered records.

For browser proof, use an anonymous GET snapshot of `modules`, `sections`, `paragraphs`, `animations`, `animation_states` and `animation_variants` as `--snapshot`, then run `HISTORY_SQL_HARNESS=/path/to/@electric-sql/pglite node scripts/retina-figure-numbers-browser.mjs --snapshot /path/to/live.json --out /path/to/proof` against Vite on port 5267. The script applies the real migration in PGlite and overlays only those animation rows through `page.route`; production receives GETs only. It compares before/after at 1440, 1024 and 390 in Chromium and WebKit, visits every pane/inline figure and widget placement, checks the toolbar labels that the existing renderers expose, rail names/tooltips and search labels, unchanged prose/placements, console errors and horizontal overflow. Existing Lottie and upload renderers that do not draw numbered toolbars keep their presentation; their record numbers appear in search and, on desktop, the rail.

Validation: 338 test files / 3,471 tests pass with PGlite 0.5.8 enabled; lint, production build, full format check, dependency graph and Storybook coverage pass. Browser before/after proof passes at 1440 and 390 in Chromium and WebKit. The existing shell toolbars read FIG 08 (Counting photons), FIG 14 (Color Opponency) and FIG 19 (Retinal development); all 26 record numbers are also exercised through the real search/rail helpers. Browser assertions cover the live search results for figures 7, 8, 20 and 26. The exact WebKit native media-control icon messages already present before the migration are filtered; no unexpected console errors or write requests are accepted.

Evidence: `/Volumes/Brain/artifacts/retina-cleanup/67/`; Chromium desktop results/screenshots in `browser-final/`, WebKit desktop in `browser-webkit-desktop/`, and both phone browsers in `browser-phone-final/`. The full smoke and hosted CI receipts are recorded in the final release report.

## Suggested CLAUDE.md paragraph (not applied)

The Retina's record-backed figures are numbered 1–26 by first appearance (migration `20261120066700`), with repeated placements reusing their record number; it has no box figure series. Pane uploads, inline/fullscreen figures, galleries and films count. Standalone widget bands and the Cajal content image remain unnumbered, like History's phrenology band. The migration fills only missing/null `config.figureNumber` and skips records shared with another chapter; the rail and search read the labels automatically. No numbered figure citations existed to update.
