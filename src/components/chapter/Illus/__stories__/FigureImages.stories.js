/*
 * Chapter/Illustrations/FigureImages — the artwork inside the figure shell:
 * one image, or a set that cycles until the reader takes over (pauses on
 * hover/focus, stops once the arrows are used, never runs under
 * reduce-motion). Purely prop-driven.
 */
import FigureImages from "../FigureImages.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";
import { FIG6_IMAGES, FIG7_IMAGES, FIG7_LEGEND } from "./figureImageFixtures";

export default {
  title: "Chapter/Illustrations/FigureImages",
  component: FigureImages,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    images: FIG6_IMAGES,
    caption: "",
    label: "FIG 06",
    title: "The medieval cell doctrine",
    large: false,
  },
  argTypes: {
    images: {
      control: "object",
      description:
        "[{ src, caption?, alt? }] as normalised by figureImages(). One image renders without controls.",
    },
    caption: {
      description: "Figure-level caption, used when an image has none.",
    },
    large: { description: "Fullscreen overlay sizing." },
  },
  render: chapterFrame(FigureImages, {
    template: `<div style="height:720px;padding:20px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** A set where every plate has its own caption (History Figure 6). */
export const CyclingSetWithCaptions = {};

/** A set under one shared legend (History Figure 7). */
export const CyclingSetSharedLegend = {
  args: {
    images: FIG7_IMAGES,
    caption: FIG7_LEGEND,
    label: "FIG 07",
    title: "Vesalius, De humani corporis fabrica",
  },
};

/** A single image: no controls, no cycling. */
export const SingleImage = {
  args: { images: FIG7_IMAGES.slice(0, 1), caption: FIG7_LEGEND },
};
