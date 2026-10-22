# G6 independent review — request changes

PR: https://github.com/antonmogul/theopenbrain.org/pull/147
Exact reviewed head: `d3fcf1295a6c6e5575bbc1045af9caffb9bf44c6`
Base: `3f1bcd8171632503ac5bea8c822ea67d3c889940` (main).
Reviewer: fresh dispatched Codex reviewer, not implementation owner; task `task_4109d02c7e37`, dispatch `ctx_87280b52dcb9`.

## PR-ready findings

### P1 — Move shared History fixtures out of the views layer to restore required CI

Locations: `src/components/chapter/text/__stories__/breakoutReviewFixtures.js:2` and `src/components/chapter/text/__stories__/BreakoutRail.stories.js:4`.

Both new component-side story modules import `@/views/__stories__/historyFullReaderData.json`. The existing `components-not-from-views` architecture rule treats these as errors, including story modules, so the required CI job fails before it can establish a green PR. Independently reproduced with `npm run graph:check`: exit 1, two `components-not-from-views` errors; the unrelated existing `retinabox.js` orphan is only a warning. GitHub CI run 39833537175 independently records the same failed required job.

Move the unchanged canonical History fixture to an appropriate shared fixture location and update its consumers, or adopt an equally narrow solution consistent with the existing dependency policy. Preserve the source fixture content and avoid weakening the application layering rule merely to make this pass. Re-run graph:check and CI at the replacement SHA.

### P2 — Preserve the consecutive-widget spacing contract when replacing paragraph wrappers

Location: `src/components/chapter/text/SectionComp.vue:98` (the `span` → `div` change applies to every paragraph, including ordinary non-box sections).

`src/index.css:1072-1087` removes the touching margins between consecutive inline-widget bands through selectors limited to `:is(span, .subSub)` wrappers. `WidgetBreakout.vue:345` supplies `margin: 2.5rem 0` by default. After this change the reader emits `div > aside.wb--inline` for section widget paragraphs, so neither sibling-wrapper selector matches and an unwanted light gap returns between what should be a continuous widget run. This affects content beyond the two Explore pairs.

Reproduction: render two adjacent `{type:'widget', widget:{kind:'inline', ...}}` paragraphs in a normal SectionComp section with the real reader CSS. The new wrapper structure has 40px touching margins and a 40px collapsed visual gap; the previous span structure has 0px touching margins and no gap. A controlled Chromium CSS reproduction using the exact old/new wrapper structure and WidgetBreakout's existing default margin produced those values; artifact `/tmp/openbrain-G6-independent-seam.json`, runnable reproduction `/tmp/openbrain-G6-independent-seam.mjs`. The supplied current History chapter had no adjacent inline-widget run, so this is a targeted supported-content regression reproduction rather than a claim about its current published rows.

Keep the existing wrapper for unaffected paragraphs, or update the adjacency selectors to a deliberate shared wrapper class/structure covering SectionComp, TextComp and SubSection. Add a focused rendered CSS/browser check for consecutive section widgets, not only Explore-card tests.

## Independently verified evidence

- Read the coordinator brief plus G6 research-plan/report and all 27 changed paths against the exact base/head. Working tree remained clean; no source edits, migrations, database writes, credentials, external posts, merge or deployment.
- Scoped Vitest: 5 files, 18/18 tests passed, including Explore pairing boundaries, independent disclosures, SectionComp regressions, rail navigation and chapter inventory. Command: `node_modules/.bin/vitest run --no-cache src/helper/__tests__/explorePairs.test.js src/components/chapter/text/__tests__/ExploreCard.test.js src/components/chapter/text/__tests__/SectionComp.reader-section.test.js src/components/chapter/text/__tests__/BreakoutRail.test.js src/components/chapter/__tests__/storybookCoverage.test.js`.
- Fresh exact-source scoped static Storybook build passed to `/tmp/openbrain-G6-independent-static`, using the provided isolated three-story config. Production `npm run build` independently passed; existing chunk warnings remain. Logs: `/tmp/openbrain-G6-independent-build.log`, `/tmp/openbrain-G6-independent-app-build.log`.
- Re-ran the committed browser acceptance script against the freshly built Storybook: Chromium 11/11 and Firefox 11/11 passed. Covers both pairs at 1440/1024/390, image loading/containment, independent keyboard/touch activation, no page overflow, rail buttons/keys, explicit motion preference precedence, panel preservation across height/portrait/landscape changes, native vertical wheel scrolling and vertical fallback, and mouse/Enter/touch activation of explicit source links. JSON/screenshots: `/tmp/openbrain-G6-independent-chromium/` and `/tmp/openbrain-G6-independent-firefox/`.
- Additional independent production-build reader check at local port 6107, using current published content fetched read-only: both actual boxes at 1440 and 390, desktop same-row pairing/mobile stacking, opening both disclosures without closing the other, retained paragraph IDs/text, loaded panel images, no document overflow, and no rail/reference-review markup in the reader. All non-GET/HEAD requests were blocked; none occurred. Four cases passed. Evidence and runnable script: `/tmp/openbrain-G6-independent-extra.json`, `/tmp/openbrain-G6-independent-extra.mjs`; screenshots `/tmp/openbrain-G6-independent-reader-{1440,390}.png`.
- Source destinations independently opened successfully and match their explicitly labelled subjects: https://plato.stanford.edu/entries/alcmaeon/ , https://plato.stanford.edu/entries/descartes/ , https://plato.stanford.edu/entries/dualism/ . Browser interaction tests deliberately stub the destination responses and prove activation rather than third-party rendering. No regex linking or hover metadata rewrites were introduced.
- Static imports confirm BreakoutRail is referenced only by its story/test; reference-link proposal CSS and prose are imported only by their review story. No reader route opts into either proposal. R18 remains a documented decision, not a changed default.
- Scientific text, source scans, artwork, coordinates, source hashes, transcripts, credits, chapter data and SQL migrations are unchanged by this diff. The pairing helper derives a Set of adjacent Explore paragraph IDs without rewriting data. Existing card state stays local and labels/aria-controls remain tied to the original paragraph IDs. No sandbox, CSP, iframe permissions or audio host code changed.
- Storybook inventory check independently passed 285/285 Vue files; chapter inventory test passed 67 components. `git diff --check` passed. `npm run lint:ci` passed with 0 errors / 6 existing warnings; log `/tmp/openbrain-G6-independent-lint.log`.

## Integration, acceptance limits and remaining requirements

1. **Request changes at this SHA:** fix both findings through the original implementation owner, then independently review the exact replacement head and require green CI. As checked during this review, GitHub `Lint, test, build` is FAILURE and the History browser workflow remains IN_PROGRESS; local scoped success does not supersede CI.
2. No new migration is introduced or needs idempotence review. The existing `20261021010000_history_breakout_boxes.sql` remains a prerequisite for authored Explore metadata in an environment that lacks it; no migration was applied here.
3. No overlapping files with currently open sibling PRs #144 (phrenology), #145 (Penfield), #146 (Loewi/audio), based on live PR file inventories. G1/G2 implementation heads were not supplied/available as open PRs at that checkpoint, so combined integration acceptance remains outstanding. SectionComp wrapper changes particularly warrant G1/G2 widget/figure integration checks; G6's own report says G2 leaves SectionComp unchanged.
4. No full repository suite, full Storybook catalog smoke, Safari, screen-reader assistive technology or physical touch device pass was performed independently. Touch evidence uses Playwright emulation. Full-page screenshot-induced rail re-snapping remains an accurately disclosed tooling limitation; ordinary viewport and resize checks pass both engines.
5. Visual acceptance limit: the mobile production-reader capture shows the existing full-width inline figure shell can extend beyond/clamp inside an Explore panel (its viewport-wide bleed styling meets the card's overflow clipping). The relevant figure-shell bleed and card overflow rules are already in the base; mobile panel padding is unchanged. This is not classified as a newly introduced G6 defect, but DOM/image-load assertions alone should not be described as proof of completely visible expanded scientific artwork. Have the figure/media owner verify that inherited visual issue during integrated acceptance.
6. No deployment identity or production acceptance is established by a local production build reading published data. Merge/deploy/database acceptance and Stuart's final link/format decisions remain separate gates.

## Plain-English outcome

The requested desktop/mobile Explore pairing works in the reviewed local builds, and the reference-link and sideways-reading proposals stay opt-in. Two changes are required before approval: restore the architecture check and preserve continuous spacing for adjacent inline widgets. The PR remains unmerged and undeployed.
