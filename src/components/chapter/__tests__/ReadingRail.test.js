import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const fixtures = vi.hoisted(() => ({
  jump: vi.fn(() => true),
  reduced: false,
  listeners: new Map(),
}));
vi.mock("gsap/ScrollTrigger", () => ({
  default: {
    addEventListener: vi.fn((type, fn) => fixtures.listeners.set(type, fn)),
    removeEventListener: vi.fn((type) => fixtures.listeners.delete(type)),
  },
}));
vi.mock("@/helper/readerJump", () => ({
  jumpToElement: fixtures.jump,
  reducedMotionPreferred: () => fixtures.reduced,
}));
// The span is figureEnd's; here a trigger says where it ends (a scroll
// position, as figureEnd gives for a figure that holds) or keeps its
// paragraph's window.
vi.mock("@/helper/historyFigureTiming", async (original) => ({
  ...(await original()),
  figureEnd: (trigger) =>
    trigger.dataset.end ? Number(trigger.dataset.end) : "bottom 400",
}));

import ReadingRail from "../ReadingRail.vue";

const RECORDS = [
  { id: "animationFig1", title: "Skull", figureNumber: 1, placeholder: true },
  { id: "animationFig2", title: "Methods", figureNumber: 2, placeholder: true },
  { id: "animationLoewi", title: "Loewi", widgetId: "upload:loewi" },
  { id: "animationFilm", placeholder: true, youtubeID: "WgkAR-vrJpM" },
  { id: "animationWide", fullscreen: true },
  { id: "animationDragon" },
];

const HALF = 400; // half of an 800px window: the reading point
let wide = true;
const wrappers = [];

/** Give an element a place on the page (happy-dom has no layout). */
function place(el, top, height) {
  el.getBoundingClientRect = () => ({
    top,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    height,
  });
}

/** A reader with these triggers: [key, top, height, { end, box, active }]. */
function page(rows, bands = []) {
  document.body.innerHTML = `<div class="chapter-reader"><div id="container">
    <div class="reading-line is-on"></div>
    <main id="text"><section class="reader-section"></section></main>
  </div></div>`;
  const section = document.querySelector("section");
  for (const [key, top, height, extra = {}] of rows) {
    const host = extra.box ? document.createElement("div") : section;
    if (extra.box) {
      host.setAttribute("data-breakout-box", "x");
      section.append(host);
    }
    const el = document.createElement("span");
    el.id = `trigger${key}`;
    el.className = `animationTrigger${extra.active ? " active" : ""}`;
    if (extra.end !== undefined) el.dataset.end = String(extra.end);
    place(el, top, height);
    host.append(el);
  }
  for (const [top, height] of bands) {
    const band = document.createElement("div");
    band.className = "wb";
    place(band, top, height);
    section.append(band);
  }
}

async function mountRail(props = { records: RECORDS }) {
  const wrapper = mount(ReadingRail, {
    props,
    attachTo: document.getElementById("container"),
  });
  wrappers.push(wrapper);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(0);
  return wrapper;
}

/** What IllustrationsComp does when a figure comes on or goes off. */
async function toggle(key, on) {
  document.getElementById(`trigger${key}`).classList.toggle("active", on);
  await flushPromises();
  await vi.advanceTimersByTimeAsync(0);
}

const labels = (wrapper) =>
  wrapper.findAll(".rr-mark").map((mark) => mark.text());
const spans = (wrapper) =>
  wrapper
    .findAll(".rr-span")
    .map((span) => [span.element.style.top, span.element.style.height]);

beforeEach(() => {
  vi.useFakeTimers();
  wide = true;
  fixtures.reduced = false;
  fixtures.jump.mockClear();
  fixtures.listeners.clear();
  window.innerHeight = 2 * HALF;
  window.scrollY = 0;
  window.matchMedia = (query) => ({
    matches: wide,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the marks: one per figure the pane shows", () => {
  it("says what each paragraph brings into the pane, at its top", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationLoewi", 2000, 300],
      ["AnimationFilm", 3000, 300],
      ["AnimationDragon", 4000, 300],
    ]);
    const rail = await mountRail();
    expect(labels(rail)).toEqual(["FIG 01", "TRY IT", "WATCH", ""]);
    const marks = rail.findAll(".rr-mark");
    expect(marks.map((m) => m.element.style.top)).toEqual([
      "1000px",
      "2000px",
      "3000px",
      "4000px",
    ]);
    expect(marks.map((m) => m.attributes("aria-label"))).toEqual([
      "Figure 1: Skull, shown beside this paragraph",
      "Interactive: Loewi, shown beside this paragraph",
      "Video, shown beside this paragraph",
      "Figure, shown beside this paragraph",
    ]);
    expect(marks[3].classes()).toContain("rr-mark--plain");
    expect(rail.find("nav").attributes("aria-label")).toBe(
      "Figures beside the text"
    );
  });

  it("has none for a breakout's own figure, a full-screen figure or a trigger that matches nothing", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 1400, 300, { box: true }],
      ["AnimationWide", 2000, 300],
      ["AnimationPlaceholder", 3000, 300],
    ]);
    const rail = await mountRail();
    expect(labels(rail)).toEqual(["FIG 01"]);
  });

  it("draws nothing below the two-column reader", async () => {
    wide = false;
    page([["AnimationFig1", 1000, 300]]);
    const rail = await mountRail();
    expect(rail.find(".rr-mark").exists()).toBe(false);
    expect(rail.find(".rr-span").exists()).toBe(false);
    expect(rail.find(".reading-rail").exists()).toBe(true);
  });

  it("is one mark for a figure that stays beside the paragraphs that follow", async () => {
    page([
      ["AnimationLoewi", 1000, 300],
      ["AnimationLoewi", 1300, 500],
      ["AnimationLoewi", 1800, 200, { active: true }],
      ["AnimationFig1", 2600, 300],
      // The same widget again, later: a mark of its own.
      ["AnimationLoewi", 4000, 300],
    ]);
    const rail = await mountRail();
    expect(labels(rail)).toEqual(["TRY IT", "FIG 01", "TRY IT"]);
    // On for any of its paragraphs, with one ribbon over all three.
    expect(rail.findAll(".rr-mark")[0].attributes("data-showing")).toBe("");
    expect(spans(rail)).toEqual([["1000px", "1000px"]]);
  });

  it("draws only the paragraph's mark where a container's figure starts on the same line", async () => {
    page([
      ["AnimationFig1", 1000, 2000, { active: true }],
      ["AnimationFig2", 1000, 300],
    ]);
    const rail = await mountRail();
    expect(labels(rail)).toEqual(["FIG 02"]);
    // The container's figure is on: its ribbon is drawn all the same.
    expect(spans(rail)).toEqual([["1000px", "2000px"]]);
    expect(rail.find(".rr-mark").attributes("data-showing")).toBeUndefined();
  });
});

describe("the figure that is on", () => {
  it("fills its mark and runs a ribbon as far as the figure stays", async () => {
    page([
      // Holds until the next figure: figureEnd gives the scroll position
      // at which that reaches the reading point.
      ["AnimationFig1", 1000, 300, { end: 2000 - HALF }],
      ["AnimationFig2", 2000, 300],
    ]);
    const rail = await mountRail();
    expect(
      rail.find(".reading-rail").attributes("data-showing")
    ).toBeUndefined();
    expect(spans(rail)).toEqual([]);

    await toggle("AnimationFig1", true);
    const [first, second] = rail.findAll(".rr-mark");
    expect(first.attributes("data-showing")).toBe("");
    expect(first.attributes("aria-current")).toBe("true");
    expect(second.attributes("data-showing")).toBeUndefined();
    expect(rail.find(".reading-rail").attributes("data-showing")).toBe(
      "figure"
    );
    expect(spans(rail)).toEqual([["1000px", "1000px"]]);
    expect(rail.find(".rr-span").classes()).toContain("rr-span--foot");

    // Its paragraph's window when it does not hold.
    await toggle("AnimationFig1", false);
    await toggle("AnimationFig2", true);
    expect(spans(rail)).toEqual([["2000px", "300px"]]);
    expect(rail.findAll(".rr-mark")[1].attributes("data-showing")).toBe("");

    await toggle("AnimationFig2", false);
    expect(spans(rail)).toEqual([]);
    expect(rail.find("[data-showing]").exists()).toBe(false);
  });

  it("is the last active trigger, as in the pane", async () => {
    page([
      ["AnimationFig1", 1000, 3000, { active: true }],
      ["AnimationFig2", 1500, 300, { active: true }],
    ]);
    const rail = await mountRail();
    const [first, second] = rail.findAll(".rr-mark");
    expect(first.attributes("data-showing")).toBeUndefined();
    expect(second.attributes("data-showing")).toBe("");
    await toggle("AnimationFig2", false);
    expect(rail.findAll(".rr-mark")[0].attributes("data-showing")).toBe("");
  });

  it("shows nothing while a trigger without a mark has the pane", async () => {
    page([
      ["AnimationFig1", 1000, 3000, { active: true }],
      ["AnimationWide", 1500, 300, { active: true }],
    ]);
    const rail = await mountRail();
    expect(rail.find("[data-showing]").exists()).toBe(false);
  });

  it("breaks the ribbon where a full-width band covers the line", async () => {
    page([["AnimationFig1", 1000, 2000, { active: true }]], [[1500, 400]]);
    const rail = await mountRail();
    expect(spans(rail)).toEqual([
      ["1000px", "500px"],
      ["1900px", "1100px"],
    ]);
    // The foot closes the last piece only.
    const feet = rail
      .findAll(".rr-span")
      .map((span) => span.classes().includes("rr-span--foot"));
    expect(feet).toEqual([false, true]);
  });

  it("measures again when the page's layout is refreshed", async () => {
    page([["AnimationFig1", 1000, 300]]);
    const rail = await mountRail();
    place(document.getElementById("triggerAnimationFig1"), 1240, 300);
    fixtures.listeners.get("refresh")();
    await vi.advanceTimersByTimeAsync(100);
    expect(rail.find(".rr-mark").element.style.top).toBe("1240px");
  });
});

describe("a mark is a control", () => {
  it("brings its paragraph to the reading point, a hair past its top", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 2000, 300],
    ]);
    const rail = await mountRail();
    await rail.findAll(".rr-mark")[1].trigger("click");
    expect(fixtures.jump).toHaveBeenCalledTimes(1);
    const [anchor, options] = fixtures.jump.mock.calls[0];
    expect(anchor).toBe(rail.find(".rr-landing").element);
    expect(anchor.style.top).toBe("2002px");
    expect(options).toEqual({ align: "reading-line" });
  });

  it("is one tab stop: the figure that is on, else the first", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 2000, 300],
      ["AnimationLoewi", 3000, 300],
    ]);
    const rail = await mountRail();
    const stops = () =>
      rail.findAll(".rr-mark").map((mark) => mark.attributes("tabindex"));
    expect(stops()).toEqual(["0", "-1", "-1"]);
    await toggle("AnimationFig2", true);
    expect(stops()).toEqual(["-1", "0", "-1"]);
  });

  it("walks the figures with the arrow keys, each brought to the reading point", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 2000, 300],
      ["AnimationLoewi", 3000, 300],
    ]);
    const rail = await mountRail();
    const marks = rail.findAll(".rr-mark");
    marks[0].element.focus();
    await marks[0].trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(document.activeElement).toBe(marks[1].element);
    expect(marks[1].attributes("tabindex")).toBe("0");
    expect(fixtures.jump.mock.calls[0][0].style.top).toBe("2002px");

    await marks[1].trigger("keydown", { key: "End" });
    await flushPromises();
    expect(document.activeElement).toBe(marks[2].element);
    // Nowhere further: no second jump to the same figure.
    fixtures.jump.mockClear();
    await marks[2].trigger("keydown", { key: "ArrowDown" });
    await flushPromises();
    expect(fixtures.jump).not.toHaveBeenCalled();
    // Other keys are the page's.
    const event = new KeyboardEvent("keydown", {
      key: " ",
      cancelable: true,
      bubbles: true,
    });
    marks[2].element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("the pulse at the reading point", () => {
  const animate = vi.fn(() => ({ playState: "running", cancel: vi.fn() }));
  beforeEach(() => {
    animate.mockClear();
    HTMLElement.prototype.animate = animate;
  });
  afterEach(() => {
    delete HTMLElement.prototype.animate;
  });

  it("plays once when the pane changes, and not again while it runs", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 2000, 300],
    ]);
    await mountRail();
    await vi.advanceTimersByTimeAsync(1600);
    await toggle("AnimationFig1", true);
    // The ring and the beam.
    expect(animate).toHaveBeenCalledTimes(2);
    await toggle("AnimationFig1", false);
    await toggle("AnimationFig2", true);
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it("waits until the page has settled", async () => {
    page([["AnimationFig1", 1000, 300]]);
    await mountRail();
    await toggle("AnimationFig1", true);
    expect(animate).not.toHaveBeenCalled();
  });

  it("never plays under reduced motion, or while the reading point is off", async () => {
    page([
      ["AnimationFig1", 1000, 300],
      ["AnimationFig2", 2000, 300],
    ]);
    await mountRail();
    await vi.advanceTimersByTimeAsync(1600);
    fixtures.reduced = true;
    await toggle("AnimationFig1", true);
    expect(animate).not.toHaveBeenCalled();

    fixtures.reduced = false;
    document.querySelector(".reading-line").classList.remove("is-on");
    await toggle("AnimationFig1", false);
    await toggle("AnimationFig2", true);
    expect(animate).not.toHaveBeenCalled();
  });
});
