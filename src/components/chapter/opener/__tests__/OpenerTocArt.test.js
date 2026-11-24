import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

/*
 * The contents with a picture per section (OPENBRAIN-174). What these pin:
 * pointing at a section, or tabbing to it, changes its picture at once; a
 * click or a tap goes there through readerJump like every other jump in
 * the reader.
 *
 * Since OPENBRAIN-193 the list is the sections' titles only: no chevrons,
 * no parts opening under a row, nothing that expands (Stuart, 11 and 14
 * Nov). So nothing in the list moves (OPENBRAIN-182), only the pointer
 * moving points at a section, and the gaps tighten so the list fits.
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

  it("lists the sections' titles and nothing under them (OPENBRAIN-193)", () => {
    mountToc();
    expect(rows().map((r) => r.text())).toEqual([
      "0.Introduction",
      "1.Where is my mind?",
      "2.Do different parts of the brain do different things?",
      "3.A later section",
    ]);
    // One link per section: a section's parts (its boxes and subsections)
    // are not in the contents, though the outline carries them.
    expect(wrapper.findAll("nav a")).toHaveLength(outline.length);
    expect(wrapper.text()).not.toContain("The sacred disease");
    // Nothing expands: no chevron, and no row claims to open anything.
    expect(wrapper.find("nav svg").exists()).toBe(false);
    for (const row of rows()) {
      expect(row.attributes("aria-expanded")).toBeUndefined();
      expect(row.attributes("aria-controls")).toBeUndefined();
    }
  });

  it("changes the picture at once as the pointer comes onto a section", async () => {
    mountToc();
    await enter(1);
    expect(classesOf(1)).toContain("is-active");
    expect(classesOf(0)).not.toContain("is-active");
    expect(shownPicture()).toMatch(/where-is-my-mind\.webp$/);
    // The last picture stays underneath for the fade.
    expect(wrapper.find(".otoc__pic.is-under").attributes("src")).toMatch(
      /introduction\.webp$/
    );
    await enter(2);
    expect(shownPicture()).toMatch(/do-different-parts\.webp$/);
  });

  it("keeps the pointed section when the pointer leaves", async () => {
    mountToc();
    await enter(1);
    await wrapper
      .find(".otoc__column")
      .trigger("pointerleave", { pointerType: "mouse" });
    expect(classesOf(1)).toContain("is-active");
    expect(shownPicture()).toMatch(/where-is-my-mind\.webp$/);
  });

  describe("the list stays where it is (OPENBRAIN-182)", () => {
    const list = () => wrapper.find(".otoc__sections");

    it("is never shifted, transformed or resized, whichever section is pointed at", async () => {
      mountToc();
      // What is in the list: every element and its text, in order.
      const made = () =>
        [...list().element.querySelectorAll("*")].map(
          (el) => `${el.tagName} ${el.textContent}`
        );
      const before = made();
      const unmoved = () => {
        expect(list().attributes("style")).toBeUndefined();
        expect(list().element.style.transform).toBe("");
        // The only thing the block sets is how much its gaps give.
        expect(wrapper.attributes("style")).toBe("--otoc-fit: 1;");
        // The same rows, whichever is active: nothing opens or closes.
        expect(made()).toEqual(before);
      };
      unmoved();
      for (const i of [0, 1, 2, 3, 2, 1, 0]) {
        await enter(i);
        expect(classesOf(i)).toContain("is-active");
        unmoved();
      }
      await rows()[2].trigger("focus");
      unmoved();
    });

    it("ignores a move with unchanged coordinates: the page moved, not the pointer", async () => {
      mountToc();
      await enter(2);
      // The page scrolled under a resting pointer and another row is now
      // beneath it: the browser reports a move at the same spot.
      await moveOn(rows()[3], spotOf(2));
      expect(classesOf(2)).toContain("is-active");
      expect(shownPicture()).toMatch(/do-different-parts\.webp$/);
      await moveOn(rows()[1], spotOf(2));
      expect(classesOf(2)).toContain("is-active");
      // The reader moving the pointer, by a pixel, does point at it.
      await moveOn(rows()[1], { clientX: 301, clientY: spotOf(2).clientY });
      expect(classesOf(1)).toContain("is-active");
    });

    it("leaves the gaps between sections to no one", async () => {
      mountToc();
      await enter(1);
      await moveOn(list(), { clientX: 300, clientY: 500 });
      expect(classesOf(1)).toContain("is-active");
    });

    it("has no rollover on touch", async () => {
      mountToc();
      await enter(1, "touch");
      expect(classesOf(1)).not.toContain("is-active");
      expect(classesOf(0)).toContain("is-active");
    });
  });

  describe("fitting the column (OPENBRAIN-182)", () => {
    const real = {
      matchMedia: window.matchMedia,
      getComputedStyle: window.getComputedStyle,
    };
    afterEach(() => Object.assign(window, real));

    // happy-dom has no layout: rows of 30 with 34 between, in a column with
    // `room` for the list.
    function sized(room, { wide = true } = {}) {
      window.matchMedia = (query) => ({
        matches: /min-width/.test(query) ? wide : false,
        addEventListener() {},
        removeEventListener() {},
      });
      window.getComputedStyle = () => ({ rowGap: "34px" });
      mountToc();
      wrapper
        .findAll(".otoc__row")
        .forEach((row) =>
          Object.defineProperty(row.element, "offsetHeight", { get: () => 30 })
        );
      Object.defineProperty(
        wrapper.find(".otoc__nav").element,
        "clientHeight",
        { get: () => room }
      );
      wrapper.vm.measure();
    }
    // Four rows (120), three gaps (102). As drawn: 222, plus 4 kept spare.
    const AS_DRAWN = 120 + 102 + 4;

    it("leaves the gaps as drawn when the list fits", async () => {
      sized(AS_DRAWN);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fit).toBe(1);
      expect(wrapper.classes()).not.toContain("otoc--scrolls");
    });

    it("tightens the gaps when it does not, and nothing else", async () => {
      sized(AS_DRAWN - 51);
      await wrapper.vm.$nextTick();
      // 102 of gap has 51 to lose.
      expect(wrapper.vm.fit).toBeCloseTo(0.5, 6);
      expect(wrapper.attributes("style")).toMatch(/^--otoc-fit: 0\.5\d*;$/);
      expect(wrapper.classes()).not.toContain("otoc--scrolls");
      // Measuring again, with the gaps now drawn tighter, changes nothing.
      window.getComputedStyle = () => ({ rowGap: "17px" });
      wrapper.vm.measure();
      expect(wrapper.vm.fit).toBeCloseTo(0.5, 6);
    });

    it("lets the list scroll in its column only when even that is not enough", async () => {
      sized(140);
      await wrapper.vm.$nextTick();
      expect(wrapper.vm.fit).toBeLessThan(0.5);
      expect(wrapper.classes()).toContain("otoc--scrolls");
    });

    it("fits nothing below the two-column width, where the block is as tall as it needs", async () => {
      sized(140, { wide: false });
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

  it("points at a section as it takes keyboard focus, and Enter goes there", async () => {
    mountToc();
    await rows()[2].trigger("focus");
    expect(classesOf(2)).toContain("is-active");
    expect(shownPicture()).toMatch(/do-different-parts\.webp$/);
    // Enter on it is a click with no pointer.
    await rows()[2].trigger("click", { detail: 0 });
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s2");
  });

  it("goes to the section on a mouse click", async () => {
    mountToc();
    await enter(1);
    await rows()[1].trigger("click", { detail: 1 });
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s1");
    expect(jumpToElement.mock.calls[0][1]).toEqual({ align: "top" });
  });

  it("goes there on the first tap, a section with parts in its outline too", async () => {
    mountToc();
    // A tap: no rollover, then focus and the click.
    await enter(1, "touch");
    await rows()[1].trigger("pointerdown", { pointerType: "touch" });
    await rows()[1].trigger("pointerup", { pointerType: "touch" });
    await rows()[1].trigger("focus");
    await rows()[1].trigger("click", { detail: 1 });
    expect(shownPicture()).toMatch(/where-is-my-mind\.webp$/);
    expect(jumpToElement).toHaveBeenCalledTimes(1);
    expect(jumpToElement.mock.calls[0][0].id).toBe("s1");
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
    await wrapper.vm.$nextTick();
    expect(classesOf(0)).toContain("is-active");
    expect(shownPicture()).toMatch(/introduction\.webp$/);
  });
});

describe("temporary artwork", () => {
  it("labels only the active placeholder, including when focus changes it", async () => {
    mountToc({
      outline: outline.slice(0, 2).map((s, i) => ({
        ...s,
        art: { src: `/art-${i}.webp`, placeholder: i === 0 },
      })),
    });
    expect(wrapper.find(".otoc__placeholder").text()).toBe("Placeholder image");
    await rows()[1].trigger("focus");
    expect(wrapper.find(".otoc__placeholder").exists()).toBe(false);
  });
  it("never labels History's designer art", () => {
    mountToc();
    expect(wrapper.find(".otoc__placeholder").exists()).toBe(false);
  });

  it("keeps only the picture on show in the page in one column (OPENBRAIN-74)", async () => {
    // Seven 1440 × 1920 pictures stacked were more than an iPhone keeps
    // decoded: the one on show flashed as the page scrolled.
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    try {
      mountToc();
      await wrapper.vm.$nextTick();
      const pictures = wrapper.findAll(".otoc__pic");
      expect(pictures).toHaveLength(1);
      expect(pictures[0].classes()).toContain("is-on");
      expect(pictures[0].attributes("decoding")).toBe("sync");
      // A tap on another section: its picture over the one before, no more.
      await rows()[1].trigger("click");
      expect(wrapper.findAll(".otoc__pic").length).toBeLessThanOrEqual(2);
      expect(shownPicture()).toContain("where-is-my-mind");
    } finally {
      window.matchMedia = original;
    }
  });
});
