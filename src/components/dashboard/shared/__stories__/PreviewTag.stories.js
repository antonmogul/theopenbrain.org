/*
 * Foundations/PreviewTag — the inline "· preview" marker for unwired UI.
 *
 * Three variants map to fixed copy; the default slot overrides it. `bare`
 * drops the leading middle dot for use at the start of a line.
 */
import PreviewTag from "../PreviewTag.vue";

export default {
  title: "Foundations/PreviewTag",
  component: PreviewTag,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["preview", "soon", "beta"] },
    bare: { control: "boolean", description: "Omit the leading “· ”." },
    default: {
      control: "text",
      description: "Custom label (slot). Empty uses the variant's copy.",
    },
  },
  args: { variant: "preview", bare: false, default: "" },
  render: (args) => ({
    components: { PreviewTag },
    setup: () => ({ args }),
    template: `
      <span>Analytics
        <PreviewTag :variant="args.variant" :bare="args.bare">
          <template v-if="args.default" #default>{{ args.default }}</template>
        </PreviewTag>
      </span>`,
  }),
};

export const Playground = {};

export const Variants = {
  render: () => ({
    components: { PreviewTag },
    template: `
      <div style="display:flex; gap:18px;">
        <PreviewTag />
        <PreviewTag variant="soon" />
        <PreviewTag variant="beta" bare />
      </div>`,
  }),
};

export const CustomLabel = { args: { variant: "beta", default: "pilot" } };
