# PR149 exact-head independent CI repair review

Verdict: **APPROVE focused source/integration review; no blocking findings (P0–P3).** Merge remains coordinator-owned and conditional on green required CI for this exact head.

Reviewed SHA: `ef38c9d15704b3c494fa14c18bcb49bb1e87d538` in existing Figures-media-followups. Previously approved SHA: `48de7227a1a8b40d0ed8e2df810addb9f902ed90`; original baseline: `3f1bcd8171632503ac5bea8c822ea67d3c889940`; integrated main: `e35c5ae25925d36f53884de7f0b82957fa26a6e5`. Read both G2-report.md and /tmp/openbrain-pr149-fix/G2-ci-repair-report.md. Review is independent and read-only with respect to repository source; all new harness/build/report artifacts are under /tmp.

## Findings and source preservation

No actionable severity/file:line defect to report. Relevant inspected evidence:

- `src/components/chapter/Illus/__stories__/g2MediaFixtures.js:3-8,28,47`: repair adds one self-contained, URI-encoded SVG poster and replaces only two remote poster `src` values. SVG has no external references or executable content; native Chromium decode confirms 480×360. Original providers, IDs, authored captions, alt text, gallery order, artwork paths and SQL are unchanged from approved source. Fixture is imported only by IllustrationPlaceholder.stories.js.
- `g2MediaFixtures.js:30-32,49-57`: squid ID `ZSCUbYyrHug`, Huxley ID `KbA3RLz3xUQ`, Physiological Society and Alan Macfarlane credits, and Eccles second item are preserved. All five selected captions were asserted as exact text in the actual rendered stories.
- `src/components/chapter/Illus/IllustrationComp.vue:160-171,234`: against integrated main the entire remaining diff is the G2 VideoEmbed template replacement plus its import. This establishes that G1 lifecycle/source changes survived verbatim, including reduced-motion parking, disposed guards around async loading/readiness, scoped highlight listeners and teardown at lines 360-460. Merge `1fb4759a17b3b6b047a46f0bfc4f29f1946fb364` has the exact approved source and integrated main as its two parents; repair HEAD has that merge as its sole parent.
- `src/components/chapter/text/VideoEmbed.vue:17-26,46-59`: deliberate activation gate and provider URL generation remain unchanged from approved G2 source. FigureImages, IllustrationPlaceholder, BreakImages, BreakView, figureCycle and migration also have no delta from approved G2 source.
- `scripts/storybook-all-smoke.mjs:39-48,87-89`: external-request recording/failure guard is unchanged. Security policy, workflow files, Storybook main/preview configuration and network guard have no G2 changes against integrated main; no production URL or security relaxation was introduced by this repair. Approved history-fixture selector changes remain as previously reviewed.

## Independent bounded validation

1. Built the actual `IllustrationPlaceholder.stories.js` module afresh with the checked-out exact-head source, original Storybook configuration/preview/mocks and Vue plugin, using isolated `/tmp/openbrain-pr149-independent` outputs and caches. Focused story-module build passed. An initial temporary harness attempt omitted manager dependency figma.js and failed to resolve it; copying that original config dependency corrected the harness only. No repository configuration or shared dependency writes.
2. Chromium at 1280×800, private local port 6159: mounted `GalvaniSlideLegends` and `HuxleyFirst`, selected every thumbnail, checked exact caption/index, decoded all rendered images and confirmed zero external requests and zero iframes before deliberate Play. The new poster decoded to 480×360 in both stories. No page errors or failed local requests. Screenshots inspected after gallery transitions completed.
3. Deliberate Play produced exactly one attempted provider request per story: `https://www.youtube-nocookie.com/embed/ZSCUbYyrHug?autoplay=1&rel=0` and `https://www.youtube-nocookie.com/embed/KbA3RLz3xUQ?autoplay=1&rel=0`. External requests were intercepted and aborted: this proves correct deliberate provider activation, not provider playback availability.
4. Focused existing tests: **12 passed in four files**: IllustrationComp.lifecycle (4), IllustrationComp.caption (3), IllustrationPlaceholder.gallery (1), VideoEmbed (4). These exercise merged lifecycle teardown/late callbacks, reduced motion, scoped state, captions/gallery and deliberate player behavior. `git diff --check` passed; source checkout remained clean at the reviewed SHA.

Reproduce focused tests:

```sh
node_modules/.bin/vitest run --no-cache --maxWorkers=2 --minWorkers=1 src/components/chapter/Illus/__tests__/IllustrationComp.lifecycle.test.js src/components/chapter/Illus/__tests__/IllustrationComp.caption.test.js src/components/chapter/Illus/__tests__/IllustrationPlaceholder.gallery.test.js src/components/chapter/text/__tests__/VideoEmbed.test.js
```

Durable local evidence: `/tmp/openbrain-pr149-independent/browser.mjs`, `browser-results.json`, `browser.log`, `unit.log`, `build.log`, `config/main.mjs`, `galvani-slide-legends.png`, `huxley-first.png`. Browser reproduction: serve the generated storybook-static at 127.0.0.1:6159 and run `node /tmp/openbrain-pr149-independent/browser.mjs`. Private server stopped after review.

## CI and acceptance limits

No full local catalog rerun was performed or claimed. Earlier owner's relocated harness had unrelated duplicate mock-module failures, and the corrected full rerun was intentionally stopped; that does not constitute a full catalog pass. This review deliberately bounded testing to changed fixture and merged lifecycle concerns.

Hosted canonical runs both identify this exact SHA: quality run https://github.com/antonmogul/theopenbrain.org/actions/runs/39934327282 and History fixture run https://github.com/antonmogul/theopenbrain.org/actions/runs/39934327264. At initial live inspection both were in progress; quality had passed formatting, lint, graph, units, production build, component coverage and Storybook build, while full catalog smoke was running. Final live refresh independently confirmed canonical full Storybook smoke, design-system snapshots and snapshot upload succeeded; quality production smoke was still in progress. History fixture run 39934327264 completed successfully at this exact SHA. Final quality whole-run green status remains a separate coordinator gate, not inferred from local validation.

No source edits, commits, merge, deployment, database writes or external messages outside authorized Orca reporting. Deployment, migration application, authenticated production behavior and actual third-party playback remain outside this focused approval.
