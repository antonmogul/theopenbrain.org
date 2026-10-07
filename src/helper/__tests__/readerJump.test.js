import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  findReaderAnchor,
  flashElement,
  focusElement,
  jumpToElement,
  jumpToId,
  readerTopInset,
  readingStartOf,
  reducedMotionPreferred,
  scrollToY,
} from "@/helper/readerJump";

const root = document.documentElement;

function mockReducedMotionQuery(matches) {
  window.matchMedia = vi.fn().mockReturnValue({ matches });
}

/** An element at `top` px in the viewport, `height` tall. */
function placed(top, height = 100) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
  });
  document.body.appendChild(el);
  return el;
}

function setViewport({ scrollY = 0, innerHeight = 800 } = {}) {
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: innerHeight,
    configurable: true,
  });
}

const originalMatchMedia = window.matchMedia;
const originalScrollTo = window.scrollTo;

beforeEach(() => {
  mockReducedMotionQuery(false);
  window.scrollTo = vi.fn();
  setViewport();
});

afterEach(() => {
  // Let go of any jump still trying to land.
  window.dispatchEvent(new Event("wheel"));
  window.matchMedia = originalMatchMedia;
  window.scrollTo = originalScrollTo;
  root.removeAttribute("data-reduce-motion");
  root.style.removeProperty("--reader-topbar-h");
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("reducedMotionPreferred", () => {
  it("follows the reader's own setting first", () => {
    mockReducedMotionQuery(false);
    root.setAttribute("data-reduce-motion", "1");
    expect(reducedMotionPreferred()).toBe(true);

    mockReducedMotionQuery(true);
    root.setAttribute("data-reduce-motion", "0");
    expect(reducedMotionPreferred()).toBe(false);
  });

  it("falls back to the OS query when the setting is unset", () => {
    mockReducedMotionQuery(true);
    expect(reducedMotionPreferred()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-reduced-motion: reduce)"
    );
    mockReducedMotionQuery(false);
    expect(reducedMotionPreferred()).toBe(false);
    window.matchMedia = undefined;
    expect(reducedMotionPreferred()).toBe(false);
  });

  it("reads the root it is given", () => {
    const other = document.createElement("div");
    other.setAttribute("data-reduce-motion", "1");
    expect(reducedMotionPreferred(other)).toBe(true);
  });
});

describe("readerTopInset", () => {
  it("is the top bar's height plus 16px", () => {
    root.style.setProperty("--reader-topbar-h", "50px");
    expect(readerTopInset()).toBe(66);
    root.style.setProperty("--reader-topbar-h", "4rem");
    expect(readerTopInset()).toBe(80);
  });

  it("falls back to brand.css's 4rem when the token can't be read", () => {
    expect(readerTopInset()).toBe(80);
    // calc() needs layout to resolve; there is none here.
    root.style.setProperty("--reader-topbar-h", "calc(2rem + 8px)");
    expect(readerTopInset()).toBe(80);
  });
});

describe("findReaderAnchor", () => {
  it("finds by id, then data-timeline-id, then data-paragraph-id", () => {
    document.body.innerHTML = `
      <div id="p1" data-which="id"></div>
      <div data-paragraph-id="p1" data-which="paragraph"></div>
      <div data-timeline-id="widget-sdt" data-which="timeline"></div>
      <div data-paragraph-id="widget-sdt" data-which="paragraph"></div>
      <p data-paragraph-id="p2" data-which="paragraph"></p>`;
    expect(findReaderAnchor("p1").dataset.which).toBe("id");
    expect(findReaderAnchor("widget-sdt").dataset.which).toBe("timeline");
    expect(findReaderAnchor("p2").dataset.which).toBe("paragraph");
  });

  it("matches ids that aren't valid selectors as they are", () => {
    // Paragraph ids are UUIDs, often with a leading digit.
    document.body.innerHTML = `
      <div data-paragraph-id="1f55c4e1-8644-4d59"></div>
      <div data-timeline-id="widget-sdt.v2:a"></div>`;
    expect(findReaderAnchor("1f55c4e1-8644-4d59")).not.toBeNull();
    expect(findReaderAnchor("widget-sdt.v2:a")).not.toBeNull();
    expect(() => findReaderAnchor('a"b\\c\nd')).not.toThrow();
  });

  it("is null for nothing", () => {
    expect(findReaderAnchor("missing")).toBeNull();
    expect(findReaderAnchor("")).toBeNull();
    expect(findReaderAnchor(null)).toBeNull();
    expect(findReaderAnchor(undefined)).toBeNull();
  });
});

describe("flashElement", () => {
  it("marks the element for 1600ms", () => {
    vi.useFakeTimers();
    const el = placed(0);
    flashElement(el);
    expect(el.classList.contains("ob-flash")).toBe(true);
    vi.advanceTimersByTime(1599);
    expect(el.classList.contains("ob-flash")).toBe(true);
    vi.advanceTimersByTime(1);
    expect(el.classList.contains("ob-flash")).toBe(false);
  });

  it("restarts the clock when the same element flashes again", () => {
    vi.useFakeTimers();
    const el = placed(0);
    flashElement(el);
    vi.advanceTimersByTime(1000);
    flashElement(el);
    vi.advanceTimersByTime(1000);
    expect(el.classList.contains("ob-flash")).toBe(true);
    vi.advanceTimersByTime(600);
    expect(el.classList.contains("ob-flash")).toBe(false);
  });

  it("ignores a missing element", () => {
    expect(() => flashElement(null)).not.toThrow();
  });
});

describe("jumpToElement", () => {
  it("lands the element's top below the top bar, smoothly", () => {
    setViewport({ scrollY: 1000 });
    const el = placed(500);
    expect(jumpToElement(el)).toBe(true);
    // 500 in the viewport + 1000 scrolled − (64 + 16).
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1420,
      behavior: "smooth",
    });
    expect(el.classList.contains("ob-flash")).toBe(false);
  });

  it("jumps instantly when motion is reduced", () => {
    root.setAttribute("data-reduce-motion", "1");
    jumpToElement(placed(500));
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 420,
      behavior: "auto",
    });
  });

  it("centres the element in the viewport", () => {
    setViewport({ scrollY: 200, innerHeight: 800 });
    jumpToElement(placed(600, 100), { align: "center" });
    // Its middle (850 in the page) at the viewport's middle (400).
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 450 })
    );
  });

  it("lands a too-tall element at the top instead of centring it", () => {
    setViewport({ scrollY: 0, innerHeight: 800 });
    jumpToElement(placed(1000, 700), { align: "center" });
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 920 })
    );
  });

  it("puts the element's top on the reading line at 50vh", () => {
    setViewport({ scrollY: 100, innerHeight: 800 });
    jumpToElement(placed(900), { align: "reading-line" });
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 600 })
    );
  });

  it("never scrolls above the page", () => {
    jumpToElement(placed(20));
    expect(window.scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 })
    );
  });

  it("flashes the element when asked", () => {
    const el = placed(300);
    jumpToElement(el, { flash: true });
    expect(el.classList.contains("ob-flash")).toBe(true);
  });

  it("returns false and stays put without an element", () => {
    expect(jumpToElement(null)).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("moves focus to the element when asked, without scrolling again", () => {
    const el = placed(300);
    const focus = vi.spyOn(el, "focus");
    jumpToElement(el, { focus: true });
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(el);
  });

  it("leaves focus alone by default", () => {
    const el = placed(300);
    jumpToElement(el);
    expect(document.activeElement).not.toBe(el);
    expect(el.hasAttribute("tabindex")).toBe(false);
  });

  it("passes focusVisible on to the focus it moves", () => {
    const el = placed(300);
    const focus = vi.spyOn(el, "focus");
    jumpToElement(el, { focus: true, focusVisible: false });
    expect(focus).toHaveBeenCalledWith({
      preventScroll: true,
      focusVisible: false,
    });
  });
});

describe("focusElement", () => {
  it("makes a plain element focusable until focus leaves it", () => {
    const el = placed(0);
    const other = document.createElement("button");
    document.body.appendChild(other);

    expect(focusElement(el)).toBe(true);
    expect(el.getAttribute("tabindex")).toBe("-1");
    // Marked for index.css, which paints it no focus ring.
    expect(el.hasAttribute("data-jump-target")).toBe(true);
    expect(document.activeElement).toBe(el);

    other.focus();
    expect(document.activeElement).toBe(other);
    expect(el.hasAttribute("tabindex")).toBe(false);
    expect(el.hasAttribute("data-jump-target")).toBe(false);
  });

  it("shows no focus ring after a click or tap (focusVisible: false)", () => {
    const el = placed(0);
    const focus = vi.spyOn(el, "focus");
    focusElement(el, { focusVisible: false });
    expect(focus).toHaveBeenLastCalledWith({
      preventScroll: true,
      focusVisible: false,
    });
    // From the keyboard the browser decides, as before.
    el.blur();
    focusElement(el);
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(el);
  });

  it("is never outlined where index.css can see it", () => {
    const css = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8");
    expect(css).toMatch(/\[data-jump-target\]:focus\s*\{\s*outline: none;/);
  });

  it("keeps an element's own tabindex", () => {
    const el = placed(0);
    el.setAttribute("tabindex", "0");
    focusElement(el);
    expect(document.activeElement).toBe(el);
    // Its own focus style stands.
    expect(el.hasAttribute("data-jump-target")).toBe(false);
    document.body.focus();
    el.blur();
    expect(el.getAttribute("tabindex")).toBe("0");
  });

  it("focuses natively focusable elements as they are", () => {
    const link = document.createElement("a");
    link.href = "#x";
    document.body.appendChild(link);
    focusElement(link);
    expect(document.activeElement).toBe(link);
    expect(link.hasAttribute("tabindex")).toBe(false);
  });

  it("returns false without an element", () => {
    expect(focusElement(null)).toBe(false);
  });
});

describe("readingStartOf", () => {
  /* A <section> as SectionComp renders it: with a figure transition it
     opens with the dev markers around a 200vh spacer, then the number and
     the title. `spacerHeight` 0 is the spacer's display: none below 1024px. */
  function section({
    transition = true,
    markers = false,
    spacerHeight = 1600,
  } = {}) {
    const el = document.createElement("section");
    const add = (tag, className) => {
      const child = document.createElement(tag);
      child.className = className;
      el.appendChild(child);
      return child;
    };
    if (transition) {
      if (markers) add("div", "marker-start");
      const spacer = add("div", "section-transition-spacer h-[200vh]");
      spacer.getBoundingClientRect = () => ({
        top: 0,
        bottom: spacerHeight,
        height: spacerHeight,
        left: 0,
        right: 0,
        width: spacerHeight ? 600 : 0,
      });
      if (markers) add("div", "marker-end");
    }
    const number = add("h2", "TN");
    add("h2", "subChapter");
    document.body.appendChild(el);
    return { el, number };
  }

  it("lands past a transition's spacer, on what follows it", () => {
    const { el, number } = section();
    expect(readingStartOf(el)).toBe(number);
  });

  it("skips the dev trigger markers either side of it", () => {
    const { el, number } = section({ markers: true });
    expect(readingStartOf(el)).toBe(number);
  });

  it("is the element itself without a transition", () => {
    const { el } = section({ transition: false });
    expect(readingStartOf(el)).toBe(el);
  });

  it("is the element itself when the spacer takes no room (below 1024px)", () => {
    const { el } = section({ spacerHeight: 0 });
    expect(readingStartOf(el)).toBe(el);
  });

  it("is the element itself when nothing follows the spacer", () => {
    const { el } = section();
    el.querySelectorAll("h2").forEach((h) => h.remove());
    expect(readingStartOf(el)).toBe(el);
    expect(readingStartOf(null)).toBe(null);
  });
});

describe("scrollToY", () => {
  // A page 10000px tall (happy-dom lays nothing out).
  beforeEach(() => {
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 10000,
    });
  });
  afterEach(() => {
    delete root.scrollHeight;
  });
  const scrollEnd = (y) => {
    setViewport({ scrollY: y });
    window.dispatchEvent(new Event("scrollend"));
  };

  it("scrolls smoothly to the target", () => {
    expect(scrollToY(() => 1234.4)).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 1234,
      behavior: "smooth",
    });
  });

  it("does nothing for a target that isn't a number", () => {
    expect(scrollToY(() => NaN)).toBe(false);
    expect(scrollToY(() => undefined)).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("goes on when something stops it short, asking for the target again", () => {
    // ScrollTrigger.refresh() put the page back where it was mid-scroll.
    let target = 3000;
    scrollToY(() => target);
    target = 3100; // a figure above loaded meanwhile
    scrollEnd(1200);
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 3100,
      behavior: "smooth",
    });
    scrollEnd(3100);
    scrollEnd(500);
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  it("tries a few times at most", () => {
    scrollToY(() => 3000);
    for (let i = 0; i < 6; i++) scrollEnd(100);
    expect(window.scrollTo).toHaveBeenCalledTimes(4);
  });

  it("lets go when the reader scrolls", () => {
    scrollToY(() => 3000);
    window.dispatchEvent(new Event("wheel"));
    scrollEnd(1200);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("a new jump replaces the one landing", () => {
    scrollToY(() => 3000);
    scrollToY(() => 500);
    scrollEnd(100);
    expect(window.scrollTo.mock.calls.map((c) => c[0].top)).toEqual([
      3000, 500, 500,
    ]);
  });

  it("jumps once, instantly, when motion is reduced", () => {
    root.setAttribute("data-reduce-motion", "1");
    scrollToY(() => 3000);
    scrollEnd(100);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 3000,
      behavior: "auto",
    });
  });

  it("counts the bottom of the page as arrived", () => {
    Object.defineProperty(root, "scrollHeight", {
      configurable: true,
      value: 2800,
    });
    scrollToY(() => 3000); // past the end: the most it can is 2000
    scrollEnd(2000);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  it("lands an element that moved while the jump was cut short", () => {
    const el = placed(2000);
    jumpToElement(el);
    el.getBoundingClientRect = () => ({ top: 2400 - 900, height: 100 });
    scrollEnd(900);
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 2400 - 80,
      behavior: "smooth",
    });
  });
});

describe("jumpToId", () => {
  it("finds the anchor and jumps to it", () => {
    const el = placed(500);
    el.setAttribute("data-timeline-id", "break-1");
    expect(jumpToId("break-1", { flash: true })).toBe(true);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 420,
      behavior: "smooth",
    });
    expect(el.classList.contains("ob-flash")).toBe(true);
  });

  it("returns false for an id that isn't on the page", () => {
    expect(jumpToId("nowhere")).toBe(false);
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});

describe("jumpToElement and transition sections", () => {
  it("lands past a section's opening transition spacer when aligned to the top", () => {
    const section = document.createElement("section");
    const spacer = document.createElement("div");
    spacer.className = "section-transition-spacer";
    spacer.getBoundingClientRect = () => ({ top: 100, height: 1600 });
    const heading = document.createElement("h2");
    heading.getBoundingClientRect = () => ({ top: 1700, height: 40 });
    section.append(spacer, heading);
    section.getBoundingClientRect = () => ({ top: 100, height: 3000 });
    document.body.appendChild(section);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    jumpToElement(section, { align: "top" });
    const top = scrollTo.mock.calls.at(-1)?.[0]?.top;
    // The heading, not the spacer, lands below the top bar.
    expect(top).toBe(1700 - readerTopInset());
    scrollTo.mockRestore();
    section.remove();
  });
});
