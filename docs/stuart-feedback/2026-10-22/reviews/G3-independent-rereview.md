# G3 independent re-review — PR 144

Reviewed exact head: `aa6d1e350426a1545220e1e37655c1c41c25e795`.
Previously reviewed head: `fa232f4cb02f0281eb69fea8403c1a64f4195e4b`.
Base: `3f1bcd8171632503ac5bea8c822ea67d3c889940`.
Independent reviewer: dispatched Codex session `c017272f-c033-4e18-b25b-2d3ba2525426`.

**Code-review verdict: APPROVE. Both previously reported P2 findings are resolved. No new actionable findings in the corrected delta.** This is exact-head source/component approval, not green-CI, deployment or authenticated reader acceptance. The worktree remained clean and the exact head remained unchanged.

## Finding dispositions and reproductions

### Resolved P2 — Native picker/tab focus and Escape

Relevant corrected code: `src/views/PhrenologyView.vue:197`, `:256–264`; downstream selection/dismissal: `:283–309`.

The initiating native select or tab is captured before disabling. After the incoming GSAP timeline and Vue's reenable render, focus returns only if the initiator remains connected, the component is alive and activeElement is BODY. If the reader moves focus to another element, the completion path respects it. The picker then opens its panel with the correct previous focus target, so widget-scoped Escape reaches the handler and dismisses without an intervening focus repair.

Independent Chromium reproduction on an independently built production app and two independently built Storybook fixtures: focus Browse an organ once, choose Organ 12 from anterior, wait for lateral/card, then press Escape without calling focus again. The picker retains/restores focus and the card closes. Keyboard Enter on the anterior tab after the switch restores the tab. Normal-motion cases also move focus to a stable external sentinel during the transition and assert it remains there. Additional independently authored checks covered both picker- and tab-initiated transitions with an external focus move queued immediately after activation under normal and OS reduced motion: all four passed, with the control enabled and sentinel still active at completion.

The new browser test at `scripts/phrenology-host-browser.mjs:79–123` addresses the actual failure instead of concealing it by refocusing before Escape. Happy-DOM/GSAP unit mocks alone would not establish native focus behavior.

### Resolved P2 — Final paragraph/citation clipped by the actual fixed-height host

Relevant corrected code: `src/views/PhrenologyView.vue:478–487`, `:534–536`, `:705–706`, `:714–741`.

The card is constrained to its allocated grid track, while header/citation resist flex shrinking. The widget root allows local overflow scrolling when the real FullBleed/WidgetBreakout host is too short. This makes previously clipped content reachable without changing shared host components or scientific assets.

Independent reproduction: use original `chapter-text-widgetbreakout--full-screen-band` and the new `views-widgets-phrenologyview--embedded-responsive` story, select Organ 12, scroll the card to its maximum, bring the last paragraph into view through actual scrollable ancestors, reapply maximum card scroll, and measure its final rendered text line against every vertical clipping ancestor and the viewport. Separately scroll the citation into view and check its full vertical bounds. These checks passed at 1440×1000, 390×844, 320×568 and 844×390 with normal, OS reduced and explicit app reduced motion, in both hosts and the standalone route: **36/36 cases**. No script injects host dimensions or repairs focus.

Normal-motion measurements (pixels; visible interval includes card, ancestors and viewport):

| Host / viewport | Card height | Final line top–bottom | Visible vertical interval | Complete citation vertically reachable |
| --- | ---: | ---: | ---: | --- |
| Original FullScreenBand / 390×844 | 200.03 | 580.95–599.95 | 434.58–634.61 | Yes |
| Original FullScreenBand / 320×568 | 144 | 424.31–443.31 | 334.34–478 | Yes |
| Original FullScreenBand / 844×390 | 192 | 238.47–257.47 | 104.09–296.09 | Yes |
| Responsive real host / 390×844 | 200.03 | 590.95–609.95 | 444.58–644.61 | Yes |
| Responsive real host / 320×568 | 144 | 434.31–453.31 | 344.34–488 | Yes |
| Responsive real host / 844×390 | 192 | 248.47–267.47 | 114.09–306.09 | Yes |

The responsive host also proves full horizontal final-line visibility: x40–158.45 at320, x40–229.53 at390, and x477.89–667.42 in short landscape. I visually inspected independently generated responsive320/390/landscape screenshots. At320/landscape the root intentionally scrolls to expose the citation; it need not be simultaneously visible with all other content.

**Fixture limit retained explicitly:** the original desktop-shaped FullScreenBand story still offsets its entire mobile band horizontally, as noted in the previous independent review. Its final-line left edge is −84.5 at320 and −49.5 at390. Thus the original-story pass proves the vertical clipping repair and vertical citation reachability only; it does not prove complete horizontal readability of that fixture. The new responsive wrapper uses the same actual shared FullBleed/WidgetBreakout fixed-height host and supplies the full-width mobile proof. Neither fixture establishes authenticated full-reader acceptance.

## Independent checks and evidence

- Read the prior independent review, updated G3 report, entire corrected source/test/story delta and adjacent selection/dismissal/host code. The new unit assertion merely relaxes a brittle exact CSS-string match; real-browser geometry assertions carry the layout proof.
- Production build passed into `/tmp/openbrain-g3-rereview-dist`, with dedicated `/tmp/openbrain-g3-rereview-cache`; log `/tmp/openbrain-g3-rereview-build.log`.
- Independent Storybook build passed into `/tmp/openbrain-g3-rereview-storybook`; log `/tmp/openbrain-g3-rereview-storybook.log`.
- Six scoped unit files passed **38/38 tests**, including both views, source appendix/hash fidelity, maps, presentation content and mock records; log `/tmp/openbrain-g3-rereview-unit.log`. Full repository suite was not rerun for this bounded re-review.
- Changed-file ESLint and `git diff --check` passed without source edits.
- Artwork browser acceptance rerun on the independent production build passed **21/21 cases**; log `/tmp/openbrain-g3-rereview-artwork.log`, evidence `/tmp/openbrain-g3-rereview-evidence/artwork/`.
- Host matrix: `/tmp/openbrain-g3-rereview-browser.log`, measurements `/tmp/openbrain-g3-rereview-evidence/host-regression.json`, screenshots in the same directory. A temporary copy of the committed script at `/tmp/openbrain-g3-independent-host-browser.mjs` adds320×568. Its initial320 run encountered an unrelated strict150px artwork assertion because Chromium reports the150px artwork as149.984375px. The completed run retained all focus/text/citation assertions; a separate postcondition verified all36 artwork sizes are at least149.9px (minimum149.984375). This is a subpixel tolerance observation, not an unresolved content-clipping defect.
- Additional independent moved-focus evidence: `/tmp/openbrain-g3-rereview-focus-independent.json` (four cases).
- Browser requests were restricted to GET/HEAD, with no uncaught browser errors in the matrix.
- `public/publicAssets`, canonical appendix and label-anchor JSON, both shared host components and package/lockfiles compare unchanged against base. The helpers and 3D implementation are unchanged from the previously reviewed head. No artwork, source records or repository files were edited.

## Gates and limits

GitHub read-only verification after the browser checks confirmed the exact requested head/base and OPEN PR. Both `Lint, test, build` and `History fixture Chromium assertions and screenshots` remained **IN_PROGRESS**; snapshot `/tmp/openbrain-g3-rereview-ci.json`. Require green CI before the coordinator's merge decision.

This review does not establish deployment SHA, authenticated History chapter behavior, combined integration with sibling groups, Firefox/Safari behavior, physical-device acceptance or visual 3D camera rendering. The original full-reader story was not reattempted; the bounded repair checks used the actual real-host fixtures described above. No merge, deployment, database mutation, credential change, email or external posting was performed. No migration is required for these changes. Merge/deployment and subsequent authenticated live acceptance remain separate coordinator-owned gates.
