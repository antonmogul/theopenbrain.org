import BreakoutRail from "../BreakoutRail.vue";
import BreakoutBox from "../BreakoutBox.vue";
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";
import history from "@/views/__stories__/historyFullReaderData.json";

// Reuse the complete committed source, including citations and poem lines.
// Chunk boundaries are a review choice, never a write to chapter content.
const rows = history.paragraphs.filter(
  (row) => row.section_id === "history-section-box-descartes"
);
const parts = [rows.slice(0, 2), rows.slice(2, 7), rows.slice(7)];
const panels = [
  { id: "dualism", title: "Mind and body" },
  { id: "skull", title: "The missing skull" },
  { id: "legacy", title: "The journey continues" },
].map((panel, index) => ({
  ...panel,
  paragraphs: parts[index].map((row) => ({
    id: row.id,
    html: contentBlocksToHTML(row.content.blocks).text,
  })),
}));

export default {
  title: "Chapter/Text/BreakoutRail",
  component: BreakoutRail,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "R05/R18 review trial only. Complete Descartes text from the committed History fixture; no reader default or live content changed. Compare lateral reading with Read vertically; decide final format with Stuart next week.",
      },
    },
  },
  render: () => ({
    components: { BreakoutRail, BreakoutBox },
    setup: () => ({ panels }),
    template: `
      <main data-chapter="fund" style="max-width:960px;margin:auto;padding:24px;font:calc(var(--type-body-size) * var(--reading-size, 1))/var(--type-body-lh) var(--font-body)">
        <p>Review trial · Descartes · final format for discussion next week</p>
        <BreakoutBox :section="{id:'review-descartes',title:'Separating mind from body: Descartes and dualism'}" label="C">
          <BreakoutRail :panels="panels" label="Descartes breakout reading trial">
            <template v-for="panel in panels" :key="panel.id" #[panel.id]>
              <div v-for="paragraph in panel.paragraphs" :key="paragraph.id" :data-source-paragraph="paragraph.id" style="margin-bottom:1rem;line-height:1.65" v-html="paragraph.html" />
            </template>
          </BreakoutRail>
        </BreakoutBox>
        <p>The main chapter continues below the breakout.</p>
      </main>`,
  }),
};

export const DescartesTrial = {};
