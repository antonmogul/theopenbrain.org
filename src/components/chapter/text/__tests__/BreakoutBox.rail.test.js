/*
 * BreakoutBox as a rail (OPENBRAIN-163): a box of Explore parts read
 * sideways. Here: when the box is one, what it renders (the track's DOM
 * contract, the parts by name, Previous / Next), and that Next asks the
 * page to scroll, since the page's position is the track's. The geometry
 * is helper/exploreRail.js's and has its own tests; how it looks and moves
 * is checked in a browser (happy-dom lays nothing out).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, h } from "vue";
import BreakoutBox from "../BreakoutBox.vue";
import ExploreCard from "../ExploreCard.vue";
import { RAIL_MIN_HEIGHT_QUERY } from "@/helper/exploreRail";
import { STAGE_DESKTOP_QUERY, STAGE_LAYER_ID } from "@/helper/stageLayer";

vi.mock("gsap/ScrollTrigger", () => ({
  default: { refresh: vi.fn(), addEventListener: vi.fn() },
}));

const HISTORY = "foundations-of-neuroscience";
const part = (id, title) => ({
  id,
  explore: { title, prompt: `Explore more about ${title}` },
});
const section = {
  id: "s-a",
  kind: "box",
  slug: "box-sacred-disease",
  title: "Hippocrates: the sacred disease and the four humours",
  paragraphs: [
    part("p1", "Hippocrates’ view on epilepsy"),
    part("p2", "Humoral theory"),
  ],
};

let savedMatchMedia;
let savedScrollTo;
let desktop;

beforeEach(() => {
  savedMatchMedia = window.matchMedia;
  savedScrollTo = window.scrollTo;
  desktop = true;
  // The two-column breakpoint (FullBleed) says yes; the reduced-motion
  // query (readerJump) says no.
  window.matchMedia = (query) => ({
    matches: desktop && !String(query).includes("reduced-motion"),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  window.scrollTo = vi.fn();
});
afterEach(() => {
  window.matchMedia = savedMatchMedia;
  window.scrollTo = savedScrollTo;
  document.body.innerHTML = "";
});

/** The reader's stage layer: with it, at desktop widths, the box floats. */
function addStageLayer() {
  const layer = document.createElement("div");
  layer.id = STAGE_LAYER_ID;
  document.body.appendChild(layer);
  return layer;
}

function mountBox({ box = section, chapterSlug = HISTORY, props = {} } = {}) {
  return mount(BreakoutBox, {
    attachTo: document.body,
    props: { section: box, label: "A", pairedExplores: true, ...props },
    slots: {
      // As SectionComp renders a box's paragraphs.
      default: () =>
        h("div", [
          h(
            "div",
            { class: "section-paragraphs--paired" },
            box.paragraphs.map((p) =>
              h("div", { class: "explore-pair-item", key: p.id }, [
                h(
                  ExploreCard,
                  { explore: p.explore, paragraphId: p.id, paired: true },
                  () => h("div", { class: "P", id: p.id }, `Text of ${p.id}`)
                ),
              ])
            )
          ),
        ]),
    },
    global: { provide: { chapterSlug: computed(() => chapterSlug) } },
  });
}

describe("BreakoutBox rail", () => {
  it("lays the Hippocrates box's parts on one track, with its nav", async () => {
    const layer = addStageLayer();
    const w = mountBox();
    await flushPromises();

    // Teleported into the stage layer, so looked up there.
    const pause = layer.querySelector(".bx-pause");
    expect(pause.hasAttribute("data-rail-pause")).toBe(true);
    expect(pause.querySelector("aside.bx").classList).toContain("bx--rail");

    const track = pause.querySelector("[data-rail-scroller]");
    expect(track.classList).toContain("bx-body");
    expect(track.getAttribute("tabindex")).toBe("0");
    expect(track.getAttribute("role")).toBe("group");
    expect(track.getAttribute("aria-label")).toContain("2 parts");
    // Nothing is laid out here, so there is no travel and the page does
    // not drive the track.
    expect(track.getAttribute("data-rail-pinned")).toBe("0");

    // Both parts open on the track: no fold, no "Explore more" button.
    const parts = track.querySelectorAll("[data-explore]");
    expect([...parts].map((p) => p.getAttribute("data-explore"))).toEqual([
      "p1",
      "p2",
    ]);
    expect(track.querySelectorAll(".xc--rail")).toHaveLength(2);
    expect(track.querySelector(".xc-btn")).toBeNull();
    expect(track.querySelector("[hidden]")).toBeNull();
    expect(track.querySelector("#p2").textContent).toBe("Text of p2");

    // The parts by name, the first current; Previous has nowhere to go.
    const nav = pause.querySelector("nav.bx-rail-nav");
    const names = [...nav.querySelectorAll(".bx-rail-part")];
    expect(names.map((b) => b.textContent.replace(/\s+/g, " ").trim())).toEqual(
      ["01 Hippocrates’ view on epilepsy", "02 Humoral theory"]
    );
    expect(names[0].getAttribute("aria-current")).toBe("true");
    expect(names[1].hasAttribute("aria-current")).toBe(false);
    const [prev, next] = nav.querySelectorAll(".bx-rail-arrow");
    expect(prev.getAttribute("aria-label")).toBe("Previous");
    expect(prev.disabled).toBe(true);
    expect(next.getAttribute("aria-label")).toBe("Next");
    w.unmount();
  });

  it("stays fold-out cards where the box does not float", async () => {
    // No stage layer (Storybook, a phone): the box is in the column.
    const w = mountBox();
    await flushPromises();
    expect(w.find("[data-rail-pause]").exists()).toBe(false);
    expect(w.find("[data-rail-scroller]").exists()).toBe(false);
    expect(w.find(".bx--rail").exists()).toBe(false);
    expect(w.find("nav.bx-rail-nav").exists()).toBe(false);
    expect(w.findAll(".xc-btn")).toHaveLength(2);
    expect(w.findAll(".xc-panel[hidden]")).toHaveLength(2);
    expect(w.find(".bx-body").attributes("tabindex")).toBeUndefined();
    w.unmount();
  });

  it("is only the boxes on trial, unless the prop says so", async () => {
    const layer = addStageLayer();
    const other = { ...section, id: "s-b", slug: "box-rete-mirabile" };
    const fold = mountBox({ box: other });
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).toBeNull();
    expect(layer.querySelectorAll(".xc-btn")).toHaveLength(2);
    fold.unmount();

    const forced = mountBox({ box: other, props: { rail: true } });
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).not.toBeNull();
    forced.unmount();

    const off = mountBox({ props: { rail: false } });
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).toBeNull();
    off.unmount();
  });

  it("goes back to cards when the window narrows or is too short for a track", async () => {
    const layer = addStageLayer();
    // Each query's listeners, so one breakpoint can be crossed at a time.
    const listeners = new Map();
    const off = new Set();
    window.matchMedia = (query) => ({
      get matches() {
        return !off.has(query) && !String(query).includes("reduced-motion");
      },
      addEventListener: (_, fn) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query).add(fn);
      },
      removeEventListener: (_, fn) => listeners.get(query)?.delete(fn),
    });
    const cross = (query, matches) => {
      if (matches) off.delete(query);
      else off.add(query);
      for (const fn of listeners.get(query) || []) fn({ matches });
    };
    const w = mountBox();
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).not.toBeNull();

    // Below the two-column reader the box is back in the column.
    cross(STAGE_DESKTOP_QUERY, false);
    await flushPromises();
    expect(w.find("[data-rail-scroller]").exists()).toBe(false);
    expect(w.findAll(".xc-btn")).toHaveLength(2);

    cross(STAGE_DESKTOP_QUERY, true);
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).not.toBeNull();

    // Wide but short: the box still floats, as cards.
    cross(RAIL_MIN_HEIGHT_QUERY, false);
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).toBeNull();
    expect(layer.querySelector(".bx--floating")).not.toBeNull();
    expect(layer.querySelectorAll(".xc-btn")).toHaveLength(2);
    w.unmount();
  });

  it("moves by scrolling the page once the track has somewhere to go", async () => {
    const layer = addStageLayer();
    const w = mountBox();
    await flushPromises();
    const pause = layer.querySelector(".bx-pause");
    const track = pause.querySelector("[data-rail-scroller]");
    // Give the track a layout: 1440 wide, 3140 of content, part two at 1310,
    // the box 2000px down the viewport, pinning 64px from its top.
    Object.defineProperty(track, "clientWidth", { value: 1440 });
    Object.defineProperty(track, "scrollWidth", { value: 3140 });
    track.getBoundingClientRect = () => ({ left: 0 });
    const [one, two] = track.querySelectorAll("[data-explore]");
    one.getBoundingClientRect = () => ({ left: 0 - track.scrollLeft });
    two.getBoundingClientRect = () => ({ left: 1310 - track.scrollLeft });
    pause.getBoundingClientRect = () => ({ top: 2000 });
    pause.querySelector("aside.bx").style.top = "64px";
    Object.defineProperty(window, "innerHeight", {
      value: 900,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await flushPromises();

    expect(track.getAttribute("data-rail-pinned")).toBe("1");
    expect(track.getAttribute("data-rail-lead")).toBe("180");
    expect(track.getAttribute("data-rail-top")).toBe("64");
    // The spacer is the travel (1700) plus the lead at each end.
    expect(pause.querySelector(".bx-pause-room").style.height).toBe("2060px");

    // Next: the page scrolls to where part two is across (the box pins at
    // 2000 − 64, then the 180px lead, then 1310).
    pause.querySelector('.bx-rail-arrow[aria-label="Next"]').click();
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1936 + 180 + 1310,
      behavior: "smooth",
    });
    // By name: back to part one.
    pause.querySelector(".bx-rail-part").click();
    expect(window.scrollTo).toHaveBeenLastCalledWith({
      top: 1936 + 180,
      behavior: "smooth",
    });

    // The page arrives there: the track follows, and the nav says so.
    pause.getBoundingClientRect = () => ({ top: 64 - 180 - 1310 });
    window.dispatchEvent(new Event("scroll"));
    await flushPromises();
    expect(track.scrollLeft).toBe(1310);
    const names = pause.querySelectorAll(".bx-rail-part");
    expect(names[1].getAttribute("aria-current")).toBe("true");
    expect(
      pause.querySelector('.bx-rail-arrow[aria-label="Previous"]').disabled
    ).toBe(false);
    expect(pause.style.getPropertyValue("--rail-progress")).not.toBe("0");
    w.unmount();
    // Let go of the smooth jumps still trying to land.
    window.dispatchEvent(new Event("wheel"));
  });
});
