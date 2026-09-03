/*
 * Chapter/Text/EyeStart — the chapter cover: a pinned hero image that blurs
 * as the reader scrolls, with the module name and chapter title over it. No
 * props: the copy comes from the text store, so the story writes the store
 * from story-only controls. The route has no slug here, so the generic cover
 * (background.jpg) is used rather than the Retina's Matisse.
 */
import EyeStart from "../EyeStart.vue";
import { chapterFrame, retinaChapter } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/EyeStart",
  component: EyeStart,
  parameters: { layout: "fullscreen" },
  args: { chapterTitle: "The Retina", moduleName: "The Open Brain" },
  argTypes: {
    chapterTitle: {
      control: "text",
      description:
        "Story-only: written to useText().text.intro[0].title, which the cover reads.",
    },
    moduleName: {
      control: "text",
      description:
        "Story-only: useText().text.moduleName, the kicker above the title.",
    },
  },
  render: chapterFrame(EyeStart, {
    chapter: (args) => ({
      ...retinaChapter,
      moduleName: args.moduleName,
      intro: [{ ...retinaChapter.intro[0], title: args.chapterTitle }],
    }),
    template: `<div style="min-height:100vh;"><div id="container"></div><StoryComponent /></div>`,
  }),
};

export const Default = {};

/** A long title has to wrap inside the hero without pushing the arrow off. */
export const LongTitle = {
  args: {
    chapterTitle:
      "Foundations of Neuroscience: from trepanation to the neuron doctrine",
    moduleName: "Foundations",
  },
};
