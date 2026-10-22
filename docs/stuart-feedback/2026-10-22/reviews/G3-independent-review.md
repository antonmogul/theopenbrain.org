# G3 independent review — PR 144

PR: https://github.com/antonmogul/theopenbrain.org/pull/144
Reviewed exact head: `fa232f4cb02f0281eb69fea8403c1a64f4195e4b`
Base: `3f1bcd8171632503ac5bea8c822ea67d3c889940` (`origin/main`, PR base).
Independent reviewer: dispatched Codex session a32ea2b2-84f6-41af-b0c2-74e24ef0fd68, separate from Astra implementation owner.

**PR-ready verdict: REQUEST CHANGES.** Two P2 accessibility/responsive regressions require correction and re-review at a new exact head. No source edits, merges, deployment or database writes were made.

## Findings

### P2 — Restore picker focus after automatic view changes

Location: `src/views/PhrenologyView.vue:320` (new disabled binding); related `selectFromPicker` at lines 257–266.

Selecting an organ that requires another view disables the currently focused native select. Chromium moves focus to BODY; reenabling the select does not restore it. The new asynchronous path subsequently stores BODY as `previousRegionElement`, and Escape no longer reaches the widget-scoped keydown handler. Keyboard users lose their place and the documented dismissal behavior immediately after this common selection path.

Independent production-build reproduction (normal motion): open `/phrenology` in the initial anterior view, focus Browse an organ, choose Organ 12, wait for the lateral map and card, then press Escape without refocusing. Observed `document.activeElement.tagName === 'BODY'`, select enabled, and `.card` count remains 1 after Escape. This also affects focus on newly disabled tabs. Preserve the initiating control and restore it once the transition completes, or use a lock that retains keyboard focus; add a browser regression that does not refocus before Escape.

The supplied browser suite misses this because it explicitly calls `select.focus()` before Escape. Unit tests mock GSAP and cannot establish actual native-control focus behavior.

### P2 — Fit the mobile detail card inside the fixed-height embedded widget

Location: `src/views/PhrenologyView.vue:714–716` (new in-flow card sizing); related new grid rows at lines 699–704.

The new mobile skull-plus-card rows exceed the height the actual chapter host gives the widget. The root retains `overflow:hidden`; the card uses a viewport-based maximum rather than shrinking to its allocated grid row, so its lower lines cannot be reached even by scrolling the card to its end. The standalone route can grow and therefore does not expose this defect.

Reproduction with the real `FullBleed` + `WidgetBreakout` Storybook fixture from this exact head: viewport 390×844; load `/iframe.html?id=chapter-text-widgetbreakout--full-screen-band&viewMode=story`, choose Organ 12, then set/scroll `.card.scrollTop` to its maximum. Measured widget y242.39–934.00, card y729.25–999.33, final paragraph y848.56–967.39, card scrollTop303=maxScroll303. The last ~33px of the final paragraph remains below the widget's clipping edge; additional page scrolling moves the clip and text together and cannot reveal it. The footer is clipped too. Size the grid/card from the host's available height (including heading/citation) or let the embedded host grow/scroll deliberately, and verify that the last line is visible at maximum card scroll.

Evidence: `/tmp/openbrain-G3-independent-evidence/embedded-390.png` and `embedded.json`. The story's desktop-shaped prose wrapper has separate mobile horizontal-position limitations; the finding concerns vertical clipping by the actual widget root, with its actual fixed-height FullBleed host. This is component integration evidence, not authenticated live-reader acceptance.

## Evidence and positive checks

- Independently read the coordinator brief, G3 plan/report, exact diff against main, helper/view implementations and adjacent host components. Coordinator confirmed exact head; GitHub reported the same head/base and OPEN state.
- Re-ran all six scoped files: **38 tests passed**, including source appendix/hash coverage, both view suites, map extraction/picking and requested presentation joins/notes.
- Changed-file ESLint and `git diff --check` passed.
- Independently built production to `/tmp/openbrain-G3-review-dist` with a separate Vite cache; build passed (existing CJS/chunk-size warnings). Served isolated build on loopback6113.
- Re-ran browser acceptance on that build: **21 selected-artwork cases passed** (seven requested selections × desktop/mobile/short landscape), including source-path counts, anchor-in-fill checks, pointer/touch, deterministic switching/retention, unmapped22, requested content, keyboard checks as authored, scrolling, normal/OS/app reduced motion, and no uncaught errors.
- Visually inspected the seven-selection desktop evidence sheet and independently generated mobile posterior4 screenshot; intended bilateral regions remain paired and no extra purple wedges appear.
- Additional independent all-map scan: front27/27, side31/31, back18/18 named regions retained; zero named regions lost and zero implicitly inherited filled paths in the current authoritative SVGs. Explicit-fill filtering is sound for these actual source files; no general-purpose SVG parser claim is warranted.
- Original map/scan directory, appendix JSON and label-anchor JSON compare unchanged against base. Presentation joins preserve wording and all source block IDs; Organ22 remains unmapped and its exact requested note displays. No SQL/migration/dependency or sandbox/audio changes are present.
- Built Storybook independently to `/tmp/openbrain-G3-review-storybook` and exercised real FullScreenBand integration at1440×1000,390×844,844×390. Desktop artwork and card remain separated; mobile clipping described above requires correction.
- Source worktree remained clean throughout review. No direct overlap with G1/G2/G4/G5/G6 shared implementation surfaces in this diff; G3 owns its two views/helpers. Integrating shared host/layout changes from sibling work still requires combined acceptance.

## Limits and remaining requirements

- GitHub CI and History fixture browser jobs were still IN_PROGRESS at final query; local passing checks do not establish green CI.
- No authenticated History chapter, live deployment, Firefox/Safari or hardware/3D camera rendering acceptance was performed. Three-dimensional fallback content is unit-tested; shared picking markup is tested, but this is not a visual 3D signoff.
- Attempted the broader History Full Reader Storybook story; `.phreno` did not mount within20seconds. That attempt supplies no full-reader acceptance evidence. The narrower real WidgetBreakout story mounted and produced the integration evidence above.
- Correct both P2 findings through the original implementation owner, add meaningful real-browser assertions for focus retention and final-card-line visibility inside the host, and re-review the new exact SHA. Then require green CI and coordinator-owned merge/deployment/live acceptance gates. No migration is needed.
