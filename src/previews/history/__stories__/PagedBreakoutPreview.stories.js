import PagedBreakoutPreview from "../PagedBreakoutPreview.vue";
import repairs from "@/data/history/sourceContentRepairs.json";
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";
// Exact corrected History manuscript excerpts, in source order. This is an
// interaction specimen, not a replacement for any authored breakout section.
const pages = repairs.paragraphUpdates
  .slice(0, 3)
  .map((row) => contentBlocksToHTML(row.after.content.blocks).text);
export default {
  title: "Chapter/DesignPreviews/PagedBreakoutPreview",
  component: PagedBreakoutPreview,
  parameters: { layout: "padded" },
  args: { title: "History manuscript excerpts · paging specimen", pages },
};
export const VerticalDefault = {};
