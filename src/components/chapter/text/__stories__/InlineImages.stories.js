/*
 * Chapter/Text/InlineImages — a figure in the prose column: the image named
 * by `paragraph.img` (from /publicAssets/images/<img>.png) plus an optional
 * caption. Renders nothing when the paragraph has no image.
 */
import InlineImages from "../InlineImages.vue";
import { imageParagraph, proseFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/InlineImages",
  component: InlineImages,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { paragraph: imageParagraph },
  argTypes: {
    paragraph: {
      control: "object",
      description:
        "{ id, img, imgCap, imgNumber?, imgTitle? }. img is a file stem under /publicAssets/images.",
    },
  },
  render: proseFrame(InlineImages),
};

export const Default = {};

export const WithoutCaption = {
  args: { paragraph: { id: imageParagraph.id, img: imageParagraph.img } },
};

/** A numbered image is one of the chapter's figures (OPENBRAIN-79): "FIG 09"
 * and its title above it, in the shell's toolbar below 1024px. */
export const Numbered = {
  args: {
    paragraph: { ...imageParagraph, imgNumber: 9, imgTitle: "The blind spot" },
  },
};

/** A paragraph with no image — the component must render nothing. */
export const NoImage = {
  args: { paragraph: { id: "plain-paragraph", text: "No figure here." } },
};
