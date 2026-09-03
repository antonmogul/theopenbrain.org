/*
 * Foundations/Styleguide/Specimen — the labelled stage that frames one live
 * demo on the /styleguide collections.
 */
import Specimen from "../Specimen.vue";

export default {
  title: "Foundations/Styleguide/Specimen",
  component: Specimen,
  tags: ["autodocs"],
  argTypes: {
    name: { control: "text" },
    importPath: {
      control: "text",
      description: "Shown as mono under the name.",
    },
    note: { control: "text", description: "One-liner on the variant shown." },
    surface: {
      control: "inline-radio",
      options: ["paper", "muted"],
      description: "Stage on paper (default) or on the page bg for contrast.",
    },
  },
  args: {
    name: "Neural specimen",
    importPath: "components/example.vue",
    note: "Representative state",
    surface: "paper",
  },
  render: (args) => ({
    components: { Specimen },
    setup: () => ({ args }),
    template: `
      <div style="max-width:520px;">
        <Specimen v-bind="args">
          <button class="t-label" style="padding:12px 18px">Inspect component</button>
        </Specimen>
      </div>`,
  }),
};

export const Default = {};

/** The muted stage, for components that are themselves paper-coloured. */
export const MutedSurface = { args: { surface: "muted" } };

/** Caption reduced to the name. */
export const NameOnly = { args: { importPath: "", note: "" } };
