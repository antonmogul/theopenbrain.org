import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";
import { FIGURE_TINT } from "@/helper/figureTint";

/* OPENBRAIN-93 (Maura, 26 Nov): a figure that is also its section's card
   opens with its whole art box in the chapter's colour. A white ground lies
   under the picture and the colour over it, multiplied; the pane clears the
   two together and never touches the picture. */
const SKULL = {
  id: "animationFoundationsFig1",
  figureNumber: 2,
  title: "Trepanned Inca skull",
  caption: "A skull with a square opening.",
  images: [
    {
      src: "/publicAssets/images/foundations/fig01-skull-cutout-v2.webp",
      alt: "An engraving of a skull with a square opening cut into its brow",
    },
  ],
};
// The brain of H.M. names the section's violet cover as its washed copy.
const BRAIN = {
  id: "animationFoundationsClosingHM",
  figureNumber: 26,
  title: "The brain of H.M.",
  fill: true,
  images: [
    {
      src: "/publicAssets/images/foundations/hm-brain-v3.webp",
      wash: "/publicAssets/images/foundations/sections/closing-words-v2.webp",
      alt: "A human brain seen from the side",
    },
  ],
};

let wrapper;
const pane = (value = 0.75) => ({
  provide: { [FIGURE_TINT]: { current: () => value } },
  stubs: { Transition: true },
});
const mountShell = (animation, props = {}, global = pane()) =>
  (wrapper = mount(IllustrationPlaceholder, {
    attachTo: document.body,
    props: { animation, ...props },
    global,
  }));
const layers = () => wrapper.findAll("[data-figure-wash]");

describe("the section opener's wash on a figure", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-reduce-motion", "0");
  });
  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.documentElement.removeAttribute("data-reduce-motion");
    document.body.innerHTML = "";
  });

  it("puts a ground under the picture and the colour over it, in the art box", () => {
    mountShell(SKULL, { sectionWash: true });
    const area = wrapper.get(".fig-area");
    expect(area.classes()).toContain("fig-area--veiled");
    // Children of the art box itself, so they cover its padding too, in
    // paint order: ground, the picture, colour.
    const order = [...area.element.children].map((el) => el.className);
    expect(order).toHaveLength(3);
    expect(order[0]).toContain("fig-veil--ground");
    expect(order[1]).toContain("figimg");
    expect(order[2]).toContain("fig-veil--colour");
    for (const layer of layers())
      expect(layer.attributes("aria-hidden")).toBe("true");
  });

  it("gives both layers the pane's opacity of the moment, so they clear together", () => {
    mountShell(SKULL, { sectionWash: true }, pane(0.4));
    expect(layers().map((l) => l.element.style.opacity)).toEqual([
      "0.4",
      "0.4",
    ]);
  });

  it("leaves the picture alone: one image, no recoloured copy", () => {
    mountShell(SKULL, { sectionWash: true });
    const pictures = wrapper.findAll(".fig-area img");
    expect(pictures).toHaveLength(1);
    expect(pictures[0].attributes("src")).toBe(SKULL.images[0].src);
    expect(pictures[0].attributes("alt")).toBe(SKULL.images[0].alt);
    expect(pictures[0].element.style.opacity).toBe("");
    expect(wrapper.find(".fig-area filter").exists()).toBe(false);
  });

  it("washes a photograph the same way, not with its baked copy", () => {
    mountShell(BRAIN, { sectionWash: true });
    expect(layers()).toHaveLength(2);
    const pictures = wrapper.findAll(".fig-area img");
    expect(pictures).toHaveLength(1);
    expect(pictures[0].attributes("src")).toBe(BRAIN.images[0].src);
    expect(wrapper.get(".fig-area").classes()).toContain("fig-area--fill");
  });

  it("has no layers on a figure that is not a section's card", () => {
    mountShell(SKULL);
    expect(layers()).toHaveLength(0);
    expect(wrapper.get(".fig-area").classes()).not.toContain(
      "fig-area--veiled"
    );
    // The artwork, and never the "artwork pending" tile beside it.
    expect(wrapper.find(".fig-area .figimg").exists()).toBe(true);
    expect(wrapper.find(".fig-placeholder").exists()).toBe(false);
  });

  it("keeps the placeholder tile for a figure with no artwork", () => {
    mountShell({ ...SKULL, images: [] }, { sectionWash: true });
    expect(layers()).toHaveLength(0);
    expect(wrapper.find(".fig-placeholder").exists()).toBe(true);
  });

  it("has no layers outside the pane (nothing would clear them)", () => {
    mountShell(SKULL, { sectionWash: true }, { stubs: { Transition: true } });
    expect(layers()).toHaveLength(0);
  });

  it("has no layers in the text column", () => {
    mountShell(SKULL, { sectionWash: true, inline: true });
    expect(layers()).toHaveLength(0);
  });

  it("has no layers under reduced motion", () => {
    document.documentElement.setAttribute("data-reduce-motion", "1");
    mountShell(SKULL, { sectionWash: true });
    expect(layers()).toHaveLength(0);
  });

  it("has no layers on a film, a gallery or a picture that opted out", () => {
    const [still] = SKULL.images;
    for (const images of [
      [{ ...still, youtube: "g4-6A8u8QBc" }],
      [still, { ...still, src: "/second.webp" }],
      [{ ...still, tint: false }],
    ]) {
      mountShell({ ...SKULL, images }, { sectionWash: true });
      expect(layers()).toHaveLength(0);
      wrapper.unmount();
    }
    wrapper = null;
  });
});
