/*
 * The reader keeps their place when the screen changes shape (OPENBRAIN-74).
 *
 * Stuart, 20 Nov, on his phone: "when I physically rotate my phone back and
 * forth from portrait to landscape, my location in the chapter keeps
 * changing quite a lot". Turning a phone changes the width of the text, so
 * every paragraph changes height and the same scrollY is somewhere else in
 * the chapter; dragging a window narrower or wider does the same, and
 * crossing 1024px swaps the whole layout.
 *
 * So while the page is steady this notes what the reader is looking at: the
 * block under the reading line (a paragraph, heading, figure or box), how
 * far through it the line is, and how far down the screen. When the screen
 * changes shape it puts that same spot of that same block back at the same
 * height on the new screen, and holds it there while the layout settles
 * (fonts reflow, figures re-measure, ScrollTrigger refreshes 200 ms after
 * the last resize). It lands through readerJump's holdLanding, instantly,
 * and lets go the moment the reader scrolls, touches or presses a key.
 *
 * The note is taken before the change, never during it: a resize event
 * arrives after the new layout, when the browser has already moved the
 * page. A place noted at one width is only replaced by one noted at the
 * width the page has settled at.
 *
 * A phone's address bar sliding in and out changes the height many times a
 * minute and moves nothing in the flow (in-flow blocks are sized in svh,
 * OPENBRAIN-185): on a touch screen only a change of width counts.
 */

import { holdLanding } from "./readerJump.js";
import { readerScrollLocked } from "./readerScrollLock.js";
import { videoFullscreenHeld } from "./videoFullscreen.js";

/** How far down the screen the reading line is taken to be. */
export const READING_LINE = 0.4;
/** How long after the last scroll the place is noted. */
const NOTE_AFTER_MS = 150;
/** How long after the last change of shape the place is held. */
const HOLD_MS = 1500;

/* What can be a place, nearest first: a breakout box with the stretch of
   page it pauses for is one block (pinned, it does not move with the page,
   and read sideways its paragraphs lie beside each other), then
   the blocks of the text, then whatever section holds the point. */
const BOX = ".bx-pause, aside.bx";
const BLOCK =
  ".P[id], h1, h2, h3, h4, figure, li, blockquote, [data-timeline-id]";
const SECTION = "section, #chapter-toc, .chapter-opener, #chapter-back";
/* The page itself, not what floats over it. */
const FLOW = ".chapter-reader";

const fixedOrSticky = (el, win, until = null) => {
  for (
    let node = el;
    node && node !== until && node.nodeType === 1;
    node = node.parentElement
  ) {
    const position = win.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
};

/**
 * The block at the reading line: `{ el, part, line }`, where `part` is how
 * far through the block the line is (0 its top, 1 its bottom) and `line`
 * how far down the screen (0–1). Null when nothing of the reader is there.
 */
export function placeAtReadingLine(win = window, doc = document) {
  const height = win.innerHeight || 0;
  const width = win.innerWidth || 0;
  if (!(height > 0) || !(width > 0) || !doc.elementFromPoint) return null;
  // The text is in the middle on a phone and to one side from 1024px.
  for (const line of [READING_LINE, 0.25, 0.6])
    for (const across of [0.5, 0.75, 0.25]) {
      const hit = doc.elementFromPoint(width * across, height * line);
      if (!hit?.closest?.(FLOW)) continue;
      const box = hit.closest(BOX);
      // Inside a box the pinned parts are the box's own; anywhere else a
      // fixed or pinned thing is chrome, not the page.
      if (fixedOrSticky(box || hit, win, box?.parentElement)) continue;
      const el = box || hit.closest(BLOCK) || hit.closest(SECTION);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (!(rect.height > 0)) continue;
      const part = (height * line - rect.top) / rect.height;
      return { el, part: Math.min(1, Math.max(0, part)), line };
    }
  return null;
}

/** The scrollY that puts a noted place back where it was on the screen. */
export function scrollYForPlace(place, win = window) {
  if (!place?.el?.isConnected) return null;
  const rect = place.el.getBoundingClientRect();
  const scrollY = win.scrollY || win.pageYOffset || 0;
  return (
    rect.top +
    scrollY +
    place.part * rect.height -
    place.line * (win.innerHeight || 0)
  );
}

/**
 * Keep the reader's place through changes of the screen's shape. Returns a
 * function that stops it.
 */
export function keepReadingPlace({ win = window, doc = document } = {}) {
  let place = null; // what the reader was looking at, and at what width
  let noteTimer = 0;
  let stopHold = null;
  let width = win.innerWidth || 0;
  let height = win.innerHeight || 0;
  const touch = () => !!win.matchMedia?.("(pointer: coarse)")?.matches;
  const busy = () => videoFullscreenHeld(doc) || readerScrollLocked();

  function note() {
    noteTimer = 0;
    // Not while a place is being held, and not at a width the page has
    // not been noted as settled at: that is the browser's move, not the
    // reader's.
    if (stopHold || busy() || (win.innerWidth || 0) !== width) return;
    const found = placeAtReadingLine(win, doc);
    if (found) place = found;
  }
  function onScroll() {
    win.clearTimeout(noteTimer);
    noteTimer = win.setTimeout(note, NOTE_AFTER_MS);
  }

  function onShape() {
    const nowWidth = win.innerWidth || 0;
    const nowHeight = win.innerHeight || 0;
    const wider = nowWidth !== width;
    const taller = nowHeight !== height;
    width = nowWidth;
    height = nowHeight;
    if (!wider && !(taller && !touch())) return;
    // A note still waiting would be of the page as the change left it.
    win.clearTimeout(noteTimer);
    noteTimer = 0;
    if (busy() || !place?.el?.isConnected) return;
    const kept = place;
    stopHold?.(); // a further turn: the same place, held afresh
    let mine = null;
    mine = stopHold =
      holdLanding(kept.el, {
        ms: HOLD_MS,
        place: () => scrollYForPlace(kept, win),
        onStop() {
          if (stopHold !== mine) return;
          stopHold = null;
          // Settled, or the reader took over: where they are now is the
          // place from here on.
          onScroll();
        },
      }) || null;
  }

  win.addEventListener("scroll", onScroll, { passive: true });
  win.addEventListener("resize", onShape);
  win.addEventListener("orientationchange", onShape);
  onScroll();
  return () => {
    win.clearTimeout(noteTimer);
    const stop = stopHold;
    stopHold = null;
    stop?.();
    win.removeEventListener("scroll", onScroll);
    win.removeEventListener("resize", onShape);
    win.removeEventListener("orientationchange", onShape);
  };
}
