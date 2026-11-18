/*
 * Chapter/Review/ReviewPointer — the point-at layer (OPENBRAIN-204), over a
 * reader in miniature: a section with a paragraph, a breakout box's track
 * with two plates, and an upload's sandboxed frame. Hover outlines the
 * meaningful thing (the plate, not its image; the frame, not nothing), a
 * click picks it and the anchor shows below; "Point again" starts over.
 * Not in the docs page: the layer covers the whole window.
 */
import { ref } from "vue";
import ReviewPointer from "../ReviewPointer.vue";

const PAGE = `
<div class="chapter-reader" style="font-family:var(--font-body);max-width:760px;margin:0 auto;padding:24px;">
  <section class="reader-section" data-section-slug="where-is-my-mind" style="min-height:0;padding:0;">
    <h2 class="T subChapter" style="margin:0 0 12px;">Where is my mind?</h2>
    <div class="P" data-paragraph-id="11111111-0000-4000-8000-000000000002" style="margin-bottom:16px;">
      The idea that the brain is the seat of the mind is an old one, and the
      first skulls with man-made holes show how long people have looked.
    </div>
    <aside class="bx" data-section-slug="box-descartes" style="background:#1c1c1c;color:#fff;padding:16px;border-radius:8px;">
      <h2 class="bx-title" style="margin:0 0 12px;font-size:1.25rem;">Separating mind from body</h2>
      <div class="bx-body" data-rail-scroller data-rail-mode="swipe" data-rail-pinned="0" style="overflow-x:auto;">
        <div class="rp" data-rail-part style="display:flex;gap:12px;">
          <figure class="rf" data-rail-figure data-rail-figure-id="animationFoundationsFigA" style="display:flex;gap:12px;margin:0;">
            <div class="rf-plate" data-rail-plate style="width:200px;height:140px;background:#8a7b66;border-radius:4px;"></div>
            <div class="rf-plate" data-rail-plate style="width:200px;height:140px;background:#d9d2c3;border-radius:4px;"></div>
          </figure>
        </div>
      </div>
    </aside>
    <aside class="wb" data-widget-breakout="upload:story-widget" data-timeline-id="22222222-0000-4000-8000-000000000001" style="margin-top:16px;">
      <div class="wb-layout"><div class="wb-body">
        <h3 class="wb-title" style="margin:0 0 8px;">Penfield's binder</h3>
        <div class="wb-stage" data-widget-stage="upload:story-widget">
          <iframe sandbox="allow-scripts" title="A sandboxed widget" style="width:100%;height:160px;border:1px solid #ccc;"
            srcdoc="<body style='margin:0;display:grid;place-items:center;height:100vh;font:14px system-ui'>A sandboxed upload</body>"></iframe>
        </div>
      </div></div>
    </aside>
  </section>
</div>`;

export default {
  title: "Chapter/Review/ReviewPointer",
  component: ReviewPointer,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { ReviewPointer },
    setup() {
      const on = ref(true);
      const picked = ref(null);
      const recordFor = (key) =>
        key?.toLowerCase() === "animationfoundationsfiga"
          ? {
              id: "animationFoundationsFigA",
              figureNumber: "D",
              title: "Descartes' skull",
            }
          : null;
      return { on, picked, recordFor, page: PAGE };
    },
    template: `<div>
      <div v-html="page"></div>
      <div style="max-width:760px;margin:0 auto;padding:0 24px 24px;font:13px var(--font-ui);">
        <button type="button" class="rv-btn" @click="on = true; picked = null">Point again</button>
        <pre v-if="picked" data-testid="picked" style="white-space:pre-wrap;">{{ picked.label }}\n{{ JSON.stringify(picked, null, 2) }}</pre>
      </div>
      <ReviewPointer v-if="on" :record-for="recordFor"
        @pick="(a) => { picked = a; on = false; }" @cancel="on = false" />
    </div>`,
  }),
};

export const Pointing = {};
