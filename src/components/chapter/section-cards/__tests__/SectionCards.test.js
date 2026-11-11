import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useGeneral } from "@/stores";
import SectionCards from "../SectionCards.vue";

/*
 * Section cards (OPENBRAIN-174): the card in the figure pane while the
 * reader crosses into a section. happy-dom has no layout, so each test
 * places the reader's sections on a 900px screen by stubbing their boxes.
 */

const HISTORY = "foundations-of-neuroscience";
const SCREEN = 900;

const text = {
  intro: [{ id: "intro", title: "History", sectionTitle: "Introduction" }],
  sections: [
    {
      id: "one",
      slug: "do-different-parts",
      kind: "section",
      title: "Do different parts of the brain do different things?",
      paragraphs: [],
    },
    {
      id: "two",
      slug: "basic-functional-unit",
      kind: "section",
      title: "What's the basic functional unit of the brain?",
      paragraphs: [],
    },
    {
      id: "refs",
      slug: "references",
      kind: "section",
      title: "References",
      paragraphs: [],
    },
  ],
};

let reader;
let wrapper;
let store;
let wide;

const box = (el, top, height) => {
  el.getBoundingClientRect = () => ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
  });
};

/*
 * The reader's text: section "one" ending `gapStart` down the screen (its
 * 320px gap is padding), section "two" straight after, its first figure
 * `run` below its top.
 */
function layOut(gapStart, run = 400) {
  const [one, two] = reader.querySelectorAll("section.reader-section");
  box(one, gapStart - 2000, 2000 + 320);
  box(two, gapStart + 320, 3000);
  box(two.querySelector(".animationTrigger"), gapStart + 320 + run, 300);
  box(
    two.querySelector("[data-breakout-box]"),
    gapStart + 320 + run + 600,
    900
  );
}

function mountCards(module = { slug: HISTORY }) {
  wrapper = mount(SectionCards, {
    props: { module, text },
    attachTo: reader,
  });
  return wrapper;
}
async function scrolled() {
  wrapper.vm.update();
  await nextTick();
}
const card = () => wrapper.findComponent({ name: "SectionCard" });

beforeEach(() => {
  setActivePinia(createPinia());
  store = useGeneral();
  wide = true;
  vi.stubGlobal("innerHeight", SCREEN);
  // The reader's width query answers `wide`; nothing else matches (so
  // motion is not reduced unless a test says so).
  window.matchMedia = (query) => ({
    matches: /min-width/.test(query) ? wide : false,
    addEventListener() {},
    removeEventListener() {},
  });
  window.getComputedStyle = (el) => ({
    paddingBottom: el.classList?.contains("reader-section") ? "320px" : "0px",
  });
  reader = document.createElement("div");
  reader.className = "chapter-reader";
  reader.innerHTML = `
    <div id="container">
      <section id="one" class="reader-section" data-section-slug="do-different-parts">
        <h2 class="TN">2</h2><h2 class="subChapter">One</h2>
        <div id="triggerAnimationFig5" class="animationTrigger"></div>
      </section>
      <section id="two" class="reader-section" data-section-slug="basic-functional-unit">
        <h2 class="TN">3</h2><h2 class="subChapter">Two</h2>
        <div id="triggerAnimationFig12" class="animationTrigger"></div>
        <div data-breakout-box><div id="triggerAnimationBoxFig" class="animationTrigger"></div></div>
      </section>
    </div>`;
  document.body.appendChild(reader);
});
afterEach(() => {
  wrapper?.unmount();
  reader.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SectionCards", () => {
  it("shows nothing before the last section's text has passed", async () => {
    mountCards();
    layOut(800);
    await scrolled();
    expect(card().exists()).toBe(false);
  });

  it("shows the next section's card through the gap", async () => {
    mountCards();
    layOut(600);
    await scrolled();
    expect(card().exists()).toBe(true);
    expect(card().props("label")).toBe("2");
    expect(card().props("title")).toBe(text.sections[1].title);
    expect(card().props("art").src).toMatch(/basic-functional-unit\.webp$/);
    expect(card().props("progress")).toBeGreaterThan(0);
    // The heading is still below the screen: the title is whole.
    expect(card().props("titleShare")).toBe(1);
    expect(card().attributes("aria-hidden")).toBe("true");
  });

  it("hands its title over as the heading comes up beside it", async () => {
    mountCards();
    layOut(100); // the section's top is at 420 of 900
    await scrolled();
    expect(card().exists()).toBe(true);
    expect(card().props("titleShare")).toBe(0);
  });

  it("leaves when the section's first figure reaches the figure line", async () => {
    mountCards();
    layOut(450 - 720); // the figure's paragraph is at mid-screen
    await scrolled();
    expect(card().exists()).toBe(false);
  });

  it("ends at the first band when one comes before the figure", async () => {
    // A breakout box 250 below the section's top, the figure after it.
    const two = reader.querySelector("#two");
    const band = two.querySelector("[data-breakout-box]");
    two.insertBefore(band, two.querySelector("#triggerAnimationFig12"));
    mountCards();
    layOut(300, 2000);
    box(band, 300 + 320 + 250, 900);
    await scrolled();
    expect(card().exists()).toBe(true);
    // Scrolled on: the band has reached the figure line, the figure has not.
    layOut(-200, 2000);
    box(band, -200 + 320 + 250, 900);
    await scrolled();
    expect(card().exists()).toBe(false);
  });

  it("waits for a figure that is still in the pane", async () => {
    mountCards();
    layOut(600);
    store.animationActive = true;
    await scrolled();
    expect(card().exists()).toBe(false);
    store.animationActive = false;
    await nextTick();
    expect(card().exists()).toBe(true);
  });

  it("skips a section whose first figure follows its heading at once", async () => {
    mountCards();
    layOut(600, 90);
    await scrolled();
    expect(card().exists()).toBe(false);
  });

  it("has no card below the two-column width", async () => {
    wide = false;
    mountCards();
    layOut(600);
    await scrolled();
    expect(card().exists()).toBe(false);
  });

  it("renders nothing for a chapter without section art", async () => {
    mountCards({ slug: "the-retina" });
    layOut(600);
    await scrolled();
    expect(wrapper.find(".section-cards").exists()).toBe(false);
  });

  it("goes with the pane while the reader's scroll is driven", async () => {
    mountCards();
    layOut(600);
    await scrolled();
    store.isScrolling = true;
    await nextTick();
    expect(wrapper.find(".section-cards").exists()).toBe(false);
  });

  describe("the headings' entrance", () => {
    let seen; // the observer's callback and what it watches
    const mark = (id) =>
      reader.querySelector(`#${id}`).getAttribute("data-section-enter");
    const heading = (id) => reader.querySelector(`#${id} > h2.subChapter`);

    beforeEach(() => {
      vi.useFakeTimers();
      seen = { watched: [], callback: null };
      vi.stubGlobal(
        "IntersectionObserver",
        class {
          constructor(callback) {
            seen.callback = callback;
          }
          observe(el) {
            seen.watched.push(el);
          }
          unobserve(el) {
            seen.watched = seen.watched.filter((w) => w !== el);
          }
          disconnect() {
            seen.watched = [];
          }
        }
      );
      // Section one's heading is on screen, section two's is below it.
      box(heading("one"), 300, 80);
      box(heading("two"), 1400, 80);
    });
    afterEach(() => {
      document.documentElement.removeAttribute("data-reduce-motion");
      vi.useRealTimers();
    });

    it("marks only headings still below the screen to wait", () => {
      mountCards();
      expect(mark("one")).toBeNull();
      expect(mark("two")).toBe("wait");
      expect(seen.watched).toEqual([heading("two")]);
    });

    it("plays once as the heading comes in, then takes its mark off", () => {
      mountCards();
      seen.callback([{ isIntersecting: false, target: heading("two") }]);
      expect(mark("two")).toBe("wait");
      seen.callback([{ isIntersecting: true, target: heading("two") }]);
      expect(mark("two")).toBe("in");
      expect(seen.watched).toEqual([]);
      vi.advanceTimersByTime(1000);
      expect(mark("two")).toBeNull();
    });

    it("leaves the headings alone under reduced motion", () => {
      document.documentElement.setAttribute("data-reduce-motion", "1");
      mountCards();
      expect(mark("two")).toBeNull();
      expect(seen.watched).toEqual([]);
    });

    it("leaves a chapter without section art alone", () => {
      mountCards({ slug: "the-retina" });
      expect(mark("two")).toBeNull();
    });

    it("takes its marks off when it goes", () => {
      mountCards();
      expect(mark("two")).toBe("wait");
      wrapper.unmount();
      wrapper = null;
      expect(mark("two")).toBeNull();
    });
  });
});
