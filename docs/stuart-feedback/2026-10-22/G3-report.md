# G3 — Phrenology delivery report

[PR #144](https://github.com/antonmogul/theopenbrain.org/pull/144), targeting `main` from `antonmogul/Phrenology-followups`.

Original implementation and browser-evidence commit: `259113d4d2ee6544f2564ae2501fccfa6610484a`; independently reviewed head: `fa232f4cb02f0281eb69fea8403c1a64f4195e4b`. The follow-up below supersedes the original focus and embedded-layout acceptance claims. The exact final PR head is supplied in the settled orchestration handoff and its companion report, because a committed report cannot contain its own commit hash.

## Independent review findings addressed

Validated follow-up implementation and evidence commit: `3775ad5d727fd0cb963296757c09d62a8b21af50`. The following report update is documentation-only.

Both P2 findings reproduced on the reviewed production and Storybook builds before editing. Organ 12 from anterior left `document.activeElement` on `BODY`; Escape left the card open. At 390 × 844 in the actual FullScreenBand, the final paragraph bottom was y967.39 while the widget clipped at y934, despite maximum card scroll.

- **Picker/tab focus:** `switchView` captures the initiating native control, waits for GSAP completion and Vue's reenable render, and restores that control only while focus remains on the body. Independently moving focus to another control is respected. The browser regression focuses once before selecting Organ 12, waits for the automatic switch, then presses Escape without any intervening refocus. Keyboard-activated view tabs are checked independently.
- **Embedded card/citation visibility:** mobile grid tracks share the host height and retain minimum artwork/reading space; the scrolling card is constrained to its allocated row. Header and citation do not shrink. A body floor and local widget scrolling preserve reachable artwork, text and citation in short landscape hosts. FullBleed and WidgetBreakout are unchanged.
- **Integration evidence:** `scripts/phrenology-host-browser.mjs` covers the standalone route, original real FullScreenBand, and a new G3-owned responsive story using the real WidgetBreakout/FullBleed components. The original story's desktop prose wrapper still limits mobile horizontal positioning; the responsive story verifies full final-line width without modifying shared host code. Tests measure the final rendered text line against every vertical clipping ancestor and viewport at maximum card scroll, check actual citation reachability, and verify effective motion preferences. Screenshot capture occurs with the final line visible.

Additional changed files: `src/views/__stories__/PhrenologyView.stories.js` (responsive integration story), `src/views/__tests__/PhrenologyView.test.js` (relax an obsolete exact CSS-string assertion while retaining the host-variable contract), the new browser script, and G3 documentation/evidence. Scientific assets, source coordinates, maps, appendix text, security, dependencies and shared hosts remain unchanged.

### Follow-up validation

- **27/27 Chromium host/viewport/motion cases passed:** standalone + original FullScreenBand + responsive real-host story, each at 1440 × 1000, 390 × 844 and 844 × 390, with normal, OS reduced and app reduced motion. Picker and tab focus, Escape without refocus, no focus stealing, complete final-line visibility at maximum card scroll, artwork/card separation and reachable citation all pass; no uncaught browser errors.
- **21/21 selected-artwork cases passed again** on the final production build, including all seven reported regions, source-path counts/anchor containment, pointer/touch, deterministic switching, content repairs and motion preferences.
- **Measured phone repair:** in the real 390 × 844 FullScreenBand, the card is now 200.03 px high. After scrolling to its end, the last rendered line ends at y599.95 inside the visible clipping edge at y634.61. The responsive real-host fixture also shows the complete line horizontally (x40–229.53) and vertically (bottom y609.95 inside y644.61). All 27 cases prove the complete citation can be scrolled into view.
- **Production and Storybook builds passed.** Full repository format and lint passed (zero errors, six pre-existing unrelated lint warnings); changed-file lint and diff whitespace checks passed. The original maps/scans, appendix JSON and anchor JSON compare byte-for-byte unchanged against the PR base.
- **Unit suite:** an initial full pass had 2,439 passing tests and 56 skips. A later run hit one unrelated CaseCabinetView GSAP timing timeout; its focused rerun plus Phrenology passed 27/27. The final full-suite rerun after browser QA passed **2,439 tests across 212 files**, with 56 tests in 16 files skipped (including the unavailable SQL harness); log: `/tmp/openbrain-g3fix-final-tests.log`.

Production and Storybook builds use unique `/tmp/openbrain-g3fix-*` caches and outputs, served on loopback ports 6123/6124. Browser requests permit GET/HEAD only. Final measurements are in [host-regression.json](G3-evidence/review-fixes/host-regression.json), with [desktop](G3-evidence/review-fixes/responsive-host-desktop-normal-final-line.png), [portrait](G3-evidence/review-fixes/responsive-host-mobile-normal-final-line.png), [landscape](G3-evidence/review-fixes/responsive-host-landscape-normal-final-line.png) and [original reviewer fixture](G3-evidence/review-fixes/embedded-mobile-normal-final-line.png) screenshots; full screenshots/build/test logs remain under `/tmp/openbrain-g3fix-*`.

Reproduce with a production preview and built Storybook:

```sh
BASE_URL=http://127.0.0.1:6123 STORY_URL=http://127.0.0.1:6124 OUT_DIR=/tmp/openbrain-g3fix-evidence node scripts/phrenology-host-browser.mjs
BASE_URL=http://127.0.0.1:6123 OUT_DIR=/tmp/openbrain-g3fix-evidence/artwork node scripts/phrenology-feedback-browser.mjs
```

No migration, production write, merge, deployment, credential change or external message is required or performed. Exact-new-head independent review, CI, merge/deployment and authenticated live acceptance remain separate coordinator-owned gates.

## Findings and delivery

| Requests | Cause and implemented result                                                                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R06      | The 2D extractor and 3D picking map filled decorative open border paths. SVG implicitly closes these during filling, producing false wedges and overlapping purple shades. Both now use only the explicitly filled source paths. All seven problem selections match the original map paths; bilateral regions remain bilateral. |
| R07      | The picker opened content without checking the current map. It now keeps a valid view or selects the first loaded map containing the organ in anterior/lateral/posterior order, waits for the complete transition, and opens the text. Controls lock during the transition. Organ 22 stays text-only.                           |
| P01      | Organ 12's first paragraph joins source blocks 583 and 584 with one space. Two paragraphs display.                                                                                                                                                                                                                              |
| P02      | Organ 24's second paragraph joins blocks 788, 789 and 790 with spaces. Three paragraphs display.                                                                                                                                                                                                                                |
| P03, P04 | Organ 6 and 11's manuscript-caption editorial notes are hidden in the detail cards. The source records retain them.                                                                                                                                                                                                             |
| P05      | Organ 22 displays exactly: “Region not labelled by Spurzheim in an image plate nor on the manuscript's frontispiece. No skull position is assigned here.”                                                                                                                                                                       |

Current main was freshly fetched at `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR #143). The seven geometry failures, invisible-organ picker behavior and all five content requests reproduced on both main and [demo production](https://theopenbrainorg-production.up.railway.app/phrenology). The known deployment lag therefore does not explain these defects; this run did not independently establish Railway's deployed SHA. The [original Retina chapter](https://theopenbrain.org/chapter) was inspected in Chromium and remains the Retina prototype, without a History/phrenology counterpart from which to substitute geometry. Technical behavior was checked against [SVG 2 fill semantics](https://www.w3.org/TR/SVG2/painting.html#FillProperties).

See [the research plan](G3-research-plan.md) for the initial findings and implementation sequence.

## Files and preservation boundaries

- `src/helper/phrenologyMaps.js`: source-filled region extraction for 2D targets and 3D picking, with real-map regression tests in `src/helper/__tests__/phrenologyMaps.test.js`.
- `src/helper/phrenologyContent.js` and its tests: display-only paragraph and note adapter. Each rendered paragraph retains all contributing source block IDs; canonical records are unchanged.
- `src/views/PhrenologyView.vue`: view-aware picker, transition completion, responsive artwork/text separation, square picker token, IBM Plex UI labels and OS/explicit reduced-motion CSS. Its view tests cover switching, retention, source references, notes, keyboard and dismissal.
- `src/views/Phrenology3DView.vue`: the same content adapter and contributing block attributes. Existing WebGL-unavailable content tests pass.
- `scripts/phrenology-feedback-browser.mjs`: reproducible read-only production-build acceptance; screenshot and measurement output is configurable.
- This group's research plan, report and `G3-evidence/` only. No coordinator-owned brief or completion log changes.

The appendix JSON, original scans, image/source hashes, all SVG paths and label anchors are unchanged. No geometry is invented for Organ 22. No dependency or lockfile changes, live data writes, migrations, credentials, emails, merges or deployments were performed.

## Verification

- **38/38 scoped tests, six files:** `phrenologyMaps`, `phrenologyContent`, `PhrenologyView`, `Phrenology3DView`, mock phrenology, and the existing complete appendix/source-hash suite. Run with one worker and `--no-cache` on the final code. Original quotation, image and map-hash checks pass.
- **Repository format check:** passed. Newly added report/evidence metadata formatted separately after the code checks.
- **Repository lint:** passed, zero errors and six existing warnings in unrelated files. Changed-code lint also passes with no warnings.
- **Production build:** passed using Vite's build API with a dedicated `/tmp/openbrain-g3-vite-build-cache`; existing chunk-size/CJS warnings only. The build was served on port 6103 for the final browser pass.
- **Chromium production-build QA:** 21/21 selected-artwork cases: lateral 31 plus posterior 5, 2, 4, 3, 11, 10 at 1440 × 1000, 390 × 844 and 844 × 390. Checks include actual source-path counts, each label inside its region, real pointer/touch selection, non-overlapping skull/card bounds, no horizontal overflow, deterministic picker switching and retention, unmapped Organ 22, all requested text repairs, keyboard activation/arrows/Escape/focus restoration, card scrolling and page scroll chaining. Normal motion, OS reduced motion and explicit app reduced motion also pass. No uncaught browser errors. Non-GET/HEAD requests are blocked in the main acceptance loop.
- **Visual inspection:** inspected all seven corrected selections in each viewport; the unintended wedges/double shades are absent. [Desktop selections](G3-evidence/desktop-seven-selections.jpg), [mobile selections](G3-evidence/mobile-seven-selections.jpg), [short landscape selections](G3-evidence/landscape-seven-selections.jpg), and [before/after geometry](G3-evidence/before-after-fill.jpg). Full-resolution PNGs remain in `/tmp/openbrain-g3-evidence/after`; committed contact sheets are derivatives of those QA screenshots, not modified scientific assets.

Reproduce the browser check with a running local preview:

```sh
BASE_URL=http://127.0.0.1:6103 OUT_DIR=/tmp/openbrain-g3-evidence/after node scripts/phrenology-feedback-browser.mjs
```

### Mobile visibility repair

The original mobile detail sheet hid nearly all the skull: at 390 × 844, skull bounds were y=263.7–603.0 and the card y=276.4–740.6. The coordinator accepted a scoped repair. Final mobile bounds are skull y=142.2–462.9 and card y=486.9–756.9, a 24 px separation, with the long card scrolling independently and chaining naturally to page scroll. At 844 × 390, the skull remains 198.6 × 192 px alongside the card; the old viewport subtraction could yield a negative skull size. See [all measured bounds](G3-evidence/measurements.json).

## Remaining gates and limitations

Independent review must inspect the exact final head supplied in the handoff. CI is separate from the passing local checks; no green CI claim is made here. Browser evidence covers the bundled 2D widget in Chromium, not a full authenticated History chapter acceptance pass, Firefox/Safari, or 3D camera rendering. The 3D content fallback and shared picking geometry are covered by tests. Source-map registration and original historical lettering are intentionally unchanged.

No migration is required or awaiting application. No Stuart decision remains for this group. Review, merge, deployment and subsequent live acceptance remain pending under the coordinator's control.

## Note ready for Stuart

The phrenology highlights now follow the intended regions without the extra purple patches, and choosing an organ automatically opens a view that shows it. We have also joined the requested paragraphs, removed the two editorial notes and updated Organ 22's wording; on phones, the selected skull stays visible above the text. These changes are in review and are not live yet.
