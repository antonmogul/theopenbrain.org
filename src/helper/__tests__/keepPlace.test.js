import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  keepReadingPlace,
  placeAtReadingLine,
  READING_LINE,
  scrollYForPlace,
} from "@/helper/keepPlace";

/*
 * The reader's place through a turned phone or a resized window
 * (OPENBRAIN-74; Stuart, 20 Nov: "my location in the chapter keeps changing
 * quite a lot"). A made-up page: one paragraph whose place in the document
 * and height depend on the window's width, as text does.
 */

const originals = {
  scrollTo: window.scrollTo,
  matchMedia: window.matchMedia,
  elementFromPoint: document.elementFromPoint,
};
function setWindow({ scrollY, innerWidth, innerHeight }) {
  for (const [key, value] of Object.entries({
    scrollY,
    innerWidth,
    innerHeight,
  }))
    if (value !== undefined)
      Object.defineProperty(window, key, { value, configurable: true });
}

let reader;
let paragraph;
// The paragraph in the document at each width: narrow text is long.
const layout = () =>
  window.innerWidth < 500
    ? { top: 14000, height: 400 }
    : { top: 9000, height: 200 };

beforeEach(() => {
  vi.useFakeTimers();
  setWindow({ scrollY: 0, innerWidth: 375, innerHeight: 664 });
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 90000,
    configurable: true,
  });
  window.scrollTo = vi.fn(({ top }) => setWindow({ scrollY: top }));
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }); // touch
  reader = document.createElement("div");
  reader.className = "chapter-reader";
  paragraph = document.createElement("div");
  paragraph.className = "P";
  paragraph.id = "p11";
  paragraph.getBoundingClientRect = () => {
    const { top, height } = layout();
    return { top: top - window.scrollY, height, bottom: top + height };
  };
  reader.appendChild(paragraph);
  document.body.appendChild(reader);
  document.elementFromPoint = vi.fn(() => paragraph);
});
afterEach(() => {
  reader.remove();
  vi.useRealTimers();
  window.scrollTo = originals.scrollTo;
  window.matchMedia = originals.matchMedia;
  document.elementFromPoint = originals.elementFromPoint;
});

/** The reader stops with the reading line a quarter into the paragraph. */
function readTo() {
  const { top, height } = layout();
  setWindow({
    scrollY: top + height * 0.25 - window.innerHeight * READING_LINE,
  });
  window.dispatchEvent(new Event("scroll"));
  vi.advanceTimersByTime(200);
}
function turn(innerWidth, innerHeight) {
  setWindow({ innerWidth, innerHeight });
  window.dispatchEvent(new Event("resize"));
}
/** How far through the paragraph the reading line is now. */
const partRead = () => {
  const { top, height } = layout();
  return (window.scrollY + window.innerHeight * READING_LINE - top) / height;
};

describe("placeAtReadingLine", () => {
  it("names the block at the reading line and how far through it the line is", () => {
    setWindow({ scrollY: 14000 + 100 - 664 * READING_LINE });
    const place = placeAtReadingLine();
    expect(place.el).toBe(paragraph);
    expect(place.part).toBeCloseTo(0.25, 2);
    expect(place.line).toBe(READING_LINE);
  });

  it("takes a breakout box as one block, and leaves the chrome out", () => {
    const box = document.createElement("aside");
    box.className = "bx";
    box.getBoundingClientRect = () => ({ top: 0, height: 600 });
    const inside = document.createElement("p");
    box.appendChild(inside);
    reader.appendChild(box);
    document.elementFromPoint = vi.fn(() => inside);
    expect(placeAtReadingLine().el).toBe(box);

    // Nothing of the reader under any of the points: the top bar, a panel.
    const bar = document.createElement("header");
    document.body.appendChild(bar);
    document.elementFromPoint = vi.fn(() => bar);
    expect(placeAtReadingLine()).toBeNull();
    bar.remove();

    // In the reader, but fixed over it (the figure pane).
    const pane = document.createElement("div");
    pane.style.position = "fixed";
    const figure = document.createElement("figure");
    pane.appendChild(figure);
    reader.appendChild(pane);
    document.elementFromPoint = vi.fn(() => figure);
    expect(placeAtReadingLine()).toBeNull();
  });
});

describe("scrollYForPlace", () => {
  it("puts the same spot of the block at the same height on the screen", () => {
    const place = { el: paragraph, part: 0.5, line: 0.4 };
    expect(scrollYForPlace(place)).toBeCloseTo(14000 + 200 - 664 * 0.4, 5);
    paragraph.remove();
    expect(scrollYForPlace(place)).toBeNull();
  });
});

describe("keepReadingPlace", () => {
  it("brings the paragraph back to the reading line when the phone is turned, each way", () => {
    const stop = keepReadingPlace();
    readTo();
    expect(partRead()).toBeCloseTo(0.25, 2);

    turn(664, 375);
    // Instantly: never the smooth scroll html:focus-within asks for.
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: Math.round(9000 + 50 - 375 * READING_LINE),
      behavior: "instant",
    });
    expect(partRead()).toBeCloseTo(0.25, 2);

    // And back, straight away: the same place, not the one in between.
    turn(375, 664);
    expect(partRead()).toBeCloseTo(0.25, 2);
    stop();
  });

  it("holds the place while the layout settles, then follows the reader again", () => {
    const stop = keepReadingPlace();
    readTo();
    turn(664, 375);
    // A late re-measure moves the page under the reader.
    setWindow({ scrollY: 3 });
    vi.advanceTimersByTime(100);
    expect(partRead()).toBeCloseTo(0.25, 2);

    // Settled. The reader reads on; the next turn keeps the new place.
    vi.advanceTimersByTime(2000);
    setWindow({ scrollY: 9000 + 150 - 375 * READING_LINE });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);
    turn(375, 664);
    expect(partRead()).toBeCloseTo(0.75, 2);
    stop();
  });

  it("lets go as soon as the reader scrolls", () => {
    const stop = keepReadingPlace();
    readTo();
    turn(664, 375);
    window.scrollTo.mockClear();
    window.dispatchEvent(new Event("touchstart"));
    setWindow({ scrollY: 500 });
    vi.advanceTimersByTime(1000);
    expect(window.scrollTo).not.toHaveBeenCalled();
    stop();
  });

  it("ignores a phone's address bar, but not a window made shorter", () => {
    const stop = keepReadingPlace();
    readTo();
    window.scrollTo.mockClear();
    turn(375, 745); // the bar slid away
    vi.advanceTimersByTime(300);
    expect(window.scrollTo).not.toHaveBeenCalled();
    stop();

    window.matchMedia = vi.fn().mockReturnValue({ matches: false }); // a mouse
    const stopDesk = keepReadingPlace();
    readTo();
    window.scrollTo.mockClear();
    turn(375, 500);
    expect(window.scrollTo).toHaveBeenCalled();
    expect(partRead()).toBeCloseTo(0.25, 2);
    stopDesk();
  });

  it("does not take the page the browser left after the turn for the reader's place", () => {
    const stop = keepReadingPlace();
    readTo();
    // The new layout, and a scroll event for it, before the resize event.
    setWindow({ innerWidth: 664, innerHeight: 375, scrollY: 14000 });
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);
    window.dispatchEvent(new Event("resize"));
    expect(partRead()).toBeCloseTo(0.25, 2);
    stop();
  });

  it("stops listening when stopped", () => {
    const stop = keepReadingPlace();
    readTo();
    stop();
    window.scrollTo.mockClear();
    turn(664, 375);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
