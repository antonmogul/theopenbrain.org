/*
 * Chapter/ReaderShell/TextComp — the whole prose column: every section,
 * subsection, figure trigger, footnote and end-matter block, plus the GSAP
 * scroll triggers that drive the figure pane. No props: it renders whatever
 * useText() holds, so the story writes the chapter tree from a story-only
 * control. Creators additionally get EditableBlocks.
 */
import TextComp from "../TextComp.vue";
import { chapterFrame, retinaChapter } from "./chapterFixtures";

const LONG_CHAPTER = {
  ...retinaChapter,
  sections: [
    ...retinaChapter.sections,
    {
      id: "ganglion-output",
      title: "Ganglion-cell output",
      paragraphs: [
        {
          id: "ganglion-output-1",
          text: 'Midget, parasol, and small bistratified ganglion cells carry distinct combinations of spatial, temporal, and chromatic information<sup class="citation-ref" data-ref="42">42</sup> toward the lateral geniculate nucleus.',
          // Stored blocks, as chapterTransform keeps them: Edit mode opens
          // the lossless editor with the citation as a chip (OPENBRAIN-64).
          blocks: [
            {
              type: "text",
              content:
                "Midget, parasol, and small bistratified ganglion cells carry distinct combinations of spatial, temporal, and chromatic information",
            },
            { type: "citation_ref", number: 42 },
            {
              type: "text",
              content: " toward the lateral geniculate nucleus.",
            },
          ],
        },
      ],
      subSection: [],
    },
  ],
};

const SHORT_CHAPTER = {
  ...retinaChapter,
  sections: [retinaChapter.sections[0]],
};

export default {
  title: "Chapter/ReaderShell/TextComp",
  component: TextComp,
  parameters: { layout: "fullscreen" },
  args: { chapter: LONG_CHAPTER },
  argTypes: {
    chapter: {
      control: "object",
      description:
        "Story-only: the chapter tree written to useText() (intro, sections → paragraphs → subSection …, footNotes).",
    },
  },
  render: chapterFrame(TextComp, {
    chapter: (args) => args.chapter,
    template: `<div style="min-height:1800px;position:relative;"><StoryComponent /></div>`,
  }),
};

/** Three sections — enough to scroll. */
export const Default = {};

export const ShortChapter = { args: { chapter: SHORT_CHAPTER } };

/** A creator: "Edit chapter" turns on Edit mode (dark bar, click to edit). */
export const Creator = { parameters: { auth: { role: "creator" } } };
