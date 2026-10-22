/*
 * Chapter/Illustrations/FigureImages — the artwork inside the figure shell:
 * one image, or a set shown as a rotating gallery (OPENBRAIN-144): one
 * full-size image at a time, thumbnails under it, arrows at the sides of the
 * stage box, a step every 15 s until the reader takes over. Purely
 * prop-driven.
 *
 * Storybook's Motion toolbar defaults to Reduced, which keeps the clock
 * off; the Autoplay story switches it to app motion so the gallery turns.
 */
import FigureImages from "../FigureImages.vue";
import { chapterFrame } from "../../__stories__/chapterFixtures";
import {
  FIG2_IMAGES,
  FIG2_LEGEND,
  FIG6_ALL_IMAGES,
  FIG7_IMAGES,
  FIG7_LEGEND,
  HM_IMAGES,
  HM_LEGEND,
} from "./figureImageFixtures";

export default {
  title: "Chapter/Illustrations/FigureImages",
  component: FigureImages,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    images: FIG6_ALL_IMAGES,
    caption: "",
    label: "FIG 06",
    title: "The medieval cell doctrine",
    large: false,
    fit: true,
    legendAbove: false,
    index: 0,
  },
  argTypes: {
    images: {
      control: "object",
      description:
        "[{ src, caption?, alt?, youtube?, play? }] as normalised by figureImages(). One image renders on its own; several render as a rotating gallery.",
    },
    caption: {
      description: "Figure-level caption, used when an image has none.",
    },
    large: {
      description: "Fullscreen dialog sizing: bigger arrows and thumbnails.",
    },
    fit: {
      description:
        "The container has a fixed height (the pinned pane, the dialog): the stage takes what the thumbnails and legend leave. Off inline, where the stage is a 4:3 box.",
    },
    legendAbove: {
      description:
        "The shell shows the figure legend above the artwork, so only an image's own caption shows under the thumbnails.",
    },
    index: {
      control: { type: "number", min: 0 },
      description: "The shown image (v-model:index).",
    },
  },
  render: chapterFrame(FigureImages, {
    template: `<div style="height:720px;padding:20px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** Ten plates, each with its own long legend (History Figure 6). Reduced
 *  motion (the Storybook default): the clock is off, so step with the
 *  arrows, the thumbnails or the arrow keys. */
export const TenImages = {};

/** The same set turning on its own: a step every 15 s, paused while the
 *  pointer or focus is on it, stopped by any manual step. Set Motion to
 *  "App motion" in the toolbar, as this story does. */
export const Autoplay = {
  globals: { reduceMotion: false },
};

/** Two images under one shared legend: the smallest set that is a gallery
 *  (History's Figure A, Figure E). */
export const TwoImages = {
  args: {
    images: FIG7_IMAGES.slice(0, 2),
    caption: FIG7_LEGEND,
    label: "FIG 07",
    title: "Vesalius, De humani corporis fabrica",
  },
};

/** Four plates under one shared legend (History Figure 7); the legend is
 *  the figure's, the same under every dot. */
export const GallerySharedLegend = {
  args: {
    images: FIG7_IMAGES,
    caption: FIG7_LEGEND,
    label: "FIG 07",
    title: "Vesalius, De humani corporis fabrica",
  },
};

/** As the shell renders it: the figure legend sits above the artwork, so
 *  only an image's own caption shows under the thumbnails. */
export const LegendAbove = {
  args: {
    images: FIG2_IMAGES,
    caption: FIG2_LEGEND,
    label: "FIG 02",
    title: "Methods of trepanation",
    legendAbove: true,
  },
};

/** In the fullscreen dialog (`large`): bigger arrows and thumbnails, a wider
 *  legend, the stage taking most of the height. */
export const Large = {
  args: { large: true },
  render: chapterFrame(FigureImages, {
    template: `<div style="height:100vh;padding:20px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** Inline in the text column (below 1024px): the stage is a 4:3 box the
 *  width of the column, so the arrows stay put as the plates change. */
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

/** A single image: no thumbnails, no arrows, no clock. */
export const SingleImage = {
  args: { images: FIG7_IMAGES.slice(0, 1), caption: FIG7_LEGEND },
};

/** A set with a video item (OPENBRAIN-134): the last slide loops a muted
 *  YouTube clip. Under reduced motion (here) the still stays, with a link to
 *  the video; switch Motion to "App motion" and step to it for the loop. */
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
    caption: HM_LEGEND,
    label: "FIG",
    title: "Brenda Milner and H.M.",
    index: 3,
  },
};

/** The live H.M. gallery: stills, the Milner interview the reader plays
 *  (where the clock stops), and the sectioning loop. Embeds YouTube and
 *  loads a YouTube poster: `live`, so the story smoke (no outside
 *  requests) skips it. */
export const MilnerAndHM = {
  tags: ["live"],
  globals: { reduceMotion: false },
  args: {
    images: HM_IMAGES,
    caption: HM_LEGEND,
    label: "FIG",
    title: "Brenda Milner and H.M.",
  },
};

/** A single video the reader plays (play: "player"): controls and sound, no
 *  autoplay, from 0:02 (OPENBRAIN-136, the NGF box). */
export const VideoPlayer = {
  // Embeds YouTube: `live`, so the story smoke (no outside requests) skips it.
  tags: ["live"],
  args: {
    images: [
      {
        src: "https://i.ytimg.com/vi/WgkAR-vrJpM/hqdefault.jpg",
        youtube: "WgkAR-vrJpM",
        play: "player",
        start: 2,
        alt: "Video: History of Neuroscience, Rita Levi-Montalcini.",
      },
    ],
    caption:
      "History of Neuroscience: Rita Levi-Montalcini. Video: Society for Neuroscience.",
    label: "FIG",
    title: "Rita Levi-Montalcini",
  },
};
