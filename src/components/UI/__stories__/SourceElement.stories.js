/*
 * Legacy/SourceElement — figure attribution pinned to the bottom-left of the
 * figure pane.
 *
 * Renders nothing when `source` is empty, which is why the story keeps a
 * framed container around it.
 */
import SourceElement from "../SourceElement.vue";

export default {
  title: "Legacy/SourceElement",
  component: SourceElement,
  tags: ["autodocs"],
  argTypes: {
    source: { control: "text", description: "Empty renders nothing." },
  },
  args: { source: "Adapted from Trenholm et al., 2021 · CC BY 4.0" },
  render: (args) => ({
    components: { SourceElement },
    setup: () => ({ args }),
    template: `
      <div style="position:relative; min-height:220px; border:1px solid rgb(var(--color-line));">
        <SourceElement :source="args.source" />
      </div>`,
  }),
};

export const FigureSource = {};

export const Hidden = { args: { source: "" } };
