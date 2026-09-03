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
        "{ id, img, imgCap }. img is a file stem under /publicAssets/images.",
    },
  },
  render: proseFrame(InlineImages),
};

export const Default = {};

export const WithoutCaption = {
  args: { paragraph: { id: imageParagraph.id, img: imageParagraph.img } },
};

/** A paragraph with no image — the component must render nothing. */
export const NoImage = {
  args: { paragraph: { id: "plain-paragraph", text: "No figure here." } },
};
