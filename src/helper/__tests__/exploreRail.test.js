/*
 * exploreRail (OPENBRAIN-163, 187): which boxes read sideways and what their
 * parts are, the arithmetic between the page's scroll and the track's,
 * where Previous and Next stop (on the pinned track and on a phone's swipe
 * track), and the DOM contract readerJump and the timeline read.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  RAIL_BOXES_BY_SLUG,
  boxIsRail,
  clearRailColumns,
  fitRailColumns,
  fitRailFigures,
  railActivePart,
  railLandingY,
  railLayoutOf,
  railNextStop,
  railPageStops,
  railRoom,
  railScrolledForX,
  railStopIndex,
  railStops,
  railWidowTrim,
  railXForScrolled,
  railXOf,
  revealInRail,
} from "../exploreRail";

const explore = (id) => ({ id, explore: { title: id } });
const HISTORY = "foundations-of-neuroscience";

afterEach(() => {
  document.body.innerHTML = "";
});

const prose = (id) => ({ id, text: `Text of ${id}` });
const figure = (id, fig) => ({ id, text: id, animation: { id: fig } });
const box = (paragraphs, slug = "box-sacred-disease") => ({
  kind: "box",
  slug,
  paragraphs,
});

describe("boxIsRail", () => {
  it("is History's two Explore boxes and Stuart's five (12 Nov)", () => {
    expect(RAIL_BOXES_BY_SLUG[HISTORY]).toEqual([
      "box-sacred-disease",
      "box-rete-mirabile",
      "box-descartes",
      "box-electrical-stim",
      "box-psychosurgery",
      "box-penfield",
      "box-ngf",
    ]);
    const parts = [explore("a"), explore("b")];
    expect(boxIsRail(box(parts), HISTORY)).toBe(true);
    expect(boxIsRail(box(parts, "box-rete-mirabile"), HISTORY)).toBe(true);
    expect(
      boxIsRail(box([prose("a"), prose("b")], "box-descartes"), HISTORY)
    ).toBe(true);
  });

  it("needs something a track can hold", () => {
    expect(boxIsRail(box([]), HISTORY)).toBe(false);
    expect(
      boxIsRail(
        box([prose("a"), { id: "w", type: "widget" }, prose("b")]),
        HISTORY
      )
    ).toBe(false);
    expect(
      boxIsRail(box([prose("a"), { id: "v", type: "breakVideo" }]), HISTORY)
    ).toBe(false);
  });

  it("leaves every box that is not listed running down the page", () => {
    const parts = [explore("a"), explore("b")];
    expect(boxIsRail(box(parts, "box-somewhere-else"), HISTORY)).toBe(false);
    expect(boxIsRail(box(parts), "the-retina")).toBe(false);
    expect(boxIsRail(box(parts), null)).toBe(false);
    expect(boxIsRail({ ...box(parts), kind: "section" }, HISTORY)).toBe(false);
    expect(boxIsRail(null, HISTORY)).toBe(false);
  });
});

describe("railLayoutOf", () => {
  it("makes each Explore paragraph a named part, with its figure", () => {
    const humours = { ...explore("b"), animation: { id: "figK" } };
    const layout = railLayoutOf(box([explore("a"), humours]));
    expect(layout.named).toBe(true);
    expect(layout.tail).toEqual([]);
    expect(layout.parts.map((p) => [p.id, p.title, p.explore])).toEqual([
      ["a", "a", true],
      ["b", "b", true],
    ]);
    expect(layout.parts[0].figures).toEqual([]);
    expect(layout.parts[1].figures).toEqual([humours]);
  });

  it("runs prose together, and starts a part at each figure (Descartes, Rafferty)", () => {
    // Descartes: four paragraphs of text, then Figure A with its paragraph.
    const descartes = railLayoutOf(
      box([prose("d1"), prose("d2"), prose("d3"), figure("d4", "figA")])
    );
    expect(descartes.named).toBe(false);
    expect(descartes.parts.map((p) => p.paragraphs.map((q) => q.id))).toEqual([
      ["d1", "d2", "d3"],
      ["d4"],
    ]);
    expect(descartes.parts[1].figures.map((p) => p.animation.id)).toEqual([
      "figA",
    ]);
    // Rafferty: Figure G leads, the next paragraph reads on after it.
    const rafferty = railLayoutOf(box([figure("r1", "figG"), prose("r2")]));
    expect(rafferty.parts).toHaveLength(1);
    expect(rafferty.parts[0].paragraphs.map((p) => p.id)).toEqual(["r1", "r2"]);
  });

  it("leaves a widget that ends the box after the track (the Penfield binder)", () => {
    const binder = {
      id: "w",
      type: "widget",
      widget: { widgetId: "upload:x" },
    };
    const layout = railLayoutOf(
      box([figure("p1", "op"), figure("p2", "map"), binder])
    );
    expect(layout.parts.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(layout.tail).toEqual([binder]);
    // A box that is only a widget has nothing for a track.
    expect(railLayoutOf(box([binder]))).toBeNull();
  });

  it("holds no breaks, full-screen figures or widgets in the text", () => {
    expect(
      railLayoutOf(box([prose("a"), { id: "f", animationFull: true }]))
    ).toBeNull();
    expect(railLayoutOf(box([{ id: "s", type: "breakSection" }]))).toBeNull();
    expect(
      railLayoutOf({ kind: "section", paragraphs: [prose("a")] })
    ).toBeNull();
    expect(railLayoutOf(null)).toBeNull();
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

describe("railPageStops", () => {
  it("is a stop per page of a swipe track, and the end", () => {
    // Six pages of a 390px phone, the columns half a pixel over.
    expect(railPageStops(390, 1950.5)).toEqual([
      0, 390, 780, 1170, 1560, 1950.5,
    ]);
    expect(railPageStops(390, 0)).toEqual([0]);
    expect(railPageStops(0, 800)).toEqual([0]);
  });
});

describe("railStopIndex", () => {
  const stops = [0, 390, 780, 1170];
  it("is the stop reached, or the next once past half-way", () => {
    expect(railStopIndex(stops, 0)).toBe(0);
    expect(railStopIndex(stops, 100)).toBe(0);
    expect(railStopIndex(stops, 200)).toBe(1);
    expect(railStopIndex(stops, 390)).toBe(1);
    expect(railStopIndex(stops, 1170)).toBe(3);
    expect(railStopIndex(stops, 5000)).toBe(3);
    expect(railStopIndex([], 50)).toBe(0);
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
  const els = parts.map((start) => {
    const part = document.createElement("div");
    part.setAttribute("data-rail-part", "");
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
  it("ignores visual lag and its overflow when computing jump targets", () => {
    const t = track();
    const native = t.parts[1].getBoundingClientRect;
    t.parts[1].getBoundingClientRect = () => ({
      ...native(),
      left: native().left + 60,
    });
    t.scroller.setAttribute("data-rail-visual-offset", "60");
    t.scroller.setAttribute("data-rail-max", "1700");
    expect(railXOf(t.parts[1], t.scroller)).toBe(1310);
  });
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

  it("rests a swipe track on whole pages", () => {
    const t = track({
      padLeft: 0,
      client: 390,
      scrollW: 390 * 6,
      parts: [0, 1170],
    });
    t.scroller.setAttribute("data-rail-mode", "swipe");
    expect(railXOf(t.parts[1], t.scroller)).toBe(1170);
    // A paragraph two pages into part two: its page.
    expect(railXOf(t.inside(1, 800), t.scroller)).toBe(1950);
  });
});

describe("railLandingY", () => {
  it("lands a named pinned box at readable card copy, independent of its sticky top", () => {
    const t = track();
    const box = document.createElement("aside");
    box.setAttribute("data-box-card", "pinned");
    t.pause.appendChild(box);
    box.appendChild(t.scroller);
    t.scroller.setAttribute("data-rail-card-read", "248");
    expect(railLandingY(box, { scrollY: 500 })).toBe(2000 + 500 - 64 + 248);
  });
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

describe("railWidowTrim", () => {
  it("shares a stray last page out over the pages before it", () => {
    // Pages of 15 lines; two of them and one line: 31 lines over three
    // pages is 11 a page, so each gives up four.
    expect(
      railWidowTrim({ remainder: 30, columns: 3, line: 28, height: 420 })
    ).toBe(112);
    // One page and three lines: nine lines a page.
    expect(
      railWidowTrim({ remainder: 84, columns: 2, line: 28, height: 420 })
    ).toBe(168);
  });

  it("leaves a last page that is a real page", () => {
    expect(
      railWidowTrim({ remainder: 300, columns: 3, line: 28, height: 420 })
    ).toBe(0);
    // Five lines is a page of its own.
    expect(
      railWidowTrim({ remainder: 140, columns: 2, line: 28, height: 420 })
    ).toBe(0);
  });

  it("has nothing to do for one page, or with nothing measured", () => {
    expect(
      railWidowTrim({ remainder: 30, columns: 1, line: 28, height: 420 })
    ).toBe(0);
    expect(railWidowTrim({ remainder: 30, columns: 2, line: 28 })).toBe(0);
    expect(railWidowTrim()).toBe(0);
  });
});

describe("fitRailColumns", () => {
  const COLUMN = 400;
  const GAP = 50;
  const LINE = 30;
  /**
   * A text block with a made-up layout: `lay(el)` answers, for the block's
   * state (its fill, its --rp-extra), the height of the text in each
   * column. Every column's text is one fragment of the block's paragraph.
   */
  function block({ mode = "track", view = 850, height = 500, lay }) {
    const scroller = document.createElement("div");
    scroller.setAttribute("data-rail-mode", mode);
    const el = document.createElement("div");
    el.setAttribute("data-rail-columns", "");
    el.style.columnWidth = `${COLUMN}px`;
    el.style.columnGap = `${GAP}px`;
    el.style.lineHeight = `${LINE}px`;
    const width = () => parseFloat(el.style.width) || view;
    el.getBoundingClientRect = () => ({
      left: 100,
      top: 50,
      width: width(),
      height: parseFloat(el.style.height) || height,
    });
    Object.defineProperty(el, "scrollWidth", { get: width });
    const p = document.createElement("div");
    p.className = "P";
    p.getClientRects = () =>
      lay(el).map((h, i) => ({
        left: 100 + i * (COLUMN + GAP),
        right: 100 + i * (COLUMN + GAP) + COLUMN,
        top: 50,
        bottom: 50 + h,
        width: COLUMN,
        height: h,
      }));
    el.appendChild(p);
    scroller.appendChild(el);
    document.body.appendChild(scroller);
    return { scroller, el, p };
  }
  const filled = (el) => el.getAttribute("data-rail-fill") === "auto";

  it("widens a block to all the columns its text fills, and makes it as tall as its text", () => {
    // Filled in turn the text is two columns and part of a third; balanced
    // it is three of 380px.
    const { scroller, el, p } = block({
      lay: (el) => (filled(el) ? [500, 500, 140] : [380, 380, 380]),
    });
    fitRailColumns(scroller);
    // Three whole columns, in fractions, half a pixel over: never a hair
    // under, which would lay out two.
    expect(parseFloat(el.style.width)).toBeCloseTo(1300.5, 1);
    // As tall as its text, so the part can centre it in the track.
    expect(el.style.height).toBe("381px");
    expect(el.hasAttribute("data-rail-fill")).toBe(false);
    // A long paragraph breaks where it must.
    expect(p.hasAttribute("data-rail-whole")).toBe(false);
    clearRailColumns(scroller);
    expect(el.style.width).toBe("");
    expect(el.style.height).toBe("");
  });

  it("keeps text that fits most of one column as one column (the Descartes box's last paragraph)", () => {
    // Nine lines: balanced it would be split five and four.
    const { scroller, el, p } = block({
      lay: (el) => (filled(el) ? [270] : [150, 120]),
    });
    fitRailColumns(scroller);
    expect(el.getAttribute("data-rail-fill")).toBe("auto");
    expect(parseFloat(el.style.width)).toBeCloseTo(400.5, 1);
    expect(el.style.height).toBe("271px");
    // Nine lines is more than a paragraph that is always kept whole.
    expect(p.hasAttribute("data-rail-whole")).toBe(false);
    clearRailColumns(scroller);
    expect(el.hasAttribute("data-rail-fill")).toBe(false);
  });

  it("balances text that would nearly fill a column", () => {
    const { scroller, el } = block({
      lay: (el) => (filled(el) ? [420] : [210, 210]),
    });
    fitRailColumns(scroller);
    expect(el.hasAttribute("data-rail-fill")).toBe(false);
    expect(el.style.width).toBe("");
    expect(el.style.height).toBe("211px");
  });

  it("marks a short paragraph to be kept whole", () => {
    const { scroller, p } = block({
      lay: (el) => (filled(el) ? [500, 90, 90] : [340, 340]),
    });
    // The block's own paragraph is long; a second one is three lines over
    // two columns.
    const short = document.createElement("div");
    short.className = "P";
    short.getClientRects = () => [
      { left: 100, right: 500, top: 500, bottom: 530, width: 400, height: 30 },
      { left: 550, right: 950, top: 50, bottom: 110, width: 400, height: 60 },
    ];
    p.after(short);
    fitRailColumns(scroller);
    expect(short.hasAttribute("data-rail-whole")).toBe(true);
    expect(p.hasAttribute("data-rail-whole")).toBe(false);
    clearRailColumns(scroller);
    expect(short.hasAttribute("data-rail-whole")).toBe(false);
  });

  it("evens a swipe part's stray last page out with the pages before it", () => {
    // Pages of 500px (16 lines); two and one line. 33 lines over three
    // pages is 11 a page: each page gives five lines, 150px.
    const { scroller, el } = block({
      mode: "swipe",
      view: 400,
      lay: (el) =>
        parseFloat(el.style.getPropertyValue("--rp-extra")) <= -150
          ? [330, 330, 330]
          : [500, 500, 30],
    });
    fitRailColumns(scroller);
    expect(el.style.getPropertyValue("--rp-extra")).toBe("-150px");
    // The track keeps its height (it is what is left of one screen), and
    // the block is its three pages wide.
    expect(scroller.style.getPropertyValue("--rail-extra")).toBe("");
    expect(parseFloat(el.style.width)).toBeCloseTo(1300.5, 1);
    // A swipe page is filled from the top, never centred.
    expect(el.style.height).toBe("");
    clearRailColumns(scroller);
    expect(el.style.getPropertyValue("--rp-extra")).toBe("");
  });

  it("gives a line back when the evened pages spill onto one more", () => {
    const { scroller, el } = block({
      mode: "swipe",
      view: 400,
      lay: (el) => {
        const extra = parseFloat(el.style.getPropertyValue("--rp-extra")) || 0;
        if (extra <= -150) return [330, 330, 330, 20];
        if (extra <= -120) return [360, 360, 300];
        return [500, 500, 30];
      },
    });
    fitRailColumns(scroller);
    expect(el.style.getPropertyValue("--rp-extra")).toBe("-120px");
  });

  it("leaves a swipe part whose last page is a real page, or cannot be evened out", () => {
    const real = block({
      mode: "swipe",
      view: 400,
      lay: () => [500, 500, 300],
    });
    fitRailColumns(real.scroller);
    expect(real.el.style.getPropertyValue("--rp-extra")).toBe("");
    expect(real.scroller.style.getPropertyValue("--rail-extra")).toBe("");
    expect(parseFloat(real.el.style.width)).toBeCloseTo(1300.5, 1);
    // The cut is tried and given back when it only makes another page.
    const stuck = block({
      mode: "swipe",
      view: 400,
      lay: (el) =>
        parseFloat(el.style.getPropertyValue("--rp-extra")) < 0
          ? [400, 400, 200, 30]
          : [500, 500, 30],
    });
    fitRailColumns(stuck.scroller);
    expect(stuck.el.style.getPropertyValue("--rp-extra")).toBe("");
    expect(() => fitRailColumns(null)).not.toThrow();
  });
});

describe("fitRailFigures", () => {
  /** A figure `client` tall whose content is `scroll` tall, an image `img` tall. */
  function figureEl({ client, scroll, img, gallery = false }) {
    const scroller = document.createElement("div");
    const fig = document.createElement("div");
    fig.setAttribute("data-rail-figure", "");
    Object.defineProperty(fig, "clientHeight", { value: client });
    Object.defineProperty(fig, "scrollHeight", { value: scroll });
    const stage = document.createElement("div");
    if (gallery) stage.className = "figimg-stage--gallery";
    stage.getBoundingClientRect = () => ({ height: img });
    const image = document.createElement("img");
    image.getBoundingClientRect = () => ({ height: img });
    stage.appendChild(image);
    // A gallery's thumbnails never give.
    const thumbs = document.createElement("div");
    thumbs.className = "figimg-thumbnails";
    const thumb = document.createElement("img");
    thumb.getBoundingClientRect = () => ({ height: 900 });
    thumbs.appendChild(thumb);
    fig.append(stage, thumbs);
    scroller.appendChild(fig);
    document.body.appendChild(scroller);
    return { scroller, fig };
  }

  it("brings a shell figure's images down by what overflows the track", () => {
    const { scroller, fig } = figureEl({ client: 520, scroll: 640, img: 400 });
    fitRailFigures(scroller);
    expect(fig.style.getPropertyValue("--rp-img-max")).toBe("279px");
    clearRailColumns(scroller);
    expect(fig.style.getPropertyValue("--rp-img-max")).toBe("");
  });

  it("fits a gallery by its stage box", () => {
    const { scroller, fig } = figureEl({
      client: 520,
      scroll: 600,
      img: 300,
      gallery: true,
    });
    fitRailFigures(scroller);
    expect(fig.style.getPropertyValue("--rp-img-max")).toBe("219px");
  });

  it("leaves a figure that fits", () => {
    const { scroller, fig } = figureEl({ client: 520, scroll: 520, img: 300 });
    fitRailFigures(scroller);
    expect(fig.style.getPropertyValue("--rp-img-max")).toBe("");
    expect(() => fitRailFigures(null)).not.toThrow();
  });

  /**
   * A part with one figure of plates (RailFigure's DOM): `sizes` are the
   * images' natural sizes, the figure is `height` tall with a `bar` tall
   * label row, and may be no wider than `max` (RailPart's max-width).
   */
  function platesEl({ sizes, height = 560, bar = 60, max = 9999, mode }) {
    const scroller = document.createElement("div");
    if (mode) scroller.setAttribute("data-rail-mode", mode);
    const part = document.createElement("div");
    part.setAttribute("data-rail-part", "");
    part.style.columnGap = "48px";
    const fig = document.createElement("figure");
    fig.setAttribute("data-rail-figure", "");
    Object.defineProperty(fig, "clientHeight", { value: height });
    const width = () =>
      Math.min(max, parseFloat(fig.style.getPropertyValue("--rp-figure-w")));
    fig.getBoundingClientRect = () => ({ width: width() });
    const head = document.createElement("header");
    head.setAttribute("data-rail-figure-bar", "");
    Object.defineProperty(head, "offsetHeight", { value: bar });
    const row = document.createElement("div");
    row.style.columnGap = "16px";
    Object.defineProperty(row, "clientWidth", { get: width });
    for (const [w, h] of sizes) {
      const plate = document.createElement("div");
      plate.setAttribute("data-rail-plate", "");
      const img = document.createElement("img");
      Object.defineProperty(img, "naturalWidth", { value: w });
      Object.defineProperty(img, "naturalHeight", { value: h });
      plate.appendChild(img);
      row.appendChild(plate);
    }
    fig.append(head, row);
    part.appendChild(fig);
    scroller.appendChild(part);
    document.body.appendChild(scroller);
    return { scroller, part, fig };
  }
  const prop = (el, name) => el.style.getPropertyValue(name);

  it("makes a figure of plates as wide as its image is at the track's height", () => {
    // A portrait bust, 0.6 wide: 500px of room under its label.
    const { scroller, part, fig } = platesEl({ sizes: [[600, 1000]] });
    fitRailFigures(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("300px");
    expect(prop(fig, "--rp-plates-h")).toBe("500px");
    expect(fig.hasAttribute("data-rail-fitted")).toBe(true);
    // The part's columns are measured beside the real picture.
    expect(prop(part, "--rail-figures-w")).toBe("300px");
    clearRailColumns(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("");
    expect(prop(fig, "--rp-plates-h")).toBe("");
    expect(fig.hasAttribute("data-rail-fitted")).toBe(false);
    expect(prop(part, "--rail-figures-w")).toBe("");
  });

  it("makes a wide image as wide as the part allows, and only as tall as that makes it (the four humours)", () => {
    // 1.5 wide: 750px at the track's height, but the part allows 420.
    const { scroller, part, fig } = platesEl({
      sizes: [[1500, 1000]],
      max: 420,
    });
    fitRailFigures(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("750px");
    // 280px tall: the figure is centred in the track by its CSS.
    expect(prop(fig, "--rp-plates-h")).toBe("280px");
    expect(prop(part, "--rail-figures-w")).toBe("420px");
  });

  it("sets two plates side by side at one height (the doctor with an icepick)", () => {
    // 1.5 and 0.75 wide with a 16px gap between: 2.25 × 500 + 16.
    const { scroller, fig } = platesEl({
      sizes: [
        [1500, 1000],
        [750, 1000],
      ],
    });
    fitRailFigures(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("1141px");
    expect(prop(fig, "--rp-plates-h")).toBe("500px");
  });

  it("waits for an image that has not loaded", () => {
    const { scroller, part, fig } = platesEl({ sizes: [[0, 0]] });
    fitRailFigures(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("");
    expect(fig.hasAttribute("data-rail-fitted")).toBe(false);
    expect(part).toBeTruthy();
  });

  it("leaves a swipe track's plates to their pages", () => {
    const { scroller, part, fig } = platesEl({
      sizes: [[600, 1000]],
      mode: "swipe",
    });
    fitRailFigures(scroller);
    expect(prop(fig, "--rp-figure-w")).toBe("");
    expect(prop(part, "--rail-figures-w")).toBe("");
  });
});
