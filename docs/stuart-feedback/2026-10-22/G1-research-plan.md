# G1 — reader and Retina research / implementation plan

Scope: R01, R15, R16, R19. Baseline: main `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR #143), verified against origin/main on 22 October 2026. Read-only comparisons: original `https://theopenbrain.org/chapter`, demo `https://theopenbrainorg-production.up.railway.app`, local main on port 6101. No database writes or deployment.

## Findings before implementation

- R01: both production and main report a ready cover and change actual eye pixels in Chromium; Firefox also changes the rendered eye transforms. The two chapters share the original-derived Matisse asset. Normal-motion cover failure is not reproduced. The component snapshots reduced motion once, so changing the preference after mount cannot restart a frozen cover (or stop a moving one).
- R15 / R16: original and main render the original Dragon, eye structure, accommodation/vergence and eye-movement assets. Main already contains PR #143 trigger ownership and transition repairs; do not duplicate them. The legacy IllustrationComp returns before loading artwork under OS reduced motion, leaving blank stages and live state controls, and ignores the explicit reader override. Its async load and delayed playback can also outlive unmount. Verify these branches in both engines, including mobile.
- R19: reproduced in production and main: the Finger reference appears twice. TextComp appends structured references while independently rendering the legacy footNotes bibliography. Further reading is a separate legitimate block and must remain.
- A successful SVG mount alone is insufficient: inspect screenshots, painted eye movement, selected anatomical highlights and time-varying eye diagrams. Keep the original scientific assets unchanged.

## Implementation

1. Observe the established explicit reader motion attribute with OS fallback; update the cover when the preference changes and retain the poster on load failure.
2. Render original legacy artwork even under reduced motion, parked on a useful frame; keep deliberate state selection and play/pause accessible. Own async load, timers and listeners through teardown; scope highlight selection to each mounted figure.
3. Use one complete Retina bibliography, merging missing legacy entries by citation number and preserving non-bibliography notes and Further reading. No content migration is needed for a rendering-only duplicate.
4. Add focused lifecycle, preference and reference regression tests. Capture Chromium and Firefox desktop/mobile, reduced-motion and forward/reverse trigger evidence against the real reader using read-only requests. Run scoped tests, formatting/lint and production build.
5. Commit/push a focused PR against main and request independent exact-head review through the coordinator. Record deployment status separately; no merge or deployment.

Shared ownership: G1 owns IllustrationComp lifecycle changes; G2 owns its video/template presentation. Coordinate any additional shared surface before editing. Existing tokens, IBM Plex and square controls remain. No reserved discussion decisions are in G1 scope.

## Findings from painted-output and mobile acceptance

- R16 has a separate **normal-motion** defect: `animationEyeMovements.json` includes one After Effects expression (`trim start = trim end - 0.4`). The animation clock advances, but the gaze trace does not paint. A read-only reproduction recorded `securitypolicyviolation: script-src / eval`. Bake that exact expression into a presentation derivative using the end property's existing keyframes and easing; preserve the original asset, bitmap, coordinates and timing, and test equivalence and provenance. This follows [Lottie's expression-baking guidance](https://github.com/airbnb/lottie-web/wiki/Expressions); no CSP exception is appropriate.
- R15 also has a separate **mobile** placement defect: TextComp draws paragraph-level intro figures inline but never the section-level Dragon. Add that missing inline placement only, retaining its existing caption policy and the desktop trigger.
- Eye transition loading needs a ready callback to apply the latest scroll position when asynchronous artwork arrives; observe reduced motion here too. [Lottie's AnimationItem source](https://github.com/airbnb/lottie-web/blob/master/player/js/animation/AnimationItem.js) establishes the `DOMLoaded`/load lifecycle.
