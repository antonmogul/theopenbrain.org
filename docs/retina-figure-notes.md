# Retina figure review — OPENBRAIN-51

Local implementation and browser evidence; deployment and the content migration remain separate gates. No production data or review-feedback status was changed.

| Note id                              | Outcome      | Reply to the reviewer                                                                                                                                                                                                                                                                              |
| ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4ca567cf-3e14-45cf-875e-75f1a00f9252 | fixed        | The Zahn caption now keeps its space below the drawing while the figure fades away, preventing it from jumping up the left pane.                                                                                                                                                                   |
| 6818675d-21f0-49bd-a43c-065402aedc4b | fixed        | The zoom now uses the interactive figure's actual drawing coordinates and crop. The retinal cross section keeps the same size and position when its controls appear.                                                                                                                               |
| c97738ff-bf9a-4188-a620-69597aa5d045 | partly       | Matched the shared photoreceptors, bipolar, amacrine and ganglion cells to the first center-surround interactive, including size and position. Later interactives retain their distinct authored layouts.                                                                                          |
| 75677455-2e10-406f-a0e2-978eb2358a39 | fixed        | Restored the retinal cross section and corrected the horizontal-cell preset, so horizontal cells are highlighted as this section begins.                                                                                                                                                           |
| 0488435c-1d42-4bf5-9633-c16cb3972ea5 | fixed        | Restored the retinal cross section with bipolar cells highlighted. The figure stays available around the intervening ON/OFF interactive.                                                                                                                                                           |
| 5e17a303-f6d3-4a9c-baef-88bbe1832e20 | fixed        | The same bipolar-cell cross section is visible again when the ON/OFF interactive ends.                                                                                                                                                                                                             |
| b759bfad-b938-4496-99f8-241a95e32771 | fixed        | The photoreceptors figure now stays beside the phototransduction introduction until the next full-width interactive.                                                                                                                                                                               |
| 37a27421-64e5-4e59-a01a-145714b3f7e4 | fixed        | The rod-and-cone drawing returns after the visual-cycle interactive and stays beside the comparison of rod and cone sensitivity.                                                                                                                                                                   |
| f1ebcf1e-6202-4fa0-b1b6-a434770080bd | fixed        | The center-surround interactive now stays beside the remaining center-surround text and yields to the color-opponency figure.                                                                                                                                                                      |
| 54120e63-291c-4e30-94d1-17239508b8f1 | fixed        | Moved the Eye Movements title below the picture and added a legend describing the eye movements discussed in the text.                                                                                                                                                                             |
| 73de308d-1b97-41e0-b71b-69fac78e6b9f | needs Stuart | This note points to “Generation and wiring of retinal neurons.” The 2023 chapter has no animation at that paragraph; its next media item is the “Spontaneous waves of activity” video. Which animation should accompany the generation-and-wiring text, and can you identify or supply that asset? |

## Implementation

- Three-frame anatomy files were being parked at frame 24, beyond their authored range. Both normal and reduced-motion playback now clamp to the available frames. The offline `animationRetinalCellTypes3` alias also resolves to the original cross-section file.
- The horizontal section's saved name addressed `animationRetinalCellTypes`, although its saved id and stage addressed `animationRetinalCellTypes3` / “Horizontal cells.” The guarded migration corrects the name, preserving later author choices.
- Authored Retina transitions preload their uploaded successor. The existing sandbox bridge reports the artwork box and viewBox; the host validates finite geometry and the message source, accounts for iframe scaling, and frames the transition identically. The iframe remains sandboxed. This makes the cross-section handoff exact and matches the shared cells of the circuits entrance to center-surround, without rewriting uploaded widget HTML.
- Caption artwork keeps a stable flex slot throughout teardown; inline captions reserve the artwork’s authored aspect ratio so the picture cannot collapse to zero height. Eye Movements uses that caption slot for its title and a legend paraphrased from the existing chapter paragraph.
- `20261119510000_retina_figure_notes.sql` sets the two existing placements to `animationFlags.hold: "next"`, adds the same photoreceptor figure after the visual-cycle band, and corrects the horizontal-stage key. Boundaries still come from `figureEnd`; full-width bands and color opponency end the holds. Apply only after the code deploy; it has not been applied here.

## Validation

- Full Vitest suite with PGlite: **320 files, 3,441 tests passed** on the final source state. An earlier run overlapped edits and encountered two timeline-map timing failures; the isolated timeline rerun and the subsequent complete run passed.
- `npm run lint:ci`: passed (nine existing warnings); changed-file lint passed.
- `npm run format:check`, `npm run build`, and `npm run storybook:coverage`: passed.
- Chromium and WebKit: 1440×900 and 1024×768 pane checks; 390×844 inline checks, plus actual `devices["iPhone 13"]` contexts. Horizontal and bipolar presets (including the bipolar figure's return after ON/OFF), all three holds and the color-opponency boundary, both entrance crops/coordinates, the Zahn exit and Eye Movements caption placement were checked. Explicit reduced motion and horizontal overflow checks passed.
- The browser evidence records blocked YouTube/Google telemetry POSTs from the read-only guard, and WebKit's native `invalid/pip/airplay-placard` blob-icon diagnostics using the same narrow allowlist as `review-checkoff-browser.mjs`. There were no application page errors or unexpected console errors.
- The production-build smoke sweep is recorded in `smoke-final.log` beside the browser evidence; the final sweep outcome and exact-head CI state are in PR #215.
- Integration with merged PR #213: the dedicated SQL test applies the real `20261119500000_retina_text_review.sql` to its committed published fixture first. All three holds then apply; revised prose/citation blocks, the new Counting photons chart, and all three deletions survive unchanged. A further edited rod/cone opening also receives its placement, confirming there is no prose fingerprint guard. Both SQL suites pass (nine tests), and the merged full suite passes (3,441 tests).
- PR: https://github.com/antonmogul/theopenbrain.org/pull/215. Migration and deployment remain pending owner action.

Browser checks use the actual reader and published GETs, applying the pending text migration `20261119500000` before the figure migration `20261119510000` in local PGlite and overlaying those local results. The migration is never sent to production. Runtime proof therefore covers the proposed code/content combination, not a deployed migration.

Screenshots: `/private/tmp/claude-501/-Volumes-Brain-code-theopenbrain-org/4addea41-0573-4866-a7f1-11a4bc0678a6/scratchpad/nov18/codex-51/`.

Run `scripts/retina-figure-notes-browser.mjs` with `HISTORY_SQL_HARNESS`, `RETINA_FIGURE_FIXTURE`, `RETINA_FIGURE_BASE` and `RETINA_FIGURE_OUT`. The fixture is a JSON object with `modules`, `sections`, `paragraphs`, `animations`, `states` and `variants`, exported through `scripts/lib/supabase-rest.mjs` using published GETs. The browser rejects non-read requests. Keep fixture exports and tokens out of Git.

## Integration with the sibling widget lane

The shared uploaded-widget files only add source-checked artwork geometry to the existing ready/size report and forward that payload. Preserve the sibling lane's host styling, controls, narration and widget-content edits when integrating these small protocol changes.

## CLAUDE.md handoff paragraph

Retina anatomy Lotties can have only three frames: never seek an unclamped frame-24 rest state. The horizontal-cell section must address `animationRetinalCellTypes3` in both its id and trigger name so its `set: 1` preset reaches desktop and inline copies. The two authored Retina entrance/successor pairs use `TransitionWidgetSequence`; `waitForArtwork` makes the sandbox bridge report the drawing's box and viewBox so the entrance can share the uploaded widget's measured crop and coordinates, including iframe shrink-to-fit. Holds remain placement data (`animationFlags.hold`), capped by the normal figure and band boundaries.

## Reusable lesson for the coordinator

For a missing legacy figure, inspect the asset's `ip`/`op` before changing content or replacing the artwork. For scroll-to-widget continuity, compare the actual SVG viewport and its crop in both renderers; equal outer pane dimensions do not establish equal artwork size or position.
