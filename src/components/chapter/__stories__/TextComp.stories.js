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

// Story-only REST replies for Edit mode's Change figure (OPENBRAIN-65):
// the media library, the row's current figure, and the PATCH echo.
const FIGURE_MEDIA = [
  {
    id: "m-eye",
    title: "Eye structure",
    animation_key: "animationEyeStructur",
    media_type: "lottie",
  },
  {
    id: "m-photo",
    title: "Photoreceptors",
    animation_key: "animationPhotoreceptors",
    media_type: "lottie",
  },
  {
    id: "m-video",
    title: "Retina in motion",
    animation_key: "videoRetina",
    media_type: "video",
  },
];
const figureRest = (url, init) => {
  if (url.includes("animations?")) return FIGURE_MEDIA;
  const method = (init?.method || "GET").toUpperCase();
  if (method === "PATCH") {
    const patch = JSON.parse(init.body);
    return [{ id: "ganglion-output-1", content: {}, ...patch }];
  }
  return [{ animation_id: null, animation_trigger: null }];
};

/**
 * A creator: "Edit chapter" turns on Edit mode (dark bar, click to edit).
 * Hover a paragraph for the pencil and, under it, "Change figure".
 */
export const Creator = {
  parameters: {
    auth: { role: "creator" },
    fetch: { "/rest/v1/": figureRest },
  },
};
