# G5 research and implementation plan

Scope: R12a–c, Loewi layout and authored-widget narration. Baseline: current
`origin/main` = `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR #143).

## Research before implementation

- PR #143 already provides authored-widget fitting; do not repeat its work.
  The supplied production baseline is PR #140, so deployment and code fixes
  remain separate. Live demo HTML still serves the same restrictive media CSP.
- Real Chromium, HTTP-served parent policy copied from `index.html`, untouched
  `buildWidgetDoc`, and `sandbox="allow-scripts"`: a real Play click on Loewi
  and narration click on Retina center-surround both produce `media-src`
  violations for `data` and media error 4, readyState 0.
- In the same harness, adding **only** `data:` to parent `media-src` produces
  readyState 4 and advancing MP3 time (Loewi 2.13 s; Retina 2.94 s).
  The authored files use `new Audio(dataURI)`, not fetch or AudioContext.
  The iframe's permissive media policy cannot override its inherited parent
  policy. No autoplay delegation, same-origin sandbox permission, audio bridge,
  network permission or new narration implementation is needed.
- R12b reproduces at 700 × 600: the longest explanation visibly extends behind
  Play/Restart because a flex column shrinks the caption below its text height.
- R12a: desktop timeline labels are absolutely positioned by time, so
  “Collecting the fluids” collides with the adjacent “Figure 1” label. Remove
  only the redundant timeline button; retain the Figure 1 SVG label and all
  timeline data, which the recording cursor also uses. Preserve source scan,
  title, scientific narration, timing, coordinates and credit.
- Original Retina reference `https://theopenbrain.org/chapter` is the 2023
  prototype (HTTP last-modified 29 December 2023); at 700 px it presents a
  desktop-only notice requiring at least 1320 px. Continue reference review
  at desktop width. The current demo is a distinct deployment.

## Implementation and evidence plan

1. Add `data:` only to the parent media CSP with an explanatory comment and
   regression coverage; leave script/connect/frame policies and sandbox intact.
2. Make Loewi caption/transport/step rows non-shrinking, retain a usable drawing
   minimum, and use natural frame scrolling at constrained heights. Keep source
   credit available. Remove the redundant timeline label only.
3. Add a uniquely named migration guarded by the exact previous upload hash;
   reruns do nothing and unknown edited uploads fail closed. Execute it in an
   isolated PGlite fixture, never live Supabase. Preserve historical migrations.
4. Add a repeatable HTTP browser regression harness using the real app CSP,
   widget host and authored uploads; test actual user gestures, decoded audio
   output, all Loewi captions, controls, desktop/mobile and reduced motion.
   Test Firefox if available; disclose unavailable engines explicitly.
5. Run scoped tests, formatting, lint and production build. Commit and push a
   focused PR for independent review; no merge, deploy or live data writes.

Primary references: [CSP3](https://www.w3.org/TR/CSP3/),
[MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP),
[autoplay policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/autoplay),
[connect-src](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src).
