import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { nextTick } from "vue";
import ChapterTimeline from "@/components/chapter/timeline/ChapterTimeline.vue";
import { REST_H, PEEK_H } from "@/helper/chapterTimeline";
import {
  stubBarsWidth,
  testBars,
  testLayers,
  testModel,
} from "./timelineTestModel";

vi.mock("@/widgets/thumbnails", () => ({ widgetThumb: () => null }));

const WIDTH = 800;
let restoreWidth;
let wrapper;

function mountTimeline(props = {}) {
  wrapper = mount(ChapterTimeline, {
    props: {
      model: testModel(),
      position: 2.5,
      readPercent: 42,
      chapterTitle: "The Eye",
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}

const dock = () => wrapper.get('[data-testid="chapter-timeline"]');
const slider = () => wrapper.get('[role="slider"]');
const isOpen = () => dock().classes().includes("is-open");
const live = () => wrapper.get('[aria-live="polite"]').text();
const press = (key, opts = {}) => slider().trigger("keydown", { key, ...opts });
const preview = () => wrapper.find('[data-testid="timeline-preview"]');
const mapButton = () => wrapper.get('button[aria-label="Open chapter map"]');
const dialog = () => document.querySelector('[role="dialog"]');

/** Click the map button and wait for the map (loaded on first open). */
async function openMap() {
  await mapButton().trigger("click");
  await vi.waitFor(() => {
    if (!dialog()) throw new Error("no map yet");
  });
  await flushPromises();
  return dialog();
}

/** A press of the pointer inside the map (teleported out of the dock). */
function pressInMap(el, pointerType = "mouse") {
  el.dispatchEvent(
    new window.PointerEvent("pointerdown", { bubbles: true, pointerType })
  );
}

/** The x (in the bars) of item `index`'s bar centre at the stubbed width. */
function centerOf(index) {
  const bar = testBars(testModel(), WIDTH).find(
    (b) => b.from <= index && index < b.to
  );
  return bar.x + bar.w / 2;
}

beforeEach(() => {
  restoreWidth = stubBarsWidth(WIDTH);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  restoreWidth();
  document.body.innerHTML = "";
});

describe("ChapterTimeline — slider", () => {
  it("is a labelled slider with the read percent and the current section", () => {
    mountTimeline();
    const s = slider();
    expect(s.attributes("tabindex")).toBe("0");
    expect(s.attributes("aria-label")).toBe("Chapter timeline");
    expect(s.attributes("aria-valuemin")).toBe("0");
    expect(s.attributes("aria-valuemax")).toBe("100");
    expect(s.attributes("aria-valuenow")).toBe("42");
    expect(s.attributes("aria-valuetext")).toBe("42% read · 1 Photoreceptors");
    expect(wrapper.find("svg").attributes("aria-hidden")).toBe("true");
  });

  it("rounds the percent and names the intro by its title", async () => {
    mountTimeline({ position: 0.4, readPercent: 3.6 });
    expect(slider().attributes("aria-valuenow")).toBe("4");
    expect(slider().attributes("aria-valuetext")).toBe("4% read · The Eye");
    expect(dock().text()).toContain("4%");
  });

  it("moves a cursor with the keys and jumps to it on Enter", async () => {
    mountTimeline();
    await slider().trigger("focusin");
    expect(isOpen()).toBe(true);

    // Focus starts the cursor on the item being read (p2, index 2).
    expect(wrapper.find('[data-testid="timeline-preview"]').text()).toContain(
      "Rods"
    );

    await press("ArrowRight");
    expect(live()).toBe(
      "Section 1, Photoreceptors: paragraph 4 of 8. Widget: Colour vision."
    );
    await press("ArrowRight");
    expect(live()).toContain("paragraph 5 of 8.");
    await press("ArrowLeft");
    expect(live()).toContain("paragraph 4 of 8.");
    await press("End");
    expect(live()).toBe("Section 2, Circuits: paragraph 8 of 8.");
    await press("Home");
    expect(live()).toBe("Introduction, The Eye: paragraph 1 of 8.");
    await press("PageDown");
    expect(live()).toContain("Section 1, Photoreceptors: paragraph 3 of 8.");
    await press("PageDown");
    expect(live()).toContain("Section 2, Circuits: paragraph 6 of 8.");
    await press("ArrowRight");
    expect(live()).toContain("paragraph 7 of 8. Video: Tom Baden.");
    await press("PageUp"); // back to the start of this section
    expect(live()).toContain("paragraph 6 of 8.");
    await press("PageUp"); // then the previous section
    expect(live()).toContain("paragraph 3 of 8. Figure: Rods and cones.");
    await press("ArrowRight");

    await press("Enter");
    // From the keyboard: the browser decides the landing's focus ring.
    expect(wrapper.emitted("jump")).toEqual([[3, { pointer: false }]]);
  });

  it("keeps the cursor inside the chapter", async () => {
    mountTimeline({ position: 0 });
    await slider().trigger("focusin");
    await press("ArrowLeft");
    expect(live()).toContain("paragraph 1 of 8.");
    await press("End");
    await press("ArrowRight");
    expect(live()).toContain("paragraph 8 of 8.");
    await press("PageDown");
    expect(live()).toContain("paragraph 8 of 8.");
  });

  it("doesn't take focus from a mouse press or a tap", () => {
    mountTimeline();
    const down = new window.MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    slider().element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it("holds its value still while a jump scrolls", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb) => cb(0));
    try {
      mountTimeline();
      await slider().trigger("focusin");
      await press("End");
      await press("Enter");
      expect(wrapper.emitted("jump")).toEqual([[7, { pointer: false }]]);

      // The smooth scroll passes section 2 on its way.
      await wrapper.setProps({ position: 5.2, readPercent: 70 });
      await wrapper.setProps({ position: 7.4, readPercent: 96 });
      expect(slider().attributes("aria-valuenow")).toBe("42");
      expect(slider().attributes("aria-valuetext")).toBe(
        "42% read · 1 Photoreceptors"
      );

      window.dispatchEvent(new Event("scrollend"));
      await nextTick();
      expect(slider().attributes("aria-valuenow")).toBe("96");
      expect(slider().attributes("aria-valuetext")).toBe(
        "96% read · 2 Circuits"
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("lets its value go if the scroll never reports its end", async () => {
    vi.useFakeTimers();
    try {
      mountTimeline();
      await slider().trigger("focusin");
      await press("Enter");
      await wrapper.setProps({ position: 6.5, readPercent: 80 });
      expect(slider().attributes("aria-valuenow")).toBe("42");
      vi.advanceTimersByTime(1500);
      await nextTick();
      expect(slider().attributes("aria-valuenow")).toBe("80");
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads the reader's marks and trending on the cursor's bar", async () => {
    mountTimeline({ layers: testLayers() });
    await slider().trigger("focusin");
    await press("ArrowLeft");
    await press("ArrowRight"); // p2: a highlight and a note
    expect(live()).toContain("1 highlight of yours. 1 note.");
    await press("PageDown"); // p4: trending
    expect(live()).toContain("12 readers highlighted this.");
  });
});

describe("ChapterTimeline — peek", () => {
  it("opens on keyboard focus and closes on Escape", async () => {
    mountTimeline();
    expect(isOpen()).toBe(false);
    expect(dock().attributes("style")).toContain(`height: ${REST_H}px`);

    await slider().trigger("focusin");
    expect(isOpen()).toBe(true);
    expect(dock().attributes("style")).toContain(`height: ${PEEK_H}px`);

    await slider().trigger("keydown", { key: "Escape" });
    expect(isOpen()).toBe(false);
    expect(wrapper.find('[data-testid="timeline-preview"]').exists()).toBe(
      false
    );
  });

  it("opens while a mouse is over it and closes when it leaves", async () => {
    mountTimeline();
    await dock().trigger("pointerenter", { pointerType: "mouse" });
    expect(isOpen()).toBe(true);
    await dock().trigger("pointerleave", { pointerType: "mouse" });
    expect(isOpen()).toBe(false);
  });

  it("previews the bar under the mouse and jumps on click", async () => {
    mountTimeline();
    await dock().trigger("pointerenter", { pointerType: "mouse" });
    const bars = wrapper.get(".tl-bars");
    await bars.trigger("pointermove", {
      pointerType: "mouse",
      clientX: centerOf(3),
    });
    const preview = wrapper.get('[data-testid="timeline-preview"]');
    expect(preview.text()).toContain("Colour vision");
    expect(preview.text()).toContain("Interactive by Stuart Trenholm");
    // Centred over the bar: the bars start 16px into the dock.
    expect(preview.attributes("style")).toContain(
      `--tl-x: ${Math.round(16 + centerOf(3))}px`
    );

    await bars.trigger("pointerdown", {
      pointerType: "mouse",
      clientX: centerOf(6),
    });
    await bars.trigger("click", { clientX: centerOf(6) });
    // A click: the focus the jump moves shows no ring.
    expect(wrapper.emitted("jump")).toEqual([[6, { pointer: true }]]);
  });

  it("on touch, a tap opens it, a tap selects, a second tap jumps", async () => {
    mountTimeline();
    const bars = wrapper.get(".tl-bars");
    const tap = async (x) => {
      await bars.trigger("pointerdown", { pointerType: "touch", clientX: x });
      await bars.trigger("pointerup", { pointerType: "touch", clientX: x });
      await bars.trigger("click", { clientX: x });
    };

    await tap(centerOf(5));
    expect(isOpen()).toBe(true);
    expect(wrapper.find('[data-testid="timeline-preview"]').exists()).toBe(
      false
    );

    await tap(centerOf(5));
    const preview = wrapper.get('[data-testid="timeline-preview"]');
    expect(preview.text()).toContain("Bipolar");
    expect(wrapper.emitted("jump")).toBeUndefined();

    await tap(centerOf(5));
    expect(wrapper.emitted("jump")).toEqual([[5, { pointer: true }]]);
    expect(isOpen()).toBe(false);
  });

  it("on touch, Go here jumps to the selected bar", async () => {
    mountTimeline();
    const bars = wrapper.get(".tl-bars");
    await bars.trigger("pointerdown", { pointerType: "touch", clientX: 4 });
    await bars.trigger("click", { clientX: 4 });
    await bars.trigger("pointerdown", {
      pointerType: "touch",
      clientX: centerOf(3),
    });
    await bars.trigger("click", { clientX: centerOf(3) });
    const go = wrapper.get(".tl-preview-go");
    await go.trigger("pointerdown", { pointerType: "touch" });
    await go.trigger("click");
    expect(wrapper.emitted("jump")).toEqual([[3, { pointer: true }]]);
  });

  it("on touch, a tap outside folds it away", async () => {
    mountTimeline();
    const bars = wrapper.get(".tl-bars");
    await bars.trigger("pointerdown", { pointerType: "touch", clientX: 4 });
    await bars.trigger("click", { clientX: 4 });
    expect(isOpen()).toBe(true);
    await nextTick();
    document.body.dispatchEvent(
      new window.PointerEvent("pointerdown", { bubbles: true })
    );
    await nextTick();
    expect(isOpen()).toBe(false);
  });
});

describe("ChapterTimeline — map", () => {
  it("opens a modal dialog that traps Tab, closes on Escape and gives focus back", async () => {
    mountTimeline({ layers: testLayers() });
    await slider().trigger("focusin");
    const button = wrapper.get('button[aria-label="Open chapter map"]');
    expect(button.attributes("aria-haspopup")).toBe("dialog");
    expect(button.attributes("tabindex")).toBe("0");

    const map = await openMap();
    expect(map.getAttribute("aria-modal")).toBe("true");
    expect(map.textContent).toContain("Chapter map");
    expect(map.textContent).toContain("The Eye");
    expect(button.attributes("aria-expanded")).toBe("true");
    const inline = () => document.documentElement.getAttribute("style") || "";
    expect(inline()).toContain("overflow: hidden");

    const focusable = [...map.querySelectorAll("button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    expect(document.activeElement).toBe(first);
    expect(first.getAttribute("aria-label")).toBe("Close chapter map");

    // Shift+Tab from the first wraps to the last, Tab from the last back.
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
      })
    );
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
    );
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await flushPromises();
    expect(dialog()).toBeNull();
    expect(inline()).not.toContain("overflow");
    expect(document.activeElement).toBe(button.element);
    expect(isOpen()).toBe(true);

    // Focus leaving the dock folds it again.
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    await nextTick();
    expect(isOpen()).toBe(false);
    expect(preview().exists()).toBe(false);
  });

  it("jumps from a map entry to the section's heading and folds the dock", async () => {
    // Long enough after the press on the map button that a focus coming
    // back would read as the keyboard's.
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mountTimeline();
    await dock().trigger("pointerenter", { pointerType: "mouse" });
    await dock().trigger("pointerdown", { pointerType: "mouse" });
    await openMap();
    now += 5000;
    const entry = [...document.querySelectorAll(".map-section-head")].find(
      (b) => b.textContent.includes("Circuits")
    );
    pressInMap(entry);
    entry.click();
    await flushPromises();

    expect(wrapper.emitted("jump")).toEqual([
      [{ index: 5, anchorId: "s2" }, { pointer: true }],
    ]);
    expect(dialog()).toBeNull();
    // No peek left open, and no preview of the place the reader left (p2).
    expect(isOpen()).toBe(false);
    expect(dock().attributes("style")).toContain(`height: ${REST_H}px`);
    expect(preview().exists()).toBe(false);
    expect(document.activeElement).not.toBe(mapButton().element);
    await wrapper.setProps({ position: 5.1 });
    expect(isOpen()).toBe(false);
  });

  it("folds the dock when a click closes the map", async () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mountTimeline();
    await dock().trigger("pointerenter", { pointerType: "mouse" });
    await dock().trigger("pointerdown", { pointerType: "mouse" });
    const map = await openMap();
    now += 5000;
    const close = map.querySelector('[aria-label="Close chapter map"]');
    pressInMap(close);
    close.click();
    await flushPromises();

    expect(dialog()).toBeNull();
    expect(isOpen()).toBe(false);
    expect(preview().exists()).toBe(false);
    // Focus isn't left on <body>: it goes to the dock itself, not the
    // slider (which would take the page's scroll keys), and doesn't peek.
    expect(document.activeElement).toBe(dock().element);
    expect(document.activeElement).not.toBe(slider().element);
    // PageDown is the page's again: the slider's cursor doesn't move.
    await dock().trigger("keydown", { key: "PageDown" });
    expect(isOpen()).toBe(false);
    // Nothing holds it open: hovering in and out works as before.
    await dock().trigger("pointerenter", { pointerType: "mouse" });
    expect(isOpen()).toBe(true);
    await dock().trigger("pointerleave", { pointerType: "mouse" });
    expect(isOpen()).toBe(false);
  });

  it("on touch, a tap that closes the map leaves the scroll fold working", async () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    mountTimeline();
    const bars = wrapper.get(".tl-bars");
    const tapDock = async () => {
      await bars.trigger("pointerdown", { pointerType: "touch", clientX: 4 });
      await bars.trigger("click", { clientX: 4 });
    };
    await tapDock();
    expect(isOpen()).toBe(true);
    await mapButton().trigger("pointerdown", { pointerType: "touch" });
    const map = await openMap();
    now += 5000;
    const close = map.querySelector('[aria-label="Close chapter map"]');
    pressInMap(close, "touch");
    close.click();
    await flushPromises();
    expect(isOpen()).toBe(false);
    expect(preview().exists()).toBe(false);
    expect(document.activeElement).toBe(dock().element);

    // Peek again, then scroll the page past the fold distance.
    now += 1000;
    await tapDock();
    expect(isOpen()).toBe(true);
    const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 200,
    });
    try {
      await wrapper.setProps({ position: 3.2 });
      expect(isOpen()).toBe(false);
    } finally {
      if (scrollY) Object.defineProperty(window, "scrollY", scrollY);
      else delete window.scrollY;
    }
  });

  it("hides the map button with the peek", () => {
    mountTimeline();
    expect(
      wrapper
        .get('button[aria-label="Open chapter map"]')
        .attributes("tabindex")
    ).toBe("-1");
  });
});

describe("ChapterTimeline — page contract", () => {
  it("publishes --reader-timeline-h while mounted", () => {
    // Read through the attribute: happy-dom's getPropertyValue goes stale
    // once a removeProperty has emptied the style attribute.
    const inline = () => document.documentElement.getAttribute("style") || "";
    mountTimeline();
    expect(inline()).toContain(`--reader-timeline-h: ${REST_H}px`);
    wrapper.unmount();
    wrapper = null;
    expect(inline()).not.toContain("--reader-timeline-h");
  });

  it("is fixed to the bottom and hides on `hidden`", async () => {
    mountTimeline();
    expect(dock().classes()).toContain("ctl");
    expect(dock().element.style.display).not.toBe("none");
    await slider().trigger("focusin");
    await wrapper.setProps({ hidden: true });
    expect(dock().element.style.display).toBe("none");
    expect(isOpen()).toBe(false);
  });

  it("rises over the reader sidebar's panel while open, under the edit bar", () => {
    const zIndex = (file, selector) => {
      const source = readFileSync(join(__dirname, file), "utf8");
      const rule = new RegExp(
        `${selector.replace(/\./g, "\\.")}\\s*\\{[^}]*z-index: (\\d+);`
      );
      return Number(rule.exec(source)?.[1]);
    };
    const rest = zIndex("../ChapterTimeline.vue", ".ctl");
    const open = zIndex("../ChapterTimeline.vue", ".ctl.is-open");
    const sidebar = zIndex("../../ReaderSidebar.vue", ".toolkit-panel");
    const editBar = zIndex("../../TextComp.vue", ".edit-bar");
    const map = zIndex("../TimelineMap.vue", ".ctl-map");
    // At rest under the sidebar; open, its preview card shows over it.
    expect(rest).toBeLessThan(sidebar);
    expect(open).toBeGreaterThan(sidebar);
    expect(open).toBeLessThan(editBar);
    expect(open).toBeLessThan(map);
  });

  it("renders an empty chapter without bars", () => {
    mountTimeline({
      model: { items: [], sections: [], subsections: [], maxWords: 1 },
      position: 0,
      readPercent: 0,
    });
    expect(slider().attributes("aria-valuetext")).toBe("0% read");
    expect(wrapper.find(".tl-text").attributes("d")).toBe("");
  });
});
