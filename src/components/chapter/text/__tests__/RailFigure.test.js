/*
 * RailFigure (OPENBRAIN-194): a picture on a side-scrolling box's track is
 * just the picture. Its label and title, its images as plates, a button on
 * each that opens the book's viewer full screen (where the legend is), and
 * the legends kept in the document for screen readers. No Legend control,
 * thumbnails, play/pause or view-all.
 */
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import RailFigure from "../RailFigure.vue";

const stubs = {
  DemoModal: {
    props: ["show", "title", "ground"],
    template:
      '<div v-if="show" class="stub-dialog" :data-title="title" :data-ground="ground"><slot name="title" /><slot /></div>',
  },
  FigureImages: {
    props: ["images", "index", "view", "caption", "large"],
    template:
      '<div class="stub-viewer" :data-index="index" :data-view="view" :data-large="large">{{ images[index].caption || caption }}</div>',
  },
};

const two = [
  { src: "/img/e1.jpg", alt: "Instruments", caption: "His instruments." },
  { src: "/img/e2.jpg", alt: "", caption: "" },
];

const mountFigure = (props, mode = "track") =>
  mount(RailFigure, {
    props,
    global: { stubs, provide: { exploreRail: ref(mode) } },
    attachTo: document.body,
  });

describe("RailFigure", () => {
  it("is a labelled image with its expand button on the label's row", async () => {
    const w = mountFigure({
      label: "FIG F",
      title: "Freeman's transorbital lobotomy",
      images: [{ src: "/img/f.jpg", alt: "", caption: "" }],
      caption: "Freeman at work, 1949.",
    });
    expect(w.attributes("aria-label")).toBe(
      "FIG F: Freeman's transorbital lobotomy"
    );
    expect(w.find(".rf-bar .rf-label").text()).toBe("FIG F");
    expect(w.find(".rf-bar button").attributes("aria-label")).toBe(
      "Expand to full screen"
    );
    expect(w.findAll("button")).toHaveLength(1);
    // Without an alt of its own the image is described by its legend.
    expect(w.find("img").attributes("alt")).toBe("Freeman at work, 1949.");
    // The legend is not shown, and is still read.
    const legend = w.find("figcaption");
    expect(legend.classes()).toContain("sr-only");
    expect(legend.text()).toBe("Freeman at work, 1949.");
    await w.find("button").trigger("click");
    const dialog = w.find(".stub-dialog");
    expect(dialog.attributes("data-title")).toBe(
      "FIG F: Freeman's transorbital lobotomy"
    );
    expect(dialog.find(".rf-fs-label").text()).toBe("FIG F");
    expect(dialog.find(".stub-viewer").text()).toBe("Freeman at work, 1949.");
    expect(dialog.find(".stub-viewer").attributes("data-large")).toBeDefined();
    w.unmount();
  });

  it("puts a button on each image of a set, and opens the viewer on that image", async () => {
    const w = mountFigure({
      label: "FIG E",
      title: "Burckhardt's cortical excisions",
      images: two,
      caption: "The figure's legend.",
    });
    expect(w.attributes("data-rail-plates")).toBe("2");
    expect(w.find(".rf-bar button").exists()).toBe(false);
    const buttons = w.findAll("[data-rail-plate] button");
    expect(buttons.map((b) => b.attributes("aria-label"))).toEqual([
      "Expand image 1 of 2 to full screen",
      "Expand image 2 of 2 to full screen",
    ]);
    // Both legends are read, each once.
    expect(w.find("figcaption.sr-only").text()).toBe(
      "His instruments. The figure's legend."
    );
    await buttons[1].trigger("click");
    const viewer = w.find(".stub-viewer");
    expect(viewer.attributes("data-index")).toBe("1");
    expect(viewer.attributes("data-view")).toBe("single");
    expect(viewer.text()).toBe("The figure's legend.");
    w.unmount();
  });

  it("gives an unlabelled picture no bar: the button is on its corner", () => {
    const w = mountFigure({
      images: [{ src: "/img/bust.jpg", alt: "A bust", caption: "A bust." }],
      name: "Hippocrates’ view on epilepsy",
    });
    expect(w.find(".rf-bar").exists()).toBe(false);
    expect(w.classes()).toContain("rf--bare");
    expect(w.find("[data-rail-plate] button").classes()).toContain(
      "rf-expand--on"
    );
    expect(w.attributes("aria-label")).toBe("Hippocrates’ view on epilepsy");
    w.unmount();
  });

  it("sizes a plate by its image once it has loaded", async () => {
    const w = mountFigure({ images: two, label: "FIG E" });
    const plate = w.find("[data-rail-plate]");
    expect(plate.attributes("style")).toBeUndefined();
    const img = plate.find("img").element;
    Object.defineProperty(img, "naturalWidth", { value: 1500 });
    Object.defineProperty(img, "naturalHeight", { value: 1000 });
    await plate.find("img").trigger("load");
    expect(plate.attributes("style")).toContain("--rf-ratio: 1.5");
    w.unmount();
  });

  it("is a page for each image on a phone's swipe track", () => {
    const w = mountFigure({ images: two, label: "FIG E" }, "swipe");
    expect(w.classes()).toContain("rf--swipe");
    expect(w.attributes("style")).toContain("--rf-count: 2");
    w.unmount();
  });

  it("opens on the paper ground in a chapter whose figure pane is paper", async () => {
    const reader = document.createElement("div");
    reader.className = "chapter-reader";
    reader.innerHTML =
      '<div class="figure-pane" data-ground="paper"></div><div id="host"></div>';
    document.body.appendChild(reader);
    const w = mount(RailFigure, {
      props: { images: [two[0]], label: "FIG 2", title: "A figure" },
      global: { stubs, provide: { exploreRail: ref("track") } },
      attachTo: reader.querySelector("#host"),
    });
    await w.find("button").trigger("click");
    expect(w.find(".stub-dialog").attributes("data-ground")).toBe("paper");
    // The paper dialog keeps its plain title.
    expect(w.find(".rf-fs-label").exists()).toBe(false);
    w.unmount();
    reader.remove();
  });
});
