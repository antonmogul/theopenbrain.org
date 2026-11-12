/*
 * BreakoutBox as a rail (OPENBRAIN-163, 187): a box read sideways. Here:
 * when the box is one and in which mode (the pinned track where it floats,
 * the swipe track in the column), what it renders (the track's DOM
 * contract, the parts by name or a count, Previous / Next, the phone's two
 * cues, what follows the track), and that Next asks the page to scroll on
 * the pinned track, since the page's position is the track's. The geometry
 * is helper/exploreRail.js's and has its own tests; how it looks and moves
 * is checked in a browser (happy-dom lays nothing out).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { computed, h } from "vue";
import BreakoutBox from "../BreakoutBox.vue";
import RailPart from "../RailPart.vue";
import { RAIL_MIN_HEIGHT_QUERY } from "@/helper/exploreRail";
import { STAGE_DESKTOP_QUERY, STAGE_LAYER_ID } from "@/helper/stageLayer";

vi.mock("gsap/ScrollTrigger", () => ({
  default: { refresh: vi.fn(), addEventListener: vi.fn() },
}));
vi.mock("@/composables/useAnimations", async () => {
  const { ref } = await import("vue");
  return {
    useAnimations: () => ({
      animations: ref([]),
      fetchAnimations: async () => ({ data: [] }),
    }),
  };
});

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

function mountBox({
  box = section,
  chapterSlug = HISTORY,
  props = {},
  after = null,
} = {}) {
  return mount(BreakoutBox, {
    attachTo: document.body,
    props: { section: box, label: "A", ...props },
    slots: {
      // As SectionComp renders a sideways box's paragraphs: a row of parts.
      default: () =>
        h("div", [
          h(
            "div",
            { class: "bx-rail-row" },
            box.paragraphs
              .filter((p) => p.type !== "widget")
              .map((p, index) =>
                h(
                  RailPart,
                  {
                    key: p.id,
                    part: {
                      id: p.id,
                      title: p.explore?.title || "",
                      explore: !!p.explore,
                    },
                    index,
                    count: box.paragraphs.length,
                  },
                  () => h("div", { class: "P", id: p.id }, `Text of ${p.id}`)
                )
              )
          ),
        ]),
      ...(after ? { after } : {}),
    },
    global: { provide: { chapterSlug: computed(() => chapterSlug) } },
  });
}

/** Lay a track out as a browser would: `client` wide, `scroll` of content. */
function layOut(track, { client, scroll }) {
  Object.defineProperty(track, "clientWidth", { value: client });
  Object.defineProperty(track, "scrollWidth", { value: scroll });
  track.getBoundingClientRect = () => ({ left: 0 });
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
    expect(track.getAttribute("data-rail-mode")).toBe("track");
    expect(track.getAttribute("tabindex")).toBe("0");
    expect(track.getAttribute("role")).toBe("group");
    expect(track.getAttribute("aria-label")).toContain("2 parts");
    // Nothing is laid out here, so there is no travel and the page does
    // not drive the track.
    expect(track.getAttribute("data-rail-pinned")).toBe("0");

    // Both parts open on the track: no fold, no "Explore more" button.
    const parts = track.querySelectorAll("[data-rail-part]");
    expect([...parts].map((p) => p.getAttribute("data-explore"))).toEqual([
      "p1",
      "p2",
    ]);
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
    expect(nav.querySelector(".bx-rail-where")).toBeNull();
    // No phone cues on the pinned track.
    expect(pause.querySelector(".bx-swipe-nav")).toBeNull();
    const [prev, next] = nav.querySelectorAll(".bx-rail-arrow");
    expect(prev.getAttribute("aria-label")).toBe("Previous");
    expect(prev.disabled).toBe(true);
    expect(next.getAttribute("aria-label")).toBe("Next");
    w.unmount();
  });

  it("is a swipe track where the box does not float (a phone)", async () => {
    // No stage layer (Storybook, a phone): the box is in the column.
    const w = mountBox();
    await flushPromises();
    const track = w.find("[data-rail-scroller]");
    expect(track.attributes("data-rail-mode")).toBe("swipe");
    // Never pinned: the page's scroll is the reader's.
    expect(track.attributes("data-rail-pinned")).toBe("0");
    expect(w.find(".bx--swipe").exists()).toBe(true);
    expect(w.find(".bx--rail").exists()).toBe(false);
    expect(w.find(".bx-pause-room").exists()).toBe(false);
    expect(w.find("nav.bx-rail-nav").exists()).toBe(false);
    // Everything fits (nothing is laid out here): no cues, no snap points.
    expect(w.find(".bx-swipe-nav").exists()).toBe(false);
    expect(w.findAll(".bx-snap")).toHaveLength(0);
    w.unmount();
  });

  it("offers the phone's two cues once there are pages to turn", async () => {
    const w = mountBox();
    await flushPromises();
    const track = w.find("[data-rail-scroller]").element;
    // Four pages of a 390px phone.
    layOut(track, { client: 390, scroll: 4 * 390 });
    track.scrollTo = vi.fn();
    // An image arriving re-measures (a phone's resize at the same width,
    // its address bar moving, does not).
    track.dispatchEvent(new Event("load"));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await flushPromises();

    // A snap point per page, at each page's start.
    const snaps = w.findAll(".bx-snap");
    expect(snaps.map((s) => s.attributes("style"))).toEqual([
      "left: 0%;",
      "left: 100%;",
      "left: 200%;",
      "left: 300%;",
    ]);
    const nav = w.find(".bx-swipe-nav");
    expect(nav.find(".bx-rail-where").text().replace(/\s+/g, "")).toBe("01/04");
    const more = nav.find(".bx-cue--more");
    const on = nav.find(".bx-cue--on");
    expect(more.text()).toBe("Explore more");
    expect(on.text()).toBe("Keep going");
    expect(nav.find('[aria-label="Previous"]').attributes("disabled")).toBe("");

    // "Explore more" turns the track's page; the page itself stays put.
    await more.trigger("click");
    expect(track.scrollTo).toHaveBeenLastCalledWith({
      left: 390,
      behavior: "smooth",
    });
    expect(window.scrollTo).not.toHaveBeenCalled();
    // "Keep going" carries on down the chapter, past the box.
    w.find(".bx-pause").element.getBoundingClientRect = () => ({
      bottom: 900,
    });
    await on.trigger("click");
    expect(window.scrollTo).toHaveBeenLastCalledWith(
      expect.objectContaining({ behavior: "smooth" })
    );
    w.unmount();
    window.dispatchEvent(new Event("wheel"));
  });

  it("is only the boxes on trial, unless the prop says so", async () => {
    const layer = addStageLayer();
    const other = { ...section, id: "s-b", slug: "box-somewhere-else" };
    const fold = mountBox({ box: other });
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).toBeNull();
    expect(layer.querySelector(".bx--rail, .bx--swipe")).toBeNull();
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

  it("swipes when the window narrows, and runs down the page when too short for a track", async () => {
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

    // Below the two-column reader the box is back in the column, a swipe
    // track.
    cross(STAGE_DESKTOP_QUERY, false);
    await flushPromises();
    expect(w.find("[data-rail-scroller]").attributes("data-rail-mode")).toBe(
      "swipe"
    );

    cross(STAGE_DESKTOP_QUERY, true);
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).not.toBeNull();

    // Wide but short: the box still floats, and runs down the page (the
    // text it frames reads the mode and goes back to its cards).
    cross(RAIL_MIN_HEIGHT_QUERY, false);
    await flushPromises();
    expect(layer.querySelector("[data-rail-scroller]")).toBeNull();
    expect(layer.querySelector(".bx--floating")).not.toBeNull();
    expect(layer.querySelector(".bx--rail, .bx--swipe")).toBeNull();
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
    layOut(track, { client: 1440, scroll: 3140 });
    const [one, two] = track.querySelectorAll("[data-rail-part]");
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

  it("counts the stops of a box of ordinary paragraphs, which has no names", async () => {
    const layer = addStageLayer();
    const descartes = {
      id: "s-c",
      kind: "box",
      slug: "box-descartes",
      title: "Separating mind from body: Descartes and dualism",
      paragraphs: [
        { id: "d1", text: "Descartes is often credited…" },
        {
          id: "d4",
          text: "Berzilius gave the skull…",
          animation: { id: "fA" },
        },
      ],
    };
    const w = mountBox({ box: descartes });
    await flushPromises();
    const nav = layer.querySelector("nav.bx-rail-nav");
    expect(nav.querySelector(".bx-rail-parts")).toBeNull();
    expect(nav.querySelector(".bx-rail-where").textContent).toContain("01");
    const parts = layer.querySelectorAll("[data-rail-part]");
    expect(parts).toHaveLength(2);
    expect(parts[1].getAttribute("aria-label")).toBe("Part 2 of 2");
    w.unmount();
  });

  it("puts a widget that ends the box after the track, not on it", async () => {
    const layer = addStageLayer();
    const penfield = {
      id: "s-p",
      kind: "box",
      slug: "box-penfield",
      title: "Wilder Penfield and the Montreal Procedure",
      paragraphs: [
        { id: "p1", text: "Wilder Penfield was born…", animation: { id: "o" } },
        { id: "pw", type: "widget", widget: { widgetId: "upload:binder" } },
      ],
    };
    const after = () => h("div", { class: "the-binder" }, "Binder");
    const w = mountBox({ box: penfield, after });
    await flushPromises();
    const binder = layer.querySelector(".the-binder");
    expect(binder).not.toBeNull();
    expect(binder.closest("[data-rail-scroller]")).toBeNull();
    expect(binder.closest(".bx-after").previousElementSibling).toBe(
      layer.querySelector(".bx-pause")
    );
    w.unmount();

    // Running down the page, the widget is the box's text's own.
    const plain = mountBox({ box: penfield, after, props: { rail: false } });
    await flushPromises();
    expect(layer.querySelector(".bx-after")).toBeNull();
    plain.unmount();
  });
});
