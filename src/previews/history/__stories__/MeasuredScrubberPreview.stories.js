import MeasuredScrubberPreview from "../MeasuredScrubberPreview.vue";
import fixture from "@/views/__stories__/historyFixtureData.json";
import { contentBlocksToHTML } from "@/composables/chapterTransform.mjs";
import plate from "../../../../public/publicAssets/images/foundations/fig06-01.jpg";
export default {
  title: "Chapter/DesignPreviews/MeasuredScrubberPreview",
  component: MeasuredScrubberPreview,
  parameters: { layout: "fullscreen" },
  args: { targetId: "measured-history-specimen" },
  render: (args) => ({
    components: { MeasuredScrubberPreview },
    setup: () => ({
      args,
      prose: contentBlocksToHTML(fixture.paragraph.blocks).text,
      caption: fixture.images[0].caption,
      plate,
    }),
    template: `<div style="padding:24px;font-family:var(--font-body)"><MeasuredScrubberPreview v-bind="args"/><main id="measured-history-specimen" style="max-width:720px;margin:auto"><p>Measured document specimen using the committed History manuscript excerpt and Figure 6 plate. Design preview only.</p><div style="min-height:85vh;padding-top:3rem" v-html="prose"/><figure data-preview-figure="Figure 6 plate 1" style="padding:2rem 0"><img :src="plate" alt="Medieval ventricular cell doctrine illustration" style="display:block;max-width:100%;max-height:70vh;margin:auto"/><figcaption>{{caption}}</figcaption></figure><p style="min-height:80vh">End of source excerpt. Extra specimen spacing makes the measured intervals inspectable; it is not proposed chapter spacing.</p></main></div>`,
  }),
};
export const DisabledByDefault = {};
