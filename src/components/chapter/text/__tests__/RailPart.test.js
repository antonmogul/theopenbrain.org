/*
 * RailPart (OPENBRAIN-187): one part of a sideways box. Its pictures come
 * first, each once, as figures with their legend and expand button; then
 * its text, in the columns the track measures. An Explore part's own
 * picture is left out where a figure already shows that file (Stuart, 12
 * Nov, on the rete mirabile), and kept where it is art of its own.
 */
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import RailPart from "../RailPart.vue";

const records = ref([
  { id: "figC", images: [{ src: "/publicAssets/images/foundations/c.jpg" }] },
  { id: "figK", images: [{ src: "/publicAssets/images/foundations/k.jpg" }] },
]);
vi.mock("@/composables/useAnimations", () => ({
  useAnimations: () => ({
    animations: records,
    fetchAnimations: async () => ({ data: records.value }),
  }),
}));

const stubs = {
  IllustrationInline: {
    props: ["animationId"],
    template: '<figure class="stub-figure" :data-id="animationId"></figure>',
  },
  DemoModal: {
    props: ["show", "title"],
    template: '<div v-if="show" class="stub-dialog"><slot /></div>',
  },
};

const mountPart = (props, mode = "track") =>
  mount(RailPart, {
    props: { part: { id: "p1", title: "", explore: false }, ...props },
    slots: { default: '<div class="P" id="p1">Text of p1</div>' },
    global: { stubs, provide: { exploreRail: ref(mode) } },
  });

describe("RailPart", () => {
  it("leads with its figures, then its text in columns", () => {
    const w = mountPart({ figures: ["figA", "figB"], index: 1, count: 3 });
    const root = w.find("[data-rail-part]");
    expect(root.attributes("aria-label")).toBe("Part 2 of 3");
    expect(root.attributes("data-explore")).toBeUndefined();
    const children = [...root.element.children];
    expect(children.map((c) => c.getAttribute("data-rail-figure-id"))).toEqual([
      "figA",
      "figB",
      null,
    ]);
    expect(children[2].hasAttribute("data-rail-columns")).toBe(true);
    expect(children[2].querySelector("#p1").textContent).toBe("Text of p1");
    expect(root.attributes("style")).toContain("--rail-figures: 2");
    expect(root.classes()).toContain("rp--track");
  });

  it("names an Explore part by its title, which leads the columns", () => {
    const w = mountPart({
      part: { id: "p1", title: "The rete mirabile", explore: true },
    });
    const root = w.find("[data-rail-part]");
    expect(root.attributes("data-explore")).toBe("p1");
    expect(root.attributes("aria-labelledby")).toBe("rail-part-title-p1");
    const columns = w.find("[data-rail-columns]");
    expect(columns.element.firstElementChild.id).toBe("rail-part-title-p1");
    expect(columns.find("h3").text()).toBe("The rete mirabile");
    expect(root.classes()).toContain("rp--no-picture");
  });

  it("shows a picture once: not the card image when a figure shows it", async () => {
    const w = mountPart({
      part: { id: "p1", title: "The rete mirabile", explore: true },
      figures: ["figC"],
      image: { src: "/publicAssets/images/foundations/c.jpg", alt: "Galen" },
      legend: "Galen's physiology.",
    });
    await nextTick();
    expect(w.find(".rp-picture").exists()).toBe(false);
    expect(w.findAll("[data-rail-figure]")).toHaveLength(1);
  });

  it("keeps a card image that is art of its own, first, with legend and expand", async () => {
    const w = mountPart({
      part: { id: "p1", title: "Humoral theory", explore: true },
      figures: ["figK"],
      image: { src: "/publicAssets/images/foundations/woodcut.jpg", alt: "A" },
      legend: "Woodcut, 1574.",
    });
    await nextTick();
    const figures = w.findAll("[data-rail-figure]");
    expect(figures).toHaveLength(2);
    expect(figures[0].classes()).toContain("rp-picture");
    expect(figures[0].find("img").attributes("src")).toBe(
      "/publicAssets/images/foundations/woodcut.jpg"
    );
    expect(figures[0].find("figcaption").text()).toBe("Woodcut, 1574.");
    expect(w.find("[data-rail-part]").attributes("style")).toContain(
      "--rail-figures: 2"
    );
    // Its expand button opens it full screen.
    expect(w.find(".stub-dialog").exists()).toBe(false);
    await w.find(".rp-expand").trigger("click");
    expect(w.find(".stub-dialog img").attributes("src")).toBe(
      "/publicAssets/images/foundations/woodcut.jpg"
    );
  });

  it("lays out as pages on a phone's swipe track", () => {
    const w = mountPart({ figures: ["figA"] }, "swipe");
    expect(w.find("[data-rail-part]").classes()).toContain("rp--swipe");
  });
});
