import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

/*
 * The contents with a picture per section (OPENBRAIN-174). What these pin:
 * pointing at a section changes its picture at once and opens its parts
 * only once the pointer rests; the keyboard does the same without the wait;
 * a tap opens a section and the next one goes there; and a click goes
 * through readerJump like every other jump in the reader.
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
const enter = (i, pointerType = "mouse") =>
  sections()[i].trigger("pointerenter", { pointerType });

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
    expect(wrapper.vm.shift).toBe(0);
  });

  describe("keeping the pointed row still", () => {
    // happy-dom has no layout: give the parts and the column their sizes.
    function sized(columnHeight) {
      mountToc();
      const heights = [76, 38]; // section 1's parts, section 2's
      wrapper.findAll(".otoc__parts-list").forEach((list, i) => {
        Object.defineProperty(list.element, "scrollHeight", {
          get: () => heights[i],
        });
      });
      Object.defineProperty(
        wrapper.find(".otoc__column").element,
        "clientHeight",
        { get: () => columnHeight }
      );
    }
    const rest = () => vi.advanceTimersByTimeAsync(200);

    it("moves the list down by what closes above the pointer", async () => {
      sized(900);
      await enter(1);
      await rest();
      expect(wrapper.vm.shift).toBe(0); // nothing above it was open
      await enter(2);
      await rest();
      expect(wrapper.vm.shift).toBe(76);
      // Going back up needs nothing: what opens is below the pointer.
      await enter(1);
      await rest();
      expect(wrapper.vm.shift).toBe(76);
      await wrapper
        .find(".otoc__column")
        .trigger("pointerleave", { pointerType: "mouse" });
      expect(wrapper.vm.shift).toBe(0);
    });

    it("stops where the list would leave its column", async () => {
      // 40 kept at the foot, 38 for the parts opening: 22 to move in.
      sized(100);
      await enter(1);
      await rest();
      await enter(2);
      await rest();
      expect(wrapper.vm.shift).toBe(22);
    });

    it("does not move the list for the keyboard", async () => {
      sized(900);
      await rows()[1].trigger("focus");
      await rows()[2].trigger("focus");
      expect(wrapper.vm.shift).toBe(0);
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
