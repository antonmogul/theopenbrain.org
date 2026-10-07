/*
 * Dashboard/ChapterEditor/FigureSettings — an image figure's title, caption
 * and frames (OPENBRAIN-70 B3). History's Figure 2 cycles five frames.
 */
import FigureSettings from "../FigureSettings.vue";

const frame = (n, alt, caption) => ({
  src: `/publicAssets/images/foundations/fig02-0${n}.jpg`,
  alt,
  ...(caption ? { caption } : {}),
});

export default {
  title: "Dashboard/ChapterEditor/FigureSettings",
  component: FigureSettings,
  args: {
    open: true,
    uploadSlug: "foundations-of-neuroscience",
    figure: {
      id: "fig2",
      title: "Methods of trepanation",
      media_type: "image",
      image_file_url: "/publicAssets/images/foundations/fig02-01.jpg",
      config: {
        caption:
          "Different trepanation methods, including scraping (1), grooving (2), drilling (3) and cutting (4).",
        images: [
          frame(1, "A trepanned skull with four healed openings."),
          frame(2, "A hand scrapes the skull at opening 1.", "Scraping (1)."),
          frame(3, "A hand cuts a groove at opening 2.", "Grooving (2)."),
          frame(4, "", "Drilling (3)."),
        ],
      },
    },
    media: [
      {
        id: "fig2-5",
        title: "Cutting a rectangular opening",
        media_type: "image",
        image_file_url: "/publicAssets/images/foundations/fig02-05.jpg",
      },
    ],
  },
  argTypes: { onSave: { action: "save" }, onClose: { action: "close" } },
};

/** Four frames, one missing its alt text. */
export const Frames = {};

/** A single-image figure (most of History's). */
export const SingleImage = {
  args: {
    figure: {
      id: "fig1",
      title: "Trepanned Incan skull",
      media_type: "image",
      image_file_url: "/publicAssets/images/foundations/fig02-01.jpg",
      config: {},
    },
  },
};
