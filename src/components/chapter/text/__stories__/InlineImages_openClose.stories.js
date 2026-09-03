/*
 * Chapter/Text/InlineImages_openClose — the collapsible variant of the inline
 * figure. `paragraph.imgClosed` decides whether it mounts collapsed; the
 * reader toggles it from the figure's own control.
 */
import InlineImagesOpenClose from "../InlineImages_openClose.vue";
import {
  chapterFrame,
  imageParagraph,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/InlineImages_openClose",
  component: InlineImagesOpenClose,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { paragraph: imageParagraph },
  argTypes: {
    paragraph: {
      control: "object",
      description:
        "{ id, img, imgCap, imgClosed }. imgClosed: true mounts the figure collapsed.",
    },
  },
  render: chapterFrame(InlineImagesOpenClose, {
    template: `<div style="min-height:620px;position:relative;max-width:760px;margin:0 auto;padding:48px 64px;background:rgb(var(--color-paper));"><StoryComponent v-bind="args" /></div>`,
  }),
};

/** Mounted open. */
export const Default = {};

/** Mounted collapsed — only the toggle is visible until the reader opens it. */
export const Collapsed = {
  args: { paragraph: { ...imageParagraph, imgClosed: true } },
};
