/*
 * RailPart (OPENBRAIN-187, 194): one part of a sideways box. Its pictures
 * come first, each once; then its text, in the columns the track measures.
 * An Explore part's own picture is left out where a figure already shows
 * that file (Stuart, 12 Nov, on the rete mirabile), and kept where it is
 * art of its own. A picture is just the picture (Stuart, 14 Nov): an image
 * figure of up to three stills is drawn as plates, with no legend on the
 * track and no gallery controls; anything else is the figure shell's.
 */
import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick, ref } from "vue";
import RailPart from "../RailPart.vue";

const records = ref([
  { id: "figC", images: [{ src: "/publicAssets/images/foundations/c.jpg" }] },
  {
    id: "figK",
    figureNumber: "K",
    title: "The four humors",
    caption: "The four humours, a diagram.",
    images: [{ src: "/publicAssets/images/foundations/k.jpg" }],
  },
  {
    id: "figE",
    figureNumber: "E",
    title: "Burckhardt's cortical excisions",
    images: [
      { src: "/img/e1.jpg", caption: "His instruments." },
      { src: "/img/e2.jpg", caption: "One of his patients." },
    ],
  },
  {
    id: "figFilm",
    title: "An interview",
    images: [
      { src: "/img/poster.jpg", youtube: "WgkAR-vrJpM", play: "player" },
    ],
  },
  {
    id: "figMany",
    images: ["/img/1.jpg", "/img/2.jpg", "/img/3.jpg", "/img/4.jpg"],
  },
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
  FigureImages: {
    props: ["images", "index", "caption"],
    template:
      '<div class="stub-viewer" :data-index="index"><img :src="images[index].src" /><p>{{ images[index].caption || caption }}</p></div>',
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

  it("keeps a card image that is art of its own, first: the image and its expand button, the legend for the full-screen view", async () => {
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
    // No legend to see on the track; a screen reader still has it.
    const legend = figures[0].find("figcaption");
    expect(legend.classes()).toContain("sr-only");
    expect(legend.text()).toBe("Woodcut, 1574.");
    expect(w.find("[data-rail-part]").attributes("style")).toContain(
      "--rail-figures: 2"
    );
    // Two images in the part: the text beside them is one column.
    expect(w.find("[data-rail-part]").classes()).toContain("rp--pictures");
    // Its expand button opens it full screen, where the legend shows.
    expect(w.find(".stub-dialog").exists()).toBe(false);
    await figures[0].find(".rf-expand").trigger("click");
    expect(w.find(".stub-dialog img").attributes("src")).toBe(
      "/publicAssets/images/foundations/woodcut.jpg"
    );
    expect(w.find(".stub-dialog p").text()).toBe("Woodcut, 1574.");
  });

  it("draws an image figure with its label and legend control below", async () => {
    const w = mountPart({ figures: ["figK"] });
    await nextTick();
    const fig = w.find('[data-rail-figure-id="figK"]');
    expect(fig.classes()).toContain("rf");
    expect(fig.find(".rf-label").text()).toBe("FIG K");
    expect(fig.find(".rf-name").text()).toBe("The four humors");
    expect(fig.findAll("[data-rail-plate]")).toHaveLength(1);
    expect(fig.findAll("button")).toHaveLength(1);
    expect(fig.find("button").attributes("aria-label")).toBe(
      "Expand to full screen"
    );
    expect(fig.find(".rf-bar summary").text()).toBe("Legend");
    expect(fig.find("figcaption.sr-only").text()).toBe(
      "The four humours, a diagram."
    );
    expect(w.find(".stub-figure").exists()).toBe(false);
    expect(w.find("[data-rail-part]").classes()).not.toContain("rp--pictures");
  });

  it("shows a set of two as two plates, each with its own expand button (the doctor with an icepick)", async () => {
    const w = mountPart({ figures: ["figE"] });
    await nextTick();
    const fig = w.find('[data-rail-figure-id="figE"]');
    expect(fig.attributes("data-rail-plates")).toBe("2");
    const plates = fig.findAll("[data-rail-plate]");
    expect(plates.map((p) => p.find("img").attributes("src"))).toEqual([
      "/img/e1.jpg",
      "/img/e2.jpg",
    ]);
    // Nothing but the images and their buttons: no thumbnails, arrows,
    // play/pause or view-all.
    expect(
      fig.findAll("button").map((b) => b.attributes("aria-label"))
    ).toEqual([
      "Expand image 1 of 2 to full screen",
      "Expand image 2 of 2 to full screen",
    ]);
    expect(w.find("[data-rail-part]").classes()).toContain("rp--pictures");
    // The second opens the viewer on the second image, with its legend.
    await plates[1].find("button").trigger("click");
    expect(w.find(".stub-viewer").attributes("data-index")).toBe("1");
    expect(w.find(".stub-viewer p").text()).toBe("One of his patients.");
  });

  it("leaves a video and a larger set to the figure shell", async () => {
    const w = mountPart({ figures: ["figFilm", "figMany"] });
    await nextTick();
    const figures = w.findAll("[data-rail-figure]");
    expect(
      figures.map((f) => f.classes().includes("rp-figure--shell"))
    ).toEqual([true, true]);
    expect(
      w.findAll(".stub-figure").map((f) => f.attributes("data-id"))
    ).toEqual(["figFilm", "figMany"]);
  });

  it("lays out as pages on a phone's swipe track", async () => {
    const w = mountPart({ figures: ["figA", "figE"] }, "swipe");
    await nextTick();
    expect(w.find("[data-rail-part]").classes()).toContain("rp--swipe");
    const fig = w.find('[data-rail-figure-id="figE"]');
    expect(fig.classes()).toContain("rf--swipe");
    // A page for each plate.
    expect(fig.attributes("style")).toContain("--rf-count: 2");
  });

  /* The box opens on a still title card (OPENBRAIN-77): the lead picture
     is on the card, so the first part leaves it off the track. */
  describe("under a still title card", () => {
    const carded = (props) =>
      mount(RailPart, {
        props: { part: { id: "p1", title: "", explore: false }, ...props },
        global: {
          stubs,
          provide: { exploreRail: ref("swipe"), railLeadOnCard: ref(true) },
        },
      });

    it("leaves a figure's only image out, and keeps it for the card's expand button", async () => {
      const w = carded({ figures: ["figK"] });
      await nextTick();
      expect(w.findAll("[data-rail-figure]")).toHaveLength(0);
      expect(w.find(".rp").classes()).toContain("rp--no-picture");
      const kept = w.find("[data-rail-card-figure]");
      expect(kept.exists()).toBe(true);
      expect(kept.find("img").attributes("src")).toContain("k.jpg");
      // The card's button presses this one: the full-screen view opens.
      await kept.find(".rf-expand").trigger("click");
      expect(w.find(".stub-dialog").exists()).toBe(true);
      w.unmount();
    });

    it("leaves out only the first image of a set, under the figure's label", async () => {
      const w = carded({ figures: ["figE"] });
      await nextTick();
      const shown = w.findAll("[data-rail-figure] img");
      expect(shown.map((img) => img.attributes("src"))).toEqual([
        "/img/e2.jpg",
      ]);
      expect(w.find("[data-rail-figure] .rf-label").text()).toBe("FIG E");
      expect(w.find("[data-rail-card-figure] img").attributes("src")).toBe(
        "/img/e1.jpg"
      );
      w.unmount();
    });

    it("leaves an Explore part's own picture out", async () => {
      const w = carded({
        part: { id: "p1", title: "Hippocrates’ view", explore: true },
        image: { src: "/img/bust.jpg", alt: "A bust" },
      });
      await nextTick();
      expect(w.findAll("[data-rail-figure]")).toHaveLength(0);
      expect(w.find("[data-rail-card-figure] img").attributes("src")).toBe(
        "/img/bust.jpg"
      );
      w.unmount();
    });

    it("touches nothing in a later part, or a figure the shell draws", async () => {
      const later = carded({ figures: ["figK"], index: 1, count: 2 });
      await nextTick();
      expect(later.findAll("[data-rail-figure]")).toHaveLength(1);
      expect(later.find("[data-rail-card-figure]").exists()).toBe(false);
      later.unmount();
      const shell = carded({ figures: ["figMany"] });
      await nextTick();
      expect(shell.findAll("[data-rail-figure]")).toHaveLength(1);
      expect(shell.find("[data-rail-card-figure]").exists()).toBe(false);
      shell.unmount();
    });
  });
});
