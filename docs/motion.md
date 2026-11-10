# Motion in the book

How things move on The Open Brain, and which tool to use. The rule is the
lightest tool that does the job. Written 10 Nov 2026 (OPENBRAIN-166), from an
audit of every use of GSAP, three.js, Lottie and CSS motion.

## The order to reach for

1. **CSS.** Transitions and keyframes for every interface state: hover,
   open and close, fades, slides, the tab switch's pill, the sheet on
   phones. `position: sticky` for anything that holds while the page
   scrolls (breakout boxes, full-screen bands, the side-scrolling box).
2. **A few lines of JavaScript, no library.** `IntersectionObserver` to
   know when something is in view, `ResizeObserver` to measure, the
   window's `scroll` event for scroll-linked state (the chapter timeline,
   the side-scrolling box). `requestAnimationFrame` only for a canvas.
3. **A library, only inside the thing that needs it.** GSAP for a
   choreographed sequence in one widget view; three.js for a 3D scene.
   Loaded with that view, never by the reader or the app shell.
4. **Uploaded widgets bring their own.** A widget is a standalone HTML
   file and loads whatever it needs from cdnjs or jsDelivr (see
   `public/widget-kit/`). Nothing it uses is added to the book's bundle.

Every motion has a reduced-motion version: the reader's own setting first
(`html[data-reduce-motion="1"]` on, `"0"` off), the OS setting when unset.
In CSS, plain selectors (`:root[data-reduce-motion="1"] .x`), never
`:global()`; in JavaScript, `reducedMotionPreferred()` from
`helper/readerJump.js`.

## What is in the book today

| Tool         | Where                                                                                                                                                           | Cost (gzip)                       | Verdict                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| CSS          | Breakout box pause, full-screen bands, side-scrolling box, Explore cards, phrenology tab switch and sheet, timeline peek, nav drawer, figure pane fades         | 0                                 | The default.                                                                                                                     |
| GSAP         | The figure pane's scroll triggers (`IllustrationsComp`, `TextComp`, `FullScreenIllustration*`), and `ScrollTrigger.refresh()` calls elsewhere that only feed it | 44 KB, on every chapter page      | Legacy. Kept for the Retina; History moves off it (below).                                                                       |
| GSAP         | Phrenology skull turn and map wipe, case cabinet drawer, `LegendElement` fades                                                                                  | (same chunk)                      | Allowed inside a widget view. `LegendElement`'s two fades should be CSS.                                                         |
| three.js     | Brain atlas (`/brain`, the home cover), 3D phrenology prototype (`/phrenology-3d`)                                                                              | 201 KB, only on those pages       | Fine: loaded only when a WebGL stage will draw. No three.js in the reader.                                                       |
| Lottie       | The Retina's 2023 figures, the reactive cover                                                                                                                   | 77 KB, only where a Lottie mounts | Legacy, Retina only. New figures are images, SVG or uploaded widgets. History's cover is a clip-path over two images, no Lottie. |
| model-viewer | Nothing (still in `package.json`, and named in `vite.config.js`)                                                                                                | 0 (never imported)                | Remove the dependency.                                                                                                           |

## History first

History is the chapter we clean up first; the Retina keeps its legacy paths
until it is redone. For motion that means:

1. **Done (OPENBRAIN-166):** the editor (TipTap) no longer ships to readers,
   and History's heaviest PNGs are recompressed.
2. **Next: the figure pane without GSAP.** History's figures are still
   images and placeholders that appear and hold (`historyFigureTiming`), so
   the pane can be driven by `IntersectionObserver` on the triggers and the
   same hold rules, with a CSS cross-fade. Behind a chapter switch, so the
   Retina keeps ScrollTrigger. GSAP then loads only on Retina pages and the
   two widget views.
3. **Then: images by width.** The engravings are 1000–1600 px JPEGs of
   300–800 KB each; serving a smaller version to the pane and to phones
   (`srcset`) is the largest remaining saving on the page.
