/*
 * exploreRail (OPENBRAIN-163): which boxes read sideways, the arithmetic
 * between the page's scroll and the track's, where Previous and Next stop,
 * and the DOM contract readerJump and the timeline read.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  RAIL_BOXES_BY_SLUG,
  boxIsRail,
  clearRailColumns,
  fitRailColumns,
  railActivePart,
  railLandingY,
  railNextStop,
  railRoom,
  railScrolledForX,
  railStops,
  railXForScrolled,
  railXOf,
  revealInRail,
} from "../exploreRail";

const explore = (id) => ({ id, explore: { title: id } });
const HISTORY = "foundations-of-neuroscience";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("boxIsRail", () => {
  const box = (paragraphs, slug = "box-sacred-disease") => ({
    kind: "box",
    slug,
    paragraphs,
  });

  it("is the Hippocrates box in History, on trial", () => {
    expect(RAIL_BOXES_BY_SLUG[HISTORY]).toContain("box-sacred-disease");
    expect(boxIsRail(box([explore("a"), explore("b")]), HISTORY)).toBe(true);
  });

  it("needs two or more parts and nothing but parts", () => {
    expect(boxIsRail(box([explore("a")]), HISTORY)).toBe(false);
    expect(
      boxIsRail(box([explore("a"), { id: "prose" }, explore("b")]), HISTORY)
    ).toBe(false);
    expect(boxIsRail(box([]), HISTORY)).toBe(false);
  });

  it("leaves every box that is not listed as fold-out cards", () => {
    const parts = [explore("a"), explore("b")];
    expect(boxIsRail(box(parts, "box-rete-mirabile"), HISTORY)).toBe(false);
    expect(boxIsRail(box(parts), "the-retina")).toBe(false);
    expect(boxIsRail(box(parts), null)).toBe(false);
    expect(boxIsRail({ ...box(parts), kind: "section" }, HISTORY)).toBe(false);
    expect(boxIsRail(null, HISTORY)).toBe(false);
  });
});

describe("the page's scroll and the track's", () => {
  const g = { lead: 180, max: 1700 };

  it("holds for the lead-in, then moves a pixel across per pixel down", () => {
    expect(railXForScrolled(-50, g)).toBe(0);
    expect(railXForScrolled(180, g)).toBe(0);
    expect(railXForScrolled(181, g)).toBe(1);
    expect(railXForScrolled(1000, g)).toBe(820);
    expect(railXForScrolled(1880, g)).toBe(1700);
    expect(railXForScrolled(5000, g)).toBe(1700);
  });

  it("maps back, so a track moved by hand puts the page where it belongs", () => {
    for (const x of [0, 1, 820, 1700])
      expect(railXForScrolled(railScrolledForX(x, g), g)).toBe(x);
    expect(railScrolledForX(-10, g)).toBe(180);
    expect(railScrolledForX(9999, g)).toBe(1880);
  });

  it("makes the spacer the travel plus a lead at each end", () => {
    expect(railRoom(g)).toBe(2060);
    expect(railRoom({ lead: 180, max: 0 })).toBe(0);
  });
});

describe("railStops", () => {
  it("stops at each part and at the end", () => {
    expect(railStops([0, 1310], 1440, 1699)).toEqual([0, 1310, 1699]);
  });

  it("pages through a part wider than the screen", () => {
    // 0.8 of a 1000px view at a time, while more than a page and a
    // quarter is left: the step that reaches a part is never a sliver.
    expect(railStops([0, 3000], 1000, 4000)).toEqual([
      0, 800, 1600, 2400, 3000, 4000,
    ]);
    expect(railStops([0, 1900], 1000, 1900)).toEqual([0, 800, 1600, 1900]);
    expect(railStops([0, 900], 1000, 900)).toEqual([0, 900]);
  });

  it("clamps, sorts and drops near-duplicates", () => {
    expect(railStops([0, 1, 2500, 900], 1000, 2000)).toEqual([
      0, 900, 1700, 2000,
    ]);
    expect(railStops([], 1000, 0)).toEqual([0]);
    expect(railStops(undefined, 0, undefined)).toEqual([0]);
  });
});

describe("railNextStop", () => {
  const stops = [0, 1310, 1699];

  it("goes to the next stop, or the previous one", () => {
    expect(railNextStop(stops, 0, 1)).toBe(1310);
    expect(railNextStop(stops, 820, 1)).toBe(1310);
    expect(railNextStop(stops, 1310, 1)).toBe(1699);
    expect(railNextStop(stops, 1699, -1)).toBe(1310);
    expect(railNextStop(stops, 820, -1)).toBe(0);
  });

  it("stays at the ends", () => {
    expect(railNextStop(stops, 1699, 1)).toBe(1699);
    expect(railNextStop(stops, 0, -1)).toBe(0);
    expect(railNextStop([], 50, 1)).toBe(0);
  });
});

describe("railActivePart", () => {
  it("is the part leading the view, and the last at the end", () => {
    const starts = [0, 1310];
    expect(railActivePart(starts, 0, 1440, 1699)).toBe(0);
    expect(railActivePart(starts, 700, 1440, 1699)).toBe(0);
    // Part two's start is within 40% of the screen from the left.
    expect(railActivePart(starts, 800, 1440, 1699)).toBe(1);
    expect(railActivePart([0, 5000], 4000, 1000, 4000)).toBe(1);
    expect(railActivePart([], 100, 1000, 500)).toBe(0);
    // Everything fits: nowhere to go, so the first.
    expect(railActivePart([0, 700], 0, 1440, 0)).toBe(0);
  });
});

/* A track in the DOM, with the rects happy-dom does not lay out. The
   scroller's box is the viewport's width at `left`; the parts sit on a row
   that moves with scrollLeft. */
function track({
  pinned = "1",
  lead = 180,
  top = 64,
  pauseTop = 2000,
  padLeft = 50,
  client = 1440,
  scrollW = 3140,
  parts = [0, 1310],
} = {}) {
  const pause = document.createElement("div");
  pause.setAttribute("data-rail-pause", "");
  pause.getBoundingClientRect = () => ({ top: pauseTop });
  const scroller = document.createElement("div");
  scroller.setAttribute("data-rail-scroller", "");
  scroller.setAttribute("data-rail-pinned", pinned);
  scroller.setAttribute("data-rail-lead", String(lead));
  scroller.setAttribute("data-rail-top", String(top));
  scroller.style.paddingLeft = `${padLeft}px`;
  Object.defineProperty(scroller, "clientWidth", { value: client });
  Object.defineProperty(scroller, "scrollWidth", { value: scrollW });
  scroller.getBoundingClientRect = () => ({ left: 0 });
  pause.appendChild(scroller);
  const els = parts.map((start, i) => {
    const part = document.createElement("div");
    part.setAttribute("data-explore", `p${i}`);
    part.getBoundingClientRect = () => ({
      left: padLeft + start - scroller.scrollLeft,
    });
    scroller.appendChild(part);
    return part;
  });
  document.body.appendChild(pause);
  /** A paragraph `dx` px into part `i`. */
  const inside = (i, dx) => {
    const p = document.createElement("div");
    p.getBoundingClientRect = () => ({
      left: padLeft + parts[i] + dx - scroller.scrollLeft,
    });
    els[i].appendChild(p);
    return p;
  };
  return { pause, scroller, parts: els, inside };
}

describe("railXOf", () => {
  it("is a part's start, whatever the track is at", () => {
    const t = track();
    expect(railXOf(t.parts[1], t.scroller)).toBe(1310);
    t.scroller.scrollLeft = 400;
    expect(railXOf(t.parts[1], t.scroller)).toBe(1310);
    expect(railXOf(t.parts[0], t.scroller)).toBe(0);
  });

  it("gives an element near its part's start the part, a later column itself", () => {
    const t = track({ scrollW: 6000, parts: [0, 3000] });
    expect(railXOf(t.inside(1, 400), t.scroller)).toBe(3000);
    expect(railXOf(t.inside(0, 1500), t.scroller)).toBe(1500);
  });

  it("never passes the end of the track", () => {
    const t = track(); // max 1700
    expect(railXOf(t.inside(1, 1200), t.scroller)).toBe(1700);
  });
});

describe("railLandingY", () => {
  it("is the scrollY that pins the box and brings the part across", () => {
    const t = track();
    Object.defineProperty(window, "scrollY", {
      value: 500,
      configurable: true,
    });
    // The box pins at 2000 + 500 − 64; then the lead, then the part's start.
    expect(railLandingY(t.parts[0])).toBe(2436 + 180);
    expect(railLandingY(t.parts[1])).toBe(2436 + 180 + 1310);
    expect(railLandingY(t.inside(1, 100))).toBe(2436 + 180 + 1310);
  });

  it("is null off a track, and on one the page does not drive", () => {
    expect(railLandingY(document.body)).toBeNull();
    expect(railLandingY(null)).toBeNull();
    const t = track({ pinned: "0" });
    expect(railLandingY(t.parts[1])).toBeNull();
  });
});

describe("revealInRail", () => {
  it("moves a track the page does not drive, and only that", () => {
    const loose = track({ pinned: "0" });
    expect(revealInRail(loose.parts[1])).toBe(true);
    expect(loose.scroller.scrollLeft).toBe(1310);

    document.body.innerHTML = "";
    const driven = track();
    expect(revealInRail(driven.parts[1])).toBe(false);
    expect(driven.scroller.scrollLeft).toBe(0);
    expect(revealInRail(document.body)).toBe(false);
  });
});

describe("fitRailColumns", () => {
  /** A text block one view of columns wide whose content reaches `right`. */
  function columns({ width, column, gap, right }) {
    const scroller = document.createElement("div");
    const el = document.createElement("div");
    el.setAttribute("data-rail-columns", "");
    el.style.columnWidth = `${column}px`;
    el.style.columnGap = `${gap}px`;
    el.getBoundingClientRect = () => ({ left: 100, width });
    Object.defineProperty(el, "scrollWidth", { value: width });
    const child = document.createElement("p");
    child.getClientRects = () => [{ right: 100 + right }];
    el.appendChild(child);
    scroller.appendChild(el);
    document.body.appendChild(scroller);
    return { scroller, el };
  }

  it("widens a block to all the columns its text fills", () => {
    // Two 412.4px columns fit; the text runs into a third.
    const { scroller, el } = columns({
      width: 872.8,
      column: 412.4,
      gap: 48,
      right: 3 * 412.4 + 2 * 48,
    });
    fitRailColumns(scroller);
    // Three whole columns, in fractions, half a pixel over: never a hair
    // under, which would lay out two.
    expect(parseFloat(el.style.width)).toBeCloseTo(1333.7, 1);
    clearRailColumns(scroller);
    expect(el.style.width).toBe("");
  });

  it("leaves a block whose text fits the view alone", () => {
    const { scroller, el } = columns({
      width: 872.8,
      column: 412.4,
      gap: 48,
      right: 860,
    });
    fitRailColumns(scroller);
    expect(el.style.width).toBe("");
    expect(() => fitRailColumns(null)).not.toThrow();
  });
});
