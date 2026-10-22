import "./referenceLinksReview.css";
import SectionComp from "../SectionComp.vue";
import { transformParagraph } from "@/composables/chapterTransform.mjs";

// Manually selected, verified source destinations. No name matching/autolinking.
// This is authored through the same text-block path as the chapter editor.
const referenceLinkBlocks = [
  {
    type: "text",
    content:
      'Read about <a href="https://plato.stanford.edu/entries/alcmaeon/">Alcmaeon of Croton</a> and <a href="https://plato.stanford.edu/entries/descartes/">René Descartes</a>, or explore the selected term <a href="https://plato.stanford.edu/entries/dualism/">dualism</a>.',
  },
  {
    type: "text",
    content:
      "Sources: Stanford Encyclopedia of Philosophy, verified 22 October 2026. These ordinary links open in this tab; use your browser’s Back action to return. No hover is required.",
  },
];

export default {
  title: "Chapter/Text/Reference links review",
  component: SectionComp,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "R03 proposal only. Explicitly selected external sources for two people and one term, rendered through the existing chapter content pipeline. No live prose or hover metadata is rewritten.",
      },
    },
  },
  render: () => ({
    components: { SectionComp },
    setup: () => ({
      section: {
        id: "reference-links-review",
        title: "People and selected terms",
        paragraphs: referenceLinkBlocks.map((block, index) =>
          transformParagraph({
            id: `reference-links-review-p${index}`,
            content: { blocks: [block] },
          })
        ),
      },
    }),
    template: `<main class="chapter-reader review-reference-links" style="max-width:800px;margin:0 auto;padding:32px;font:calc(var(--type-body-size) * var(--reading-size, 1))/var(--type-body-lh) var(--font-body)"><h1>Reference links · review proposal</h1><SectionComp :section="section" :index="0" box-body /></main>`,
  }),
};
export const OrdinaryLinks = {};
