import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { flushPromises } from "@vue/test-utils";

const apiRequest = vi.hoisted(() => vi.fn());
const scrollTrigger = vi.hoisted(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

vi.mock("@/services/api/client", () => ({ apiRequest }));
vi.mock("gsap/ScrollTrigger", () => ({
  ScrollTrigger: scrollTrigger,
  default: scrollTrigger,
}));

import { useChapterTimeline } from "@/composables/useChapterTimeline";
import { scrollYForIndex } from "@/helper/chapterTimeline";
import { readerTopInset } from "@/helper/readerJump";

/* ---- A small chapter --------------------------------------------------
   Items: 0 p1 (intro), 1 p2, 2 w1 (widget), 3 p3 (section 1), 4 p4 (section 2) */
const words = (n) =>
  `<p>${Array.from({ length: n }, () => "word").join(" ")}</p>`;

function chapter() {
  return {
    intro: [
      {
        id: "intro",
        sectionTitle: "Introduction",
        paragraphs: [{ id: "p1", text: words(40) }],
      },
    ],
    sections: [
      {
        id: "s1",
        title: "Light and the eye",
        paragraphs: [
          { id: "p2", text: words(80) },
          {
            id: "w1",
            type: "widget",
            widget: { widgetId: "sdt", title: "Signal detection" },
          },
          { id: "p3", text: words(20) },
        ],
      },
      {
        id: "s2",
        title: "Photoreceptors",
        paragraphs: [{ id: "p4", text: words(60) }],
      },
    ],
  };
}

/* ---- Page geometry ----------------------------------------------------
   Each anchor is 400px tall; tops are in document space and the stubbed
   rect follows window.scrollY. */
const view = { y: 0, h: 1000 };
const geometry = new Map();

function place(id, top, { height = 400, attr = "id" } = {}) {
  geometry.set(id, { top, height });
  const el = document.createElement("div");
  if (attr === "id") el.id = id;
  else el.setAttribute(attr, id);
  el.getBoundingClientRect = () => {
    const g = geometry.get(id);
    // display: none — no box, an all-zero rect.
    if (g.hidden)
      return {
        top: 0,
        bottom: 0,
        height: 0,
        y: 0,
        left: 0,
        right: 0,
        width: 0,
        x: 0,
      };
    const top = g.top - view.y;
    return {
      top,
      bottom: top + g.height,
      height: g.height,
      y: top,
      left: 0,
      right: 0,
      width: 0,
      x: 0,
    };
  };
  document.body.appendChild(el);
  return el;
}

function renderChapter() {
  place("p1", 100);
  place("p2", 500);
  place("w1", 900, { attr: "data-timeline-id" });
  place("p3", 1300);
  place("p4", 1700); // bottom 2100
}

/* ---- Frames and observers --------------------------------------------- */
const frames = new Map();
let frameId = 0;
let raf;
let caf;
function flushFrames() {
  const due = [...frames.values()];
  frames.clear();
  due.forEach((cb) => cb(0));
}

const observers = [];
class FakeResizeObserver {
  constructor(cb) {
    this.cb = cb;
    this.observe = vi.fn();
    this.disconnect = vi.fn();
    observers.push(this);
  }
}

function scrollTo(y) {
  view.y = y;
  window.dispatchEvent(new Event("scroll"));
}

/* ---- Harness ----------------------------------------------------------- */
let scope;

function setup(overrides = {}) {
  const opts = {
    text: ref(chapter()),
    moduleId: ref(null),
    highlights: ref([]),
    notes: ref([]),
    enabled: ref(true),
    ...overrides,
  };
  scope = effectScope();
  const api = scope.run(() => useChapterTimeline(opts));
  return { ...opts, ...api };
}

async function settle() {
  await flushPromises();
  await nextTick();
  flushFrames();
}

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue([]);
  scrollTrigger.addEventListener.mockClear();
  scrollTrigger.removeEventListener.mockClear();
  frames.clear();
  raf = vi.fn((cb) => {
    frameId += 1;
    frames.set(frameId, cb);
    return frameId;
  });
  caf = vi.fn((id) => frames.delete(id));
  observers.length = 0;
  geometry.clear();
  view.y = 0;
  view.h = 1000;
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", caf);
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    get: () => view.y,
  });
  Object.defineProperty(window, "pageYOffset", {
    configurable: true,
    get: () => view.y,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    get: () => view.h,
  });
  document.body.innerHTML = "";
  document.documentElement.setAttribute("data-reduce-motion", "0");
});

afterEach(() => {
  scope?.stop();
  scope = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-reduce-motion");
});

/* ---- Tests ------------------------------------------------------------- */

describe("useChapterTimeline: model", () => {
  it("builds the timeline with the chapter's section labels", () => {
    const { model } = setup();
    expect(model.value.items.map((i) => i.id)).toEqual([
      "p1",
      "p2",
      "w1",
      "p3",
      "p4",
    ]);
    expect(model.value.sections.map((s) => [s.key, s.label])).toEqual([
      ["intro", ""],
      ["s1", "1"],
      ["s2", "2"],
    ]);
  });

  it("is an empty model while there is no chapter", () => {
    const { model, position } = setup({ text: ref(null) });
    expect(model.value.items).toEqual([]);
    expect(model.value.byId.size).toBe(0);
    expect(position.value).toBe(0);
  });
});

describe("useChapterTimeline: layers", () => {
  it("keeps only this chapter's highlights, in reading order", () => {
    const highlights = ref([
      {
        id: "h2",
        paragraph_id: "p2",
        color: "blue",
        selected_text: "later",
        start_offset: 40,
      },
      {
        id: "h1",
        paragraph_id: "p2",
        color: "green",
        selected_text: "earlier",
        start_offset: 3,
      },
      { id: "hx", paragraph_id: "another-chapter", selected_text: "elsewhere" },
      { id: "h0", paragraph_id: null, selected_text: "orphan" },
      { id: "h4", paragraph_id: "p4", selected_text: "no colour" },
    ]);
    const { layers } = setup({ highlights });

    expect([...layers.value.highlights.keys()]).toEqual([1, 4]);
    expect(layers.value.highlights.get(1)).toEqual([
      { id: "h1", color: "green", text: "earlier" },
      { id: "h2", color: "blue", text: "later" },
    ]);
    // useHighlights' default colour when a row has none.
    expect(layers.value.highlights.get(4)).toEqual([
      { id: "h4", color: "yellow", text: "no colour" },
    ]);
  });

  it("places notes by their paragraph or their highlight's, dropping other chapters'", () => {
    const notes = ref([
      { id: "n1", paragraph_id: "p3", content: "Check the fovea" },
      { id: "n2", paragraph_id: null, highlight: { paragraph_id: "p4" } },
      { id: "n3", paragraph_id: "another-chapter", content: "elsewhere" },
      { id: "n4", highlight: { paragraph_id: "nope" }, content: "x" },
    ]);
    const { layers } = setup({ notes });

    expect([...layers.value.notes.keys()]).toEqual([3, 4]);
    expect(layers.value.notes.get(3)).toEqual([
      { id: "n1", content: "Check the fovea" },
    ]);
    expect(layers.value.notes.get(4)).toEqual([{ id: "n2", content: "" }]);
  });

  it("follows the highlight and note lists as they change", async () => {
    const highlights = ref([]);
    const notes = ref([]);
    const { layers } = setup({ highlights, notes });
    expect(layers.value.highlights.size).toBe(0);

    highlights.value = [
      { id: "h1", paragraph_id: "p1", color: "pink", selected_text: "a" },
    ];
    notes.value = [{ id: "n1", paragraph_id: "p1", content: "b" }];
    await nextTick();

    expect(layers.value.highlights.get(0)).toHaveLength(1);
    expect(layers.value.notes.get(0)).toHaveLength(1);
  });
});

describe("useChapterTimeline: trending", () => {
  it("fetches the module's trending rows and maps them by paragraph id", async () => {
    apiRequest.mockResolvedValue([
      { paragraph_id: "p2", selected_text: "rods", highlight_count: 3 },
      { paragraph_id: "p4", selected_text: "cones", highlight_count: 12 },
      { paragraph_id: "p2", selected_text: "rhodopsin", highlight_count: 9 },
      { paragraph_id: "elsewhere", selected_text: "x", highlight_count: 40 },
    ]);
    const { layers } = setup({ moduleId: ref("mod 1/ä") });
    await flushPromises();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(
      "trending_highlights?select=paragraph_id,selected_text,highlight_count," +
        "paragraph:paragraphs!inner(section:sections!section_id!inner(module_id))" +
        "&paragraph.section.module_id=eq.mod%201%2F%C3%A4" +
        "&order=highlight_count.desc&limit=200"
    );
    expect([...layers.value.trending.keys()].sort()).toEqual([1, 4]);
    // Most-highlighted first within a paragraph.
    expect(layers.value.trending.get(1)).toEqual([
      { text: "rhodopsin", count: 9 },
      { text: "rods", count: 3 },
    ]);
    expect(layers.value.trending.get(4)).toEqual([
      { text: "cones", count: 12 },
    ]);
  });

  it("refetches when the module changes and clears without one", async () => {
    apiRequest.mockResolvedValueOnce([
      { paragraph_id: "p1", selected_text: "a", highlight_count: 2 },
    ]);
    const moduleId = ref("m1");
    const { layers } = setup({ moduleId });
    await flushPromises();
    expect(layers.value.trending.size).toBe(1);

    apiRequest.mockResolvedValueOnce([]);
    moduleId.value = "m2";
    await flushPromises();
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][0]).toContain("module_id=eq.m2");
    expect(layers.value.trending.size).toBe(0);

    moduleId.value = null;
    await flushPromises();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it("does not fetch without a module", async () => {
    setup({ moduleId: ref(null) });
    await flushPromises();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("refreshTrending fetches the current module again", async () => {
    const { layers, refreshTrending } = setup({ moduleId: ref("m1") });
    await flushPromises();
    expect(layers.value.trending.size).toBe(0);

    // A reader shared a highlight: the passage now counts.
    apiRequest.mockResolvedValueOnce([
      { paragraph_id: "p3", selected_text: "fovea", highlight_count: 1 },
    ]);
    await refreshTrending();
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(apiRequest.mock.calls[1][0]).toContain("module_id=eq.m1");
    expect(layers.value.trending.get(3)).toEqual([{ text: "fovea", count: 1 }]);
  });

  it("a failing fetch leaves the lane empty without a console error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    apiRequest.mockRejectedValue(new Error("401 Unauthorized"));
    const { layers } = setup({ moduleId: ref("m1") });
    await flushPromises();

    expect(layers.value.trending.size).toBe(0);
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});

describe("useChapterTimeline: position", () => {
  it("measures after the content renders and follows the scroll", async () => {
    renderChapter();
    const { position } = setup();
    expect(position.value).toBe(0);
    await settle();

    // Reading line at 0 + 1000 × 0.4 = 400: between p1 (100) and p2 (500).
    expect(position.value).toBeCloseTo(0.75);

    scrollTo(700); // 1100: halfway from w1 (900) to p3 (1300)
    flushFrames();
    expect(position.value).toBeCloseTo(2.5);

    scrollTo(1600); // 2000: in p4, which ends at 2100
    flushFrames();
    expect(position.value).toBeCloseTo(4.75);

    scrollTo(1800); // past the end
    flushFrames();
    expect(position.value).toBe(5);
  });

  it("throttles scroll handling to one update a frame", async () => {
    renderChapter();
    const { position } = setup();
    await settle();
    raf.mockClear();

    scrollTo(100);
    scrollTo(300);
    scrollTo(700);
    expect(raf).toHaveBeenCalledTimes(1);
    expect(position.value).toBeCloseTo(0.75); // not until the frame
    flushFrames();
    expect(position.value).toBeCloseTo(2.5);
  });

  it("stays at 0 when no item is on the page yet", async () => {
    const { position } = setup();
    await settle();
    scrollTo(5000);
    flushFrames();
    expect(position.value).toBe(0);
  });

  it("treats a missing anchor as no further than the one before", async () => {
    place("p1", 100);
    place("p2", 500);
    // w1 has no element (a widget not rendered)
    place("p3", 1300);
    place("p4", 1700);
    const { position } = setup();
    await settle();
    scrollTo(700); // 1100: w1 takes p2's top, so this is in w1 toward p3
    flushFrames();
    expect(position.value).toBeCloseTo(2 + 600 / 800);
  });

  it("treats an anchor with no box (display: none) as missing", async () => {
    renderChapter();
    geometry.get("w1").hidden = true;
    view.y = 1400;
    view.h = 500;
    const { position } = setup();
    await settle();
    // Reading line 1600, in p3 (1300..1700). w1's all-zero rect would have
    // put its top at 1400 and stretched p3 to start there (3.67).
    expect(position.value).toBeCloseTo(3 + 300 / 400);
  });

  it("re-measures on resize", async () => {
    renderChapter();
    const { position } = setup();
    await settle();
    expect(position.value).toBeCloseTo(0.75);

    geometry.get("p1").top = 300; // the page reflowed: p1 now 300..500
    window.dispatchEvent(new Event("resize"));
    flushFrames();
    expect(position.value).toBeCloseTo(0.5);
  });

  it("re-measures when #text resizes", async () => {
    const main = document.createElement("main");
    main.id = "text";
    document.body.appendChild(main);
    renderChapter();
    const { position } = setup();
    await settle();

    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledWith(main);

    geometry.get("p1").top = 300;
    observers[0].cb([]);
    flushFrames();
    expect(position.value).toBeCloseTo(0.5);
  });

  it("re-measures on ScrollTrigger refresh", async () => {
    renderChapter();
    const { position } = setup();
    await settle();

    expect(scrollTrigger.addEventListener).toHaveBeenCalledWith(
      "refresh",
      expect.any(Function)
    );
    const onRefresh = scrollTrigger.addEventListener.mock.calls[0][1];
    geometry.get("p1").top = 300;
    onRefresh();
    flushFrames();
    expect(position.value).toBeCloseTo(0.5);
  });

  it("re-measures when the chapter changes", async () => {
    renderChapter();
    const text = ref(chapter());
    const { position, model } = setup({ text });
    await settle();
    expect(position.value).toBeCloseTo(0.75);

    // Another chapter: two paragraphs, already on the page.
    place("q1", 0);
    place("q2", 200);
    text.value = {
      sections: [
        {
          id: "t1",
          title: "Only",
          paragraphs: [
            { id: "q1", text: words(5) },
            { id: "q2", text: words(5) },
          ],
        },
      ],
    };
    await settle();
    expect(model.value.items).toHaveLength(2);
    // Reading line 400, in q2 (200..600): 1 + 200/400.
    expect(position.value).toBeCloseTo(1.5);
  });

  it("measures and listens only while enabled", async () => {
    renderChapter();
    const add = vi.spyOn(window, "addEventListener");
    const enabled = ref(false);
    const { position } = setup({ enabled });
    await settle();

    expect(add).not.toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    expect(scrollTrigger.addEventListener).not.toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
    expect(position.value).toBe(0);

    enabled.value = true;
    await settle();
    expect(add).toHaveBeenCalledWith("scroll", expect.any(Function), {
      passive: true,
    });
    expect(position.value).toBeCloseTo(0.75);

    enabled.value = false;
    await nextTick();
    scrollTo(700);
    expect(frames.size).toBe(0);
    expect(position.value).toBeCloseTo(0.75);
  });

  it("measure() reads the page on demand", () => {
    renderChapter();
    const { position, measure } = setup({ enabled: ref(false) });
    view.y = 700;
    measure();
    expect(position.value).toBeCloseTo(2.5);
  });

  it("drops stale tops when the chapter changes while disabled", () => {
    renderChapter();
    const text = ref(chapter());
    const { position, measure } = setup({ text, enabled: ref(false) });
    view.y = 700;
    measure();
    expect(position.value).toBeCloseTo(2.5);

    text.value = { sections: [] };
    return nextTick().then(() => expect(position.value).toBe(0));
  });
});

describe("useChapterTimeline: jumpTo", () => {
  it("scrolls the item under the top bar and flashes it", async () => {
    renderChapter();
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo(3);
    const tops = [100, 500, 900, 1300, 1700];
    expect(scroll).toHaveBeenCalledWith({
      top: scrollYForIndex(tops, 3, readerTopInset()),
      behavior: "smooth",
    });
    expect(scroll.mock.calls[0][0].top).toBe(1300 - readerTopInset());
    expect(document.getElementById("p3").classList.contains("ob-flash")).toBe(
      true
    );
  });

  it("finds widgets by data-timeline-id and measures fresh tops", async () => {
    renderChapter();
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    // Layout moved since the last measure (a figure above loaded).
    geometry.get("w1").top = 1000;
    geometry.get("p3").top = 1400;
    jumpTo(2);
    expect(scroll.mock.calls[0][0].top).toBe(1000 - readerTopInset());
    expect(
      document
        .querySelector('[data-timeline-id="w1"]')
        .classList.contains("ob-flash")
    ).toBe(true);
  });

  it("jumps without smooth scrolling under reduced motion", async () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    renderChapter();
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo(0);
    expect(scroll).toHaveBeenCalledWith({
      top: Math.max(0, 100 - readerTopInset()),
      behavior: "auto",
    });
  });

  it("moves focus to the item it lands on", async () => {
    renderChapter();
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo(3);
    const p3 = document.getElementById("p3");
    expect(document.activeElement).toBe(p3);
    // Focusable only while it has focus.
    expect(p3.getAttribute("tabindex")).toBe("-1");
    p3.blur();
    expect(p3.hasAttribute("tabindex")).toBe(false);
  });

  it("lands on a section's anchor when it is on the page", async () => {
    renderChapter();
    // The section element starts above its first paragraph (its heading).
    const section = place("s2", 1640, { height: 460 });
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo({ index: 4, anchorId: "s2" });
    expect(scroll).toHaveBeenCalledWith({
      top: 1640 - readerTopInset(),
      behavior: "smooth",
    });
    expect(document.activeElement).toBe(section);
    // The whole section doesn't flash; nor does its first paragraph.
    expect(section.classList.contains("ob-flash")).toBe(false);
    expect(document.getElementById("p4").classList.contains("ob-flash")).toBe(
      false
    );
  });

  it("lands past a section's opening transition spacer, on its heading", async () => {
    renderChapter();
    // From 1024px a section whose first paragraph runs a figure transition
    // opens with a 200vh spacer (SectionComp): its heading is 1600px down.
    const section = place("s2", 100);
    const spacer = place("s2-spacer", 100, { height: 1600 });
    spacer.removeAttribute("id");
    spacer.className = "section-transition-spacer";
    const heading = place("s2-number", 1700, { height: 56 });
    heading.removeAttribute("id");
    section.append(spacer, heading);
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo({ index: 4, anchorId: "s2" });
    expect(scroll).toHaveBeenCalledWith({
      top: 1700 - readerTopInset(),
      behavior: "smooth",
    });
    expect(document.activeElement).toBe(heading);
  });

  it("shows no focus ring after a click or tap", async () => {
    renderChapter();
    const section = place("s2", 1640, { height: 460 });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();
    const p3 = document.getElementById("p3");
    const toItem = vi.spyOn(p3, "focus");
    const toAnchor = vi.spyOn(section, "focus");

    jumpTo(3, { pointer: true });
    expect(toItem).toHaveBeenLastCalledWith({
      preventScroll: true,
      focusVisible: false,
    });
    jumpTo({ index: 4, anchorId: "s2" }, { pointer: true });
    expect(toAnchor).toHaveBeenLastCalledWith({
      preventScroll: true,
      focusVisible: false,
    });

    // From the keyboard the browser decides.
    jumpTo(3);
    expect(toItem).toHaveBeenLastCalledWith({ preventScroll: true });
  });

  it("falls back to the item when the anchor isn't on the page", async () => {
    renderChapter();
    place("s2-hidden", 0);
    geometry.get("s2-hidden").hidden = true;
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();

    jumpTo({ index: 4, anchorId: "missing" });
    jumpTo({ index: 4, anchorId: "s2-hidden" });
    jumpTo({ index: 4, anchorId: null });
    expect(scroll.mock.calls.map((c) => c[0].top)).toEqual([
      1700 - readerTopInset(),
      1700 - readerTopInset(),
      1700 - readerTopInset(),
    ]);
    expect(document.activeElement).toBe(document.getElementById("p4"));
  });

  it("does nothing for an unknown index or an empty page", async () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { jumpTo } = setup();
    await settle();
    jumpTo(2); // nothing rendered
    jumpTo(99);
    jumpTo(-1);
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("useChapterTimeline: cleanup", () => {
  it("removes every listener when its scope is disposed", async () => {
    const main = document.createElement("main");
    main.id = "text";
    document.body.appendChild(main);
    renderChapter();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    setup();
    await settle();

    const added = (type) => add.mock.calls.find((c) => c[0] === type)?.[1];
    const onScroll = added("scroll");
    const onResize = added("resize");
    expect(onScroll).toBeTypeOf("function");
    expect(onResize).toBeTypeOf("function");

    scrollTo(300); // a frame pending at dispose
    expect(frames.size).toBe(1);

    scope.stop();
    scope = null;

    expect(remove).toHaveBeenCalledWith("scroll", onScroll);
    expect(remove).toHaveBeenCalledWith("resize", onResize);
    expect(scrollTrigger.removeEventListener).toHaveBeenCalledWith(
      "refresh",
      scrollTrigger.addEventListener.mock.calls[0][1]
    );
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(caf).toHaveBeenCalled();
    expect(frames.size).toBe(0);

    raf.mockClear();
    scrollTo(900);
    window.dispatchEvent(new Event("resize"));
    expect(raf).not.toHaveBeenCalled();
  });

  it("does not start listening after disposal from a pending render", async () => {
    renderChapter();
    const add = vi.spyOn(window, "addEventListener");
    setup();
    scope.stop(); // before the post-render measure runs
    scope = null;
    await settle();
    expect(raf).not.toHaveBeenCalled();
    expect(add.mock.calls.filter((c) => c[0] === "scroll")).toHaveLength(1);
    expect(observers).toHaveLength(0);
  });
});
