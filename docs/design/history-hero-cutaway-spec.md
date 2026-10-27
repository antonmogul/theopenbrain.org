# History hero: the skull cutaway — implementation spec

**Status:** assets exported 27 Oct, in
`public/publicAssets/images/covers/foundations-hero/`. Ready to build.
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

## Assets — exported 27 Oct

In `public/publicAssets/images/covers/foundations-hero/` (1.4 MB total):

| File                      | Source                  | Size      | What it is                                                      |
| ------------------------- | ----------------------- | --------- | --------------------------------------------------------------- |
| `hist-header-sketch.png`  | `2730:6789`             | 1728×1116 | resting line drawing, signed HM                                 |
| `hist-header-cutaway.png` | `2730:9219` (frame 884) | 2553×1640 | skull cap lifted, violet brain along the cut                    |
| `hist-header-hand.png`    | `2730:6790`'s fill      | 1542×1338 | photographic hand holding the bone cap, already on transparency |

### IMPORTANT: the two drawings are NOT the same artwork

This changes the mechanic. `md5` differs and the crops differ (1728×1116 vs
2553×1640), so the cutaway is a **separately drawn state**, not the base with
a layer behind it. The head, hair and shoulder lines are redrawn.

So this is NOT "one mask over two aligned images". It is a **cross-fade or
masked wipe between two independent drawings**, which means:

1. They must be registered to each other first (align on the face/shoulder,
   which are common to both) or the figure will visibly jump at the midpoint.
   Do this once, at build time, by exporting both at a shared bounding box —
   do not try to fix it with CSS offsets at runtime.
2. A hard `clip-path` wipe between two differently-drawn heads will tear.
   Prefer revealing the CUTAWAY over the base with a soft-edged mask that
   follows the cut line, or cross-fade within the cut region only.
3. The hand is genuinely separate and transparent, so it can translate along
   the cut independently — that part works as hoped.

**Still worth asking the illustrator for SVG**, and specifically for the two
states exported at one shared canvas. Raster at these sizes is acceptable
(1.4 MB total) but registration is the real cost here, not file size.

**If a Lottie is ever supplied instead: it must not use expressions.** The
widget/chapter CSP has no `unsafe-eval`, so lottie-web cannot evaluate them.
