# History hero: the skull cutaway — implementation spec

**Status:** blocked on assets. Not built.
**Figma:** `Yv7WvZSoabK2t5fNtsChvf` — hero `2730:6787`, working board `2730:9185`.

## There is no animation in the Figma file

`get_motion_context` on both the hero and the Matisse board returns
`{"nodes": []}` — no keyframes, no Smart Animate, no prototype transitions.

What exists is two stacked raster fills plus a hand-drawn storyboard:

```
Opener hero (2730:6787)
├── Cover image                     1440×900
├── hist_header_sketch 1            1501×970   visible — the line drawing
└── Foundations_ST7_NM3_LL_h04 1     997×762   HIDDEN — the brain reveal
```

The four "Sketches" frames on `2730:9185` are a storyboard of intent, not a
timeline. `Screen Recording 2026-10-13 at 5.51.28 PM 1` (`2730:9215`) is a
video still: the designer prototyped the motion elsewhere and recorded it.
**That recording is the real motion spec and has not been reviewed.**

The writing/pen is NOT animated: the girl, pen and scribble are one flat
raster. A draw-on effect would be new work needing an SVG path or a Lottie.

## No Lottie needed

The reveal is a mask slide over two stacked images, driven by the pointer —
that is `clip-path`, not keyframe animation. Lottie would carry no keyframes
and cost a JSON payload for nothing. Reconsider only if the brief grows to
real illustrated motion (pen drawing itself, ink bleed, hair movement).

## Reuse ReactiveCover

`src/components/chapter/opener/ReactiveCover.vue` already solves the hard
parts: pointer→0..1 mapping with no easing on input, horizontal touch drag
(`touch-action: pan-y`), an idle behaviour, the reduced-motion resting state,
and `lottieAssetOk` so a missing asset degrades to the still cover silently.
The maths is already pure and tested in `src/helper/reactiveCover.js`
(`pointerPosition`, `ease`, `idlePosition`, `frameFor`).

Today the 0..1 position picks a **Lottie frame**. For History it should drive
a **clip-path percentage** instead. Same input, different output.

`ease(current, goal, EASE)` already exists, so the decided rest behaviour is
nearly free.

## Decided

- **On pointer leave: ease shut** (Anton, 27 Oct). Not snap, not stay open.
  The brain is a reward for exploring; closed is the resting state.
  Implement as: goal → 0 (closed) when the pointer leaves, run through the
  existing `ease()` step. Do NOT reuse the Retina idle sine sweep here.
- Reduced motion: rest closed, no pointer response.

## Still open

1. What is in the screen recording? It may show easing, an idle state or a
   cut-line shape the static frames don't convey. Watch before building.
2. Cut line: a straight horizontal sweep, or does it follow the skull's
   curve? The storyboard suggests it follows the crown.
3. Does pointer y do anything, or x only?
4. Touch: drag to open, or always closed on touch devices?

## Assets needed (Anton is supplying)

| Asset | Figma layer | Notes |
|---|---|---|
| Line drawing (resting) | `hist_header_sketch 1` | raster today |
| Brain reveal | `Foundations_ST7_NM3_LL_h04 1` | raster today, hidden |
| Hand / eraser | — | MUST be a separate layer: it translates independently of the mask |

**Ask for SVG/vector if the illustrator can supply it.** Figma shows these as
image fills, i.e. raster. Vector would stay crisp at any size, weigh less,
and leave a future draw-on effect possible. Cheap to ask now, expensive to
redo later.

**If a Lottie is ever supplied instead: it must not use expressions.** The
widget/chapter CSP has no `unsafe-eval`, so lottie-web cannot evaluate them.
