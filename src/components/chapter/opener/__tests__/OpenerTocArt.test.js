import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

/*
 * The contents with a picture per section (OPENBRAIN-174). What these pin:
 * pointing at a section changes its picture at once and opens its parts
 * only once the pointer rests; the keyboard does the same without the wait;
 * a tap opens a section and the next one goes there; and a click goes
 * through readerJump like every other jump in the reader.
 *
 * And, since OPENBRAIN-182: the list is never moved (the first version
 * shifted it to keep the pointed row under the pointer, and the shifts added
 * up until the last rows were off the screen); only the pointer moving
 * points at a section; and the gaps tighten so the tallest state fits.
 */

const { jumpToElement } = vi.hoisted(() => ({ jumpToElement: vi.fn() }));
vi.mock("@/helper/readerJump", async (original) => ({
  ...(await original()),
  jumpToElement,
}));

import OpenerTocArt from "../OpenerTocArt.vue";

const part = (id, title) => ({ id, kind: "box", title, anchor: `#${id}` });
const outline = [
  {
    id: "intro",
    slug: "introduction",
    kind: "intro",
    label: "0",
    title: "Introduction",
    anchor: "#intro",
    subsections: [],
  },
  {
    id: "s1",
    slug: "where-is-my-mind",
    kind: "section",
    label: "1",
    title: "Where is my mind?",
    anchor: "#s1",
    subsections: [
      part("b1", "The sacred disease"),
      part("b2", "Rete mirabile"),
    ],
  },
  {
    id: "s2",
    slug: "do-different-parts",
    kind: "section",
    label: "2",
    title: "Do different parts of the brain do different things?",
    anchor: "#s2",
    subsections: [part("b3", "Descartes and dualism")],
  },
  {
    id: "s3",
    slug: "a-section-without-art",
    kind: "section",
    label: "3",
    title: "A later section",
    anchor: "#s3",
    subsections: [],
  },
];

let wrapper;
let targets;
function mountToc(props = {}) {
  wrapper = mount(OpenerTocArt, {
    props: {
      title: "Foundations of Neuroscience",
      subtitle: "Debates that framed our understanding of the brain",
      chapterSlug: "foundations-of-neuroscience",
      outline,
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}
const rows = () => wrapper.findAll(".otoc__row");
const sections = () => wrapper.findAll(".otoc__section");
const classesOf = (i) => sections()[i].classes();
const shownPicture = () =>
  wrapper.find(".otoc__pic.is-on").attributes("src") || "";
// The pointer moving onto section i's row: every row at its own spot.
const spotOf = (i) => ({ clientX: 300, clientY: 100 + i * 60 });
const moveOn = (el, spot, pointerType = "mouse") =>
  el.trigger("pointermove", { pointerType, ...spot });
const enter = (i, pointerType = "mouse") =>
  moveOn(rows()[i], spotOf(i), pointerType);

beforeEach(() => {
  vi.useFakeTimers();
  jumpToElement.mockClear();
  // The sections the rows point at.
  targets = document.createElement("div");
  targets.innerHTML = ["intro", "s1", "s2", "s3", "b1", "b3"]
    .map((id) => `<section id="${id}"></section>`)
    .join("");
  document.body.appendChild(targets);
});
afterEach(() => {
  wrapper?.unmount();
  targets.remove();
  vi.useRealTimers();
});

describe("OpenerTocArt", () => {
  it("starts on the first section, with the chapter's name as the heading", () => {
    mountToc();
    expect(wrapper.find("h1").text()).toContain("Foundations of Neuroscience");
    expect(wrapper.find("h1").text()).toContain("Debates that framed");
    expect(classesOf(0)).toContain("is-active");
    expect(classesOf(1)).not.toContain("is-active");
    expect(shownPicture()).toMatch(/sections\/introduction\.webp$/);
    expect(rows()[0].text()).toBe("0.Introduction");
  });

  it("marks only the sections with parts as ones that open", () => {
    mountToc();
    expect(rows()[0].attributes("aria-expanded")).toBeUndefined();
    expect(rows()[0].find(".otoc__chevron").exists()).toBe(false);
    expect(rows()[1].attributes("aria-expanded")).toBe("false");
    expect(rows()[1].find(".otoc__chevron").exists()).toBe(true);
    const parts = wrapper.find(`#${rows()[1].attributes("aria-controls")}`);
    expect(parts.findAll("a").map((a) => a.text())).toEqual([
      "The sacred disease",
      "Rete mirabile",
    ]);
    // Closed parts are out of reach of the keyboard.
    expect(parts.attributes("inert")).toBeDefined();
  });

  it("changes the picture at once and opens the parts once the pointer rests", async () => {
    mountToc();
    await enter(1);
    expect(classesOf(1)).toContain("is-active");
    expect(shownPicture()).toMatch(/where-is-my-mind\.webp$/);
    // The last picture stays underneath for the fade.
    expect(wrapper.find(".otoc__pic.is-under").attributes("src")).toMatch(
      /introduction\.webp$/
    );
    expect(rows()[1].attributes("aria-expanded")).toBe("false");

    await vi.advanceTimersByTimeAsync(200);
    expect(rows()[1].attributes("aria-expanded")).toBe("true");
    expect(classesOf(1)).toContain("is-open");
    expect(
      wrapper
        .find(`#${rows()[1].attributes("aria-controls")}`)
        .attributes("inert")
    ).toBeUndefined();
  });

  it("opens nothing for a pointer that only passes over", async () => {
    mountToc();
    await enter(1);
    await vi.advanceTimersByTimeAsync(60);
    await enter(2);
    await vi.advanceTimersByTimeAsync(60);
    expect(rows()[1].attributes("aria-expanded")).toBe("false");
    expect(rows()[2].attributes("aria-expanded")).toBe("false");
    expect(shownPicture()).toMatch(/do-different-parts\.webp$/);
    await vi.advanceTimersByTimeAsync(200);
    expect(rows()[1].attributes("aria-expanded")).toBe("false");
    expect(rows()[2].attributes("aria-expanded")).toBe("true");
  });

  it("settles on the pointed section when the pointer leaves", async () => {
    mountToc();
    await enter(1);
    await wrapper
      .find(".otoc__column")
      .trigger("pointerleave", { pointerType: "mouse" });
    expect(rows()[1].attributes("aria-expanded")).toBe("true");
  });

  describe("the list stays where it is (OPENBRAIN-182)", () => {
    const rest = () => vi.advanceTimersByTimeAsync(200);
    const list = () => wrapper.find(".otoc__sections");
    const openIndex = () =>
      sections().findIndex((s) => s.classes().includes("is-open"));

    it("is never shifted or transformed, whichever section is open", async () => {
      mountToc();
      const unmoved = () => {
        expect(list().attributes("style")).toBeUndefined();
        expect(list().element.style.transform).toBe("");
        // The only thing the block sets is how much its gaps give.
        expect(wrapper.attributes("style")).toBe("--otoc-fit: 1;");
      };
      unmoved();
      // Down the list, then back up, resting on each.
      for (const i of [0, 1, 2, 3, 2, 1, 0]) {
        await enter(i);
        await rest();
        expect(openIndex()).toBe(i);
        unmoved();
      }
      await rows()[2].trigger("focus");
      unmoved();
    });

    it("has one section open at a time", async () => {
      mountToc();
      for (const i of [1, 2, 1]) {
        await enter(i);
        await rest();
        expect(wrapper.findAll(".otoc__section.is-open").length).toBe(1);
        expect(wrapper.findAll('[aria-expanded="true"]').length).toBe(1);
      }
    });

    it("ignores a move with unchanged coordinates: the rows moved, not the pointer", async () => {
      mountToc();
      await enter(1);
      await rest();
      await enter(2);
      await rest();
      expect(openIndex()).toBe(2);
      // Section 1 closed above, so section 3's row has come up under the
      // resting pointer: the browser reports a move at the same spot.
      await moveOn(rows()[3], spotOf(2));
      await rest();
      expect(classesOf(2)).toContain("is-active");
      expect(openIndex()).toBe(2);
      expect(shownPicture()).toMatch(/do-different-parts\.webp$/);
      // And again, however often it is reported.
      await moveOn(rows()[1], spotOf(2));
      await moveOn(rows()[3], spotOf(2));
      await rest();
      expect(openIndex()).toBe(2);
      // The reader moving the pointer, by a pixel, does point at it.
      await moveOn(rows()[3], { clientX: 301, clientY: spotOf(2).clientY });
      expect(classesOf(3)).toContain("is-active");
      await rest();
      expect(openIndex()).toBe(3);
    });

    it("keeps a section while the pointer is on its parts", async () => {
      mountToc();
      await enter(1);
      await rest();
      const firstPart = wrapper.find('.otoc__part[href="#b1"]');
      await moveOn(firstPart, { clientX: 320, clientY: 190 });
      await moveOn(firstPart, { clientX: 322, clientY: 196 });
      await rest();
      expect(classesOf(1)).toContain("is-active");
      expect(openIndex()).toBe(1);
    });

    it("does not start the wait again for moves within one section", async () => {
      mountToc();
      await enter(1);
      await vi.advanceTimersByTimeAsync(100);
      await moveOn(rows()[1], { clientX: 310, clientY: 162 });
      await vi.advanceTimersByTimeAsync(60);
      // 160 ms on the section, though the pointer never stopped.
      expect(openIndex()).toBe(1);
    });

    it("leaves the gaps between sections to no one", async () => {
      mountToc();
      await enter(1);
      await rest();
      await moveOn(list(), { clientX: 300, clientY: 500 });
      await rest();
      expect(classesOf(1)).toContain("is-active");
      expect(openIndex()).toBe(1);
    });
  });

  describe("fitting the column (OPENBRAIN-182)", () => {
    const real = {
      matchMedia: window.matchMedia,
      getComputedStyle: window.getComputedStyle,
    };
    afterEach(() => Object.assign(window, real));

    // happy-dom has no layout: rows of 30 with 34 between, parts of 20 with
    // 18 between, in a column with `room` for the list.
    function sized(room, { wide = true } = {}) {
      window.matchMedia = (query) => ({
        matches: /min-width/.test(query) ? wide : false,
        addEventListener() {},
        removeEventListener() {},
      });
      window.getComputedStyle = (el) => ({
        rowGap: el.classList.contains("otoc__sections") ? "34px" : "18px",
      });
      mountToc();
      const height = (el, px) =>
        Object.defineProperty(el, "offsetHeight", { get: () => px });
      wrapper.findAll(".otoc__row").forEach((row) => height(row.element, 30));
      wrapper.findAll(".otoc__part").forEach((a) => height(a.element, 20));
      Object.defineProperty(
        wrapper.find(".otoc__nav").element,
        "clientHeight",
        {
          get: () => room,
        }
      );
      wrapper.vm.measure();
    }
    // Four rows (120), three gaps (102); the tallest parts are section 1's
    // two: 40 of text, two gaps of 18. As drawn: 298, plus 4 kept spare.
    const TALLEST = 120 + 102 + 40 + 36 + 4;

    it("leaves the gaps as drawn when the tallest state fits", async () => {
      sized(TALLEST);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fit).toBe(1);
      expect(wrapper.classes()).not.toContain("otoc--scrolls");
    });

    it("tightens the gaps when it does not, and nothing else", async () => {
      sized(TALLEST - 69);
      await wrapper.vm.$nextTick();
      // 138 of gap has 69 to lose.
      expect(wrapper.vm.fit).toBeCloseTo(0.5, 6);
      expect(wrapper.attributes("style")).toMatch(/^--otoc-fit: 0\.5\d*;$/);
      expect(wrapper.classes()).not.toContain("otoc--scrolls");
      // Measuring again, with the gaps now drawn tighter, changes nothing.
      window.getComputedStyle = (el) => ({
        rowGap: el.classList.contains("otoc__sections") ? "17px" : "9px",
      });
      wrapper.vm.measure();
      expect(wrapper.vm.fit).toBeCloseTo(0.5, 6);
    });

    it("lets the list scroll in its column only when even that is not enough", async () => {
      sized(180);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fit).toBeLessThan(0.5);
      expect(wrapper.classes()).toContain("otoc--scrolls");
    });

    it("fits nothing below the two-column width, where the block is as tall as it needs", async () => {
      sized(180, { wide: false });
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fit).toBe(1);
      expect(wrapper.classes()).not.toContain("otoc--scrolls");
    });
  });

  it("shows the chapter's first picture for a section with none", async () => {
    mountToc();
    await enter(3);
    expect(classesOf(3)).toContain("is-active");
    expect(shownPicture()).toMatch(/introduction\.webp$/);
  });

  it("opens a section as it takes keyboard focus, without the wait", async () => {
    mountToc();
    await rows()[2].trigger("focus");
    expect(classesOf(2)).toContain("is-active");
    expect(rows()[2].attributes("aria-expanded")).toBe("true");
    // Enter on it is a click with no pointer: it goes there.
    await rows()[2].trigger("click", { detail: 0 });
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s2");
  });

  it("goes to the section on a mouse click", async () => {
    mountToc();
    await enter(1);
    await rows()[1].trigger("pointerdown", { pointerType: "mouse" });
    await rows()[1].trigger("focus");
    await rows()[1].trigger("pointerup", { pointerType: "mouse" });
    await rows()[1].trigger("click", { detail: 1 });
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s1");
    expect(jumpToElement.mock.calls[0][1]).toEqual({ align: "top" });
  });

  it("opens a section on the first tap and goes there on the second", async () => {
    mountToc();
    const tap = async (i) => {
      await rows()[i].trigger("pointerdown", { pointerType: "touch" });
      await rows()[i].trigger("pointerup", { pointerType: "touch" });
      // A tap's focus arrives after its pointerup; it must not open the row.
      await rows()[i].trigger("focus");
      await rows()[i].trigger("click", { detail: 1 });
    };
    await enter(1, "touch"); // touch has no rollover
    expect(classesOf(1)).not.toContain("is-active");

    await tap(1);
    expect(rows()[1].attributes("aria-expanded")).toBe("true");
    expect(shownPicture()).toMatch(/where-is-my-mind\.webp$/);
    expect(jumpToElement).not.toHaveBeenCalled();

    await tap(1);
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s1");
  });

  it("goes straight there on a tap when the section has no parts", async () => {
    mountToc();
    await rows()[3].trigger("pointerdown", { pointerType: "touch" });
    await rows()[3].trigger("pointerup", { pointerType: "touch" });
    await rows()[3].trigger("click", { detail: 1 });
    expect(jumpToElement.mock.calls[0][0].id).toBe("s3");
  });

  it("goes to a part through readerJump", async () => {
    mountToc();
    await rows()[1].trigger("focus");
    const partLink = wrapper.find('.otoc__part[href="#b1"]');
    await partLink.trigger("focus");
    expect(classesOf(1)).toContain("is-open");
    await partLink.trigger("click");
    expect(jumpToElement.mock.calls[0][0].id).toBe("b1");
  });

  it("leaves a link to follow when its target is not on the page", async () => {
    mountToc();
    document.getElementById("s2").remove();
    const event = new MouseEvent("click", { cancelable: true, detail: 0 });
    rows()[2].element.dispatchEvent(event);
    expect(jumpToElement).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("starts again from the first section when the outline changes", async () => {
    mountToc();
    await rows()[2].trigger("focus");
    await wrapper.setProps({ outline: outline.slice(0, 3) });
    await vi.advanceTimersByTimeAsync(0);
    expect(classesOf(0)).toContain("is-active");
    expect(rows()[2].attributes("aria-expanded")).toBe("false");
  });
});
