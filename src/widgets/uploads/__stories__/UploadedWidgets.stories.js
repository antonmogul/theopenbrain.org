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

// The Retina: Stuart's 1 October 2026 set (OPENBRAIN-141).
export const RetinaPhotoreceptors = {
  ...story("retina-photoreceptors"),
  name: "Retina: Photoreceptors",
};
export const RetinaRefractionErrors = {
  ...story("retina-refraction-errors"),
  name: "Retina: Refractive errors",
};
export const RetinaPupillaryLightReflex = {
  ...story("retina-pupillary-light-reflex"),
  name: "Retina: Pupillary light reflex",
};
export const RetinaPhototransduction = {
  ...story("retina-phototransduction"),
  name: "Retina: Phototransduction",
};
export const RetinaVisualCycle = {
  ...story("retina-visual-cycle"),
  name: "Retina: The visual cycle",
};
export const RetinaOnOffBipolarCells = {
  ...story("retina-on-off-bipolar-cells"),
  name: "Retina: ON and OFF bipolar cells",
};
export const RetinaCenterSurround = {
  ...story("retina-center-surround"),
  name: "Retina: Center-surround",
};
export const RetinaDirectionSelectivity = {
  ...story("retina-direction-selectivity"),
  name: "Retina: Direction selectivity",
};
export const RetinaObjectMotionSensitivity = {
  ...story("retina-object-motion-sensitivity"),
  name: "Retina: Object motion sensitivity",
};
export const RetinaLightSensitiveGanglionCells = {
  ...story("retina-light-sensitive-ganglion-cells"),
  name: "Retina: Light-sensitive ganglion cells",
};
export const RetinaRodVsConeCircuits = {
  ...story("retina-rod-vs-cone-circuits"),
  name: "Retina: Rod and cone circuits",
};
export const RetinaRetinalCellTypes = {
  ...story("retina-retinal-cell-types"),
  name: "Retina: Retinal cell types",
};
export const RetinaSynapticArchitecture = {
  ...story("retina-synaptic-architecture"),
  name: "Retina: Synaptic architecture",
};
export const RetinaRetinabox = {
  ...story("retina-retinabox"),
  name: "Retina: RetINaBox",
};
