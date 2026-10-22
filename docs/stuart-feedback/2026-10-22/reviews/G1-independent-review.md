# Independent review — G1 Reader / Retina

PR: https://github.com/antonmogul/theopenbrain.org/pull/148
Reviewed head: `438090f1c5a5aa3f8d5d521d4c7fc92fe5ae6898`
Base: `3f1bcd8171632503ac5bea8c822ea67d3c889940`
Reviewer: fresh dispatched Codex reviewer, not the Astra implementation owner.
Scope: central developer brief, G1 research/report and exact diff; R01, R15, R16, R19.

## PR-ready verdict: REQUEST CHANGES

One required correction: repair the existing transition test fixture and rerun CI at the resulting head. No additional actionable runtime/scientific-preservation defects found in exercised paths. This is not approval to merge or deploy.

### [P2] Update existing Lottie mock for the new transition readiness subscription

Location: `src/widgets/figures/transitions/TransitionFigure.vue:49`; affected fixture `src/widgets/figures/__tests__/SplitTransition.test.js:6-12`.

The added unconditional `anim.addEventListener("DOMLoaded", draw)` is a real Lottie API, but the existing SplitTransition suite's fake AnimationItem does not implement it. Consequently both `TransitionFigure > plays over the middle 80% of the scroll` and `TransitionFigure > warns when its host passes no progress` fail, with two unhandled mounted-hook rejections (`TypeError: anim.addEventListener is not a function`). The new focused TransitionFigure test supplies the method, masking this adjacent regression in the implementation's selected validation matrix. This is a test-contract/CI regression, not evidence that real Lottie lacks the method: the installed library implements it in `node_modules/lottie-web/player/js/utils/BaseEvent.js:11`, and both real-browser transition checks pass.

Repro at reviewed head:

```sh
npx vitest run src/widgets/figures/__tests__/SplitTransition.test.js --maxWorkers=1 --minWorkers=1 --cache=false
```

Correction: extend the existing fake AnimationItem with event registration compatible with Lottie and retain its current initial/midpoint/reverse assertions; ideally exercise readiness delivery as well. Do not remove the readiness fix or silently optional-chain a required real API just to accommodate an incomplete mock. Rerun this file and the complete required CI suite, then request exact-head review. Coordinator independently reported the same full-suite CI failure (2438 passed, 56 skipped, 2 failed); those full-suite counts are coordinator evidence, not my local execution.

## Independent evidence

- Local 12-file targeted plus adjacent run: **76 passed / 2 failed**, with two unhandled errors from the finding above. Eight new/changed focused files passed 42 tests; four adjacent files passed 34 and failed two. Covered cover lifecycle, async unmount, scoped anatomical selection, preference updates, intro placement, references, derivative equivalence/URL precedence, trigger ownership and both transition implementations.
- `vite build --outDir /tmp/openbrain-g1-review-dist --emptyOutDir`: passed. Build log `/tmp/openbrain-g1-independent-build.log`; existing chunk-size/Pyodide warnings. Independently built index and all 110 JavaScript assets were byte-identical to the existing `dist` served for browser checks. No source/dependency changes.
- `npm run graph:check`: 0 errors, one orphan warning (`src/helper/retinabox.js`), 1015 modules / 2063 dependencies. `git diff --check 3f1bcd81...HEAD`: passed.
- Supplied port 6101 refused connections; served existing immutable dist with local Vite preview on **6111**. Re-executed checked-in browser acceptance with own evidence directory: **42 checks passed**, Chromium and Firefox. Receipts/screenshots: `/tmp/openbrain-g1-independent-browser/results.json` and sibling PNGs. These are independent executions of the owner's script, supplemented by manual diff review and an additional read-only DOM check, not an independently authored full browser harness.
- Both covers: pixel movement in normal motion; mounted explicit reduction freezes/restarts, missing cover retains poster. Dragon, eye structure, accommodation/vergence and EyeMovements paint; keyboard selection and pause stability pass; forward/reverse transition paints and reduced-motion endpoint stays static. 1440px and 390px reduced-motion artwork remains visible/static; explicit mobile override resumes it; no horizontal page overflow in tested sizes. Visually inspected the painted gaze trace screenshot.
- Additional mobile DOM receipt `/tmp/openbrain-g1-independent-browser/extra-checks.json`: one inline Dragon, original Johann Zahn caption, no legacy footnotes, exactly 106 reference items with sequential values/unique IDs `ref-1` through `ref-106`. The browser matrix also confirms Finger appears once and Webvision survives. Additional literal `a[href^="#ref-"]` search found zero anchors, so it does not establish in-text citation activation; citation interaction remains a coverage limit.

## Preservation, security and integration assessment

- Original EyeMovements asset is unchanged in exact diff. Source hash `8d62798bdfeb71400d178bd2d6afb41c9ba914340f4436f3ac5b3cd2e0a6f242` is checked against derivative provenance. Restoring the single trim-start property and removing provenance makes derivative deeply equal to original, including bitmap, coordinates, timing and effects. Each start keyframe uses the authored end keyframe/easing with endpoint values reduced by 0.4; constant translation commutes with its interpolation. No CSP relaxation. Custom author URLs retain precedence.
- Shared legacy lifecycle now guards late library completion, clears delayed playback, destroys owned instances and removes retained highlight listeners. State buttons are keyboard-operable; loop transport has accessible labels and 44px sizing. Real browser tests establish visible still artwork under OS reduction and live explicit overrides, not only SVG existence.
- No migrations, data mutations, scientific source edits, sandbox/audio-host changes or credentials appear in this PR. No migration/application step is required. G5 audio/security still needs its own review; this review is not narration playback acceptance.
- Inspected G2 branch `antonmogul/Figures-media-followups` at `48de7227a1a8b40d0ed8e2df810addb9f902ed90`: IllustrationComp overlap is its YouTube template replacement and VideoEmbed import, distinct from G1 lifecycle logic. Integration must preserve G1 art ref, lifecycle, transport and G2 media rendering together, followed by combined regression/browser checks. Did not apply or test a synthetic merge.

## Remaining requirements and limits

1. Astra fixes the stale existing mock, complete CI becomes green, independent review confirms the new exact SHA.
2. Integration verification with sibling PRs, particularly G2's shared IllustrationComp surface.
3. Explicitly authorized merge/deployment and production acceptance remain separate; no merge/deploy/DB/email actions were performed here.

No full-suite local run, Storybook build, physical phone test, authenticated admin/provider test, screen-reader audit or production deployment acceptance. Browser reads used published live data with all non-GET/HEAD/OPTIONS requests blocked. Current source worktree remained clean. Historical memory was used only to reinforce source/runtime and production-acceptance boundaries; all implementation conclusions above were checked in this run.
