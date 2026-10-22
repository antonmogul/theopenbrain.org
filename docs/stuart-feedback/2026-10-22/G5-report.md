# G5 delivery: Loewi layout and authored narration

PR: pending creation. Implementation base: `3f1bcd8171632503ac5bea8c822ea67d3c889940`
(main, PR #143). Scope: R12a, R12b, R12c.

## Findings and changes

- **R12a:** “Collecting the fluids” and the adjacent “Figure 1” timeline button
  overlap at a 900 px pane width. Omit only that redundant timeline button.
  The scientific SVG's Figure 1 label, scan, coordinates and timeline data
  remain unchanged. Other timeline controls retain their original seek targets.
- **R12b:** the fixed-height flex stage shrinks long captions beneath the
  transport. Preserve the minimum content size of the stage and prevent text
  and control rows from shrinking. Size containment lets the SVG share the
  available space without forcing its intrinsic height into the grid. When
  content exceeds a short pane, scroll the document; source credit remains
  reachable instead of being hidden on short screens.
- **R12c:** both Loewi and Retina center-surround use embedded MP3s through
  `new Audio(dataURI)`. The reader's CSP omitted `data:` in `media-src`.
  `srcdoc` inherits that policy as well as widgetHost's own, so both browsers
  report a media-src violation despite a real user gesture. Add **only**
  `data:` to parent `media-src`. No sandbox, script-src, connect-src, frame-src,
  autoplay permission, audio bridge or narration implementation change.
- Updated the authoring kit's narration/testing guidance and regenerated its
  downloadable ZIP. Added a repeatable HTTP browser acceptance script and SQL
  regression tests. The historical fit migration test now verifies its own
  immutable payload rather than assuming the current upload is still identical.

## Research: code versus deployment

`origin/main` was verified at PR #143. The coordinator's last verified demo
release was PR #140; this run does not assert a refreshed Railway commit.
The live demo's HTML was fetched and still omits `data:` from media-src. A
read-only anonymous query of the published Loewi upload returned MD5
`e9bad5bad98b17a1159c002392086ed5`, exactly the historical fit migration's
payload and the new migration's prerequisite. The defects therefore remain
in current main, independently of the stale demo deployment.

The original `https://theopenbrain.org/chapter` was opened at mobile and desktop
widths: it is the 2023 Retina prototype (last-modified 29 December 2023), with a
1320 px minimum desktop notice on narrow screens. Its desktop chapter and
artwork differ from the newer authored-upload system; it is a visual/scientific
reference, not evidence that the current sandbox's narration works.

See the [research plan](G5-research-plan.md) for primary CSP documentation.

## Acceptance evidence

The HTTP harness uses the actual app CSP, `buildWidgetDoc`, the authored HTML,
and `sandbox="allow-scripts"`. It uses real Play/narration clicks, unchanged
media playback, and a Web Audio analyser to inspect decoded output. Its negative
control removes the parent data-media allowance and reproduces the original
failure. It performs no database writes.

| Check                                       | Result                                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium Loewi narration                    | Nonzero decoded waveform, peak 0.7516; advancing media time; readyState 4; no media CSP violation                                                                 |
| Chromium Retina center-surround narration   | Nonzero decoded waveform, peak 0.7472; advancing media time; readyState 4; visible authored artwork                                                               |
| Original CSP, both engines and both widgets | data-media CSP violation, zero waveform; negative control reproduces failure                                                                                      |
| Firefox 153 narration                       | **Inconclusive**: bare unsandboxed/no-CSP MP3 control also stalls at readyState 1, time 0, peak 0, despite a running AudioContext; reproduced headed and headless |
| Chromium + Firefox layout                   | All 14 captions at 1280×800, 900×600, 700×600, 390×600 and 390×420; complete text boxes precede controls, no horizontal overflow                                  |
| Timeline labels                             | Original collision reproduced at 900 px; remaining labels do not overlap at 900/1280 px; scientific Figure 1 label retained                                       |
| Keyboard / reduced motion                   | Enter activates Restart and Next step; paused steps remain paused; explicit host reduced-motion preference received; no automatic playback on load                |
| Unit/SQL                                    | 30 passed in 5 scoped files; PGlite executed, no SQL skips                                                                                                        |
| Formatting / lint / build                   | Full format check passed; full lint passed with 6 existing warnings; production build passed (existing bundle/externalization warnings)                           |

[Machine-readable browser results](G5-evidence/browser-results.json) and inspected
screenshots: [original overlap](G5-evidence/before-label-overlap.png),
[desktop correction](G5-evidence/after-desktop-caption.png),
[Firefox phone caption/controls](G5-evidence/after-firefox-phone-caption.png),
[Retina artwork during decoded playback](G5-evidence/retina-artwork-playing.png).

Commands:

```sh
HISTORY_SQL_HARNESS=/tmp/tahiti-smoke/node_modules/@electric-sql/pglite \
  node node_modules/vitest/vitest.mjs run --pool=forks --maxWorkers=1 --minWorkers=1 \
  src/__tests__/loewiCaptionNarration.sql.test.js \
  src/__tests__/historyLoewiWidgetFit.sql.test.js \
  src/__tests__/historyLoewiWidget.sql.test.js \
  src/__tests__/historyLoewiBesideText.sql.test.js \
  src/widgets/uploaded/__tests__/widgetHost.test.js
G5_FIREFOX_EXECUTABLE=/tmp/openbrain-g5-browsers/firefox-1538/firefox/Nightly.app/Contents/MacOS/firefox \
  G5_ALLOW_AUDIO_CONTROL_FAILURE=1 node scripts/widget-narration-browser.mjs
npm run format:check
npm run lint:ci
npm run build
```

The explicit browser flag continues policy/layout checks after a failing bare
engine control; the JSON marks Firefox audio **INCONCLUSIVE**, not passed.
Without that flag the harness fails on a broken decoder control. The isolated
Firefox installation and Vite cache are under `/tmp`; shared dependencies and
caches were not modified. Port 6105 was used; port 5198 was not touched.

## Database, release and review requirements

`supabase/migrations/20261022030000_g5_loewi_caption_layout.sql` is **unapplied**.
It locks the Loewi row, verifies the exact prerequisite payload hash, replaces
only HTML/updated_at, and no-ops if the final payload is already present.
Missing uploads or intervening author changes raise an exception. Tests cover
success, metadata/other-row preservation, idempotence, missing prerequisites
and changed author content. Asset hashes, SVG, timeline, narration and source
credit are compared against the prior payload.

Deploying code enables embedded audio; applying the guarded migration separately
updates the published Loewi layout. No merge, deployment, admin save/publish,
credential change or live Supabase mutation was performed. Independent review
must inspect the exact PR head; no self-approval is implied.

Remaining acceptance: Firefox on a working decoder/runtime and physical audio
output, then deployed reader acceptance after the authorized code release and
migration. This run proves decoded Chromium output, not audible speaker output;
it samples Retina center-surround rather than every narration clip/widget.
No Stuart design decision is required for these scoped corrections.

## Note ready for Stuart

We found the shared policy that was blocking the embedded Loewi and Retina
narration and prepared a focused fix. Loewi's duplicate timeline label is removed
and its longer explanations stay clear of the playback controls, with the
original artwork, narration and source retained. The changes are ready for
independent review; they are not live yet, and Firefox audio still needs a check
on a working browser runtime.
