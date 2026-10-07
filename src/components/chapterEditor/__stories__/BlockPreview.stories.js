/*
 * Dashboard/ChapterEditor/BlockPreview — one paragraph row as the chapter
 * block page draws it (OPENBRAIN-60): the reader's own text HTML (citations,
 * figure refs, hover-image spans), headings, images, live widget cards,
 * footnote cards and the paragraph's figure.
 */
import BlockPreview from "../BlockPreview.vue";
import { editorParagraphs, editorMedia } from "./chapterEditorFixtures";

const mediaById = new Map(editorMedia.map((m) => [m.id, m]));
const byId = Object.fromEntries(editorParagraphs.map((p) => [p.id, p]));

export default {
  title: "Dashboard/ChapterEditor/BlockPreview",
  component: BlockPreview,
  args: { mediaById },
  render: (args) => ({
    components: { BlockPreview },
    setup: () => ({ args }),
    template: `<div style="max-width: 46rem; padding: 24px"><BlockPreview v-bind="args" /></div>`,
  }),
};

/** Text with a citation, a figure reference, a hover image and a figure. */
export const TextWithCitations = { args: { paragraph: byId["p-1"] } };

export const Heading = { args: { paragraph: byId["p-2"] } };

/** A seeded image key resolves to /publicAssets/images/<key>.png. */
export const Image = { args: { paragraph: byId["p-3"] } };

/** Widgets render through the reader's WidgetBreakout, so they run. */
export const Widget = { args: { paragraph: byId["p-4"] } };

export const Footnote = { args: { paragraph: byId["p-5"] } };
