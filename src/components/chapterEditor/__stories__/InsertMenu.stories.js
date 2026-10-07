/*
 * Dashboard/ChapterEditor/InsertMenu — the "+" between blocks on the chapter
 * block page (OPENBRAIN-61). Hover the line to reveal it; the menu offers
 * text, heading, image, widget, quote and list.
 */
import InsertMenu from "../InsertMenu.vue";

export default {
  title: "Dashboard/ChapterEditor/InsertMenu",
  component: InsertMenu,
  render: () => ({
    components: { InsertMenu },
    template: `<div style="max-width: 46rem; padding: 24px 24px 220px">
      <p style="margin:0 0 4px">A paragraph above.</p>
      <InsertMenu />
      <p style="margin:4px 0 0">A paragraph below.</p>
    </div>`,
  }),
};

export const BetweenBlocks = {};
