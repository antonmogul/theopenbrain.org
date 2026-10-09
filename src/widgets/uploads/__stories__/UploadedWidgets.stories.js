/*
 * Widgets/Uploads — every widget-kit widget in src/widgets/uploads/, each in
 * the book's sandbox (WidgetFrame) in its chapter's colour, and at a phone's
 * width as the Studio previews it (OPENBRAIN-135). Use the controls to try
 * another chapter colour; open "Full width" to resize the canvas yourself.
 */
import { ref } from "vue";
import WidgetFrame from "../../uploaded/WidgetFrame.vue";
import ScaledFrame from "../../uploaded/ScaledFrame.vue";
import { UPLOADED_WIDGETS, loadWidgetHtml } from "../index.js";

// Storybook's smoke test allows no outside requests: the stories drop the
// Google Fonts links the book allows (the widgets fall back to system fonts).
const offline = (html) => html.replace(/<link[^>]*fonts\.g[^>]*>/g, "");

const byslug = Object.fromEntries(UPLOADED_WIDGETS.map((w) => [w.slug, w]));

export default {
  title: "Widgets/Uploads",
  parameters: { layout: "fullscreen" },
  argTypes: {
    ramp: {
      control: "inline-radio",
      options: ["fund", "perc", "move", "lear", "deve"],
    },
  },
  render: (args) => ({
    components: { WidgetFrame, ScaledFrame },
    setup() {
      const html = ref("");
      loadWidgetHtml(args.slug).then((h) => (html.value = offline(h || "")));
      return { args, html, w: byslug[args.slug] };
    },
    template: `
      <div style="padding:24px;display:grid;gap:24px;grid-template-columns:minmax(0,1fr) 260px;align-items:start;">
        <div style="min-width:0">
          <p style="margin:0 0 4px;font:500 11px/1.4 var(--font-mono);letter-spacing:.08em;text-transform:uppercase;color:rgb(var(--color-mute))">
            upload:{{ args.slug }} · {{ w.chapter }} · {{ w.author }}
          </p>
          <p style="margin:0 0 16px;font:15px/1.5 var(--font-body);max-width:48rem">{{ w.description }}</p>
          <WidgetFrame v-if="html" :html="html" :ramp="args.ramp" :title="w.title" />
        </div>
        <ScaledFrame v-if="html" :html="html" :ramp="args.ramp" :width="390" label="Phone" />
      </div>`,
  }),
};

const story = (slug) => ({
  args: { slug, ramp: byslug[slug].ramp },
});

export const AttnSdt = {
  ...story("attn-sdt"),
  name: "Signal detection theory",
};
export const AttnPosnerCueing = {
  ...story("attn-posner-cueing"),
  name: "Posner cueing",
};
export const AttnContrastResponseGain = {
  ...story("attn-contrast-response-gain"),
  name: "Contrast response gain",
};
export const AttnFeatureAttention = {
  ...story("attn-feature-attention"),
  name: "Feature attention",
};
export const LoewiVagusstoff = {
  ...story("loewi-vagusstoff"),
  name: "Loewi's Vagusstoff",
};
export const AttnHelmholtz = {
  ...story("attn-helmholtz"),
  name: "Helmholtz's black room",
};
export const AttnBiasedCompetition = {
  ...story("attn-biased-competition"),
  name: "Biased competition",
};
