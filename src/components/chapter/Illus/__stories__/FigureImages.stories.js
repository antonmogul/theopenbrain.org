/*
 * Chapter/Illustrations/FigureImages — the artwork inside the figure shell:
 * one image, or a set shown as a gallery grid whose thumbnails open a
 * full-viewport viewer (arrows, Esc, filmstrip; OPENBRAIN-97). Purely
 * prop-driven.
 */
import FigureImages from "../FigureImages.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";
import {
  FIG2_IMAGES,
  FIG2_LEGEND,
  FIG6_IMAGES,
  FIG7_IMAGES,
  FIG7_LEGEND,
} from "./figureImageFixtures";

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
    fit: true,
  },
  argTypes: {
    images: {
      control: "object",
      description:
        "[{ src, caption?, alt? }] as normalised by figureImages(). One image renders on its own; several render as a gallery.",
    },
    caption: {
      description: "Figure-level caption, used when an image has none.",
    },
    large: { description: "Fullscreen overlay sizing." },
    fit: {
      description:
        "The container has a fixed height (the pinned pane): size the grid to fit it. Off inline, where the grid flows.",
    },
  },
  render: chapterFrame(FigureImages, {
    template: `<div style="height:720px;padding:20px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** A gallery where every plate has its own (long) caption, shown in the
 *  viewer only (History Figure 6). */
export const GalleryWithCaptions = {};

/** A gallery under one shared legend (History Figure 7). Select a plate to
 *  open the viewer. */
export const GallerySharedLegend = {
  args: {
    images: FIG7_IMAGES,
    caption: FIG7_LEGEND,
    label: "FIG 07",
    title: "Vesalius, De humani corporis fabrica",
  },
};

/** Animation frames: the same skull, a hand demonstrating each method in
 *  turn (History Figure 2). Short captions sit under their thumbnails. */
export const AnimationFrames = {
  args: {
    images: FIG2_IMAGES,
    caption: FIG2_LEGEND,
    label: "FIG 02",
    title: "Methods of trepanation",
  },
};

/** Inline in the text column (below 1024px): the grid takes the height it
 *  needs instead of fitting a fixed box. */
export const GalleryInline = {
  args: {
    images: FIG7_IMAGES,
    caption: FIG7_LEGEND,
    label: "FIG 07",
    title: "Vesalius, De humani corporis fabrica",
    fit: false,
  },
  render: chapterFrame(FigureImages, {
    template: `<div style="max-width:390px;padding:16px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** A single image: no grid, no viewer. */
export const SingleImage = {
  args: { images: FIG7_IMAGES.slice(0, 1), caption: FIG7_LEGEND },
};

/** A set with a video item (OPENBRAIN-134): the last still loops a muted
 *  YouTube clip in the viewer. Reduced motion keeps the still and adds a
 *  link to the video. */
export const GalleryWithVideoLoop = {
  args: {
    images: [
      {
        src: "/publicAssets/images/foundations/hm-brenda-milner.jpg",
        alt: "Black-and-white portrait of Brenda Milner.",
        caption: "Brenda Milner.",
      },
      {
        src: "/publicAssets/images/foundations/hm-scoville-surgery.jpg",
        alt: "Surgeons operating.",
        caption: "William Beecher Scoville performing surgery.",
      },
      {
        src: "/publicAssets/images/foundations/hm-smoking-1958.jpg",
        alt: "Henry Molaison seated outside, smoking.",
        caption: "Henry Molaison (H.M.), 1958.",
      },
      {
        src: "/publicAssets/images/foundations/hm-brain-slicing.jpg",
        alt: "H.M.'s frozen brain being cut into thin sections.",
        caption: "H.M.'s brain being sectioned after his death.",
        youtube: "OmmH4Rp9-to",
      },
    ],
    caption:
      "Brenda Milner, William Beecher Scoville, and Henry Molaison (H.M.).",
    label: "FIG",
    title: "Brenda Milner and H.M.",
  },
};
