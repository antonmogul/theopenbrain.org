/*
 * Legacy/PointComp — the "N" annotation marker beside a highlight.
 *
 * It positions itself against `#highlight-<id>` after mount, so the story
 * renders a matching <mark> first. The id is read once on setup; changing
 * the control re-targets the mark but not the marker.
 */
import PointComp from "../PointComp.vue";

export default {
  title: "Legacy/PointComp",
  component: PointComp,
  tags: ["autodocs"],
  argTypes: {
    id: { control: "text", description: "Highlight id without the prefix." },
  },
  args: { id: "neuron-1" },
  render: (args) => ({
    components: { PointComp },
    setup: () => ({ args }),
    template: `
      <div style="position:relative; min-height:160px;">
        <mark :id="'highlight-' + args.id">Neurons communicate through electrical and chemical signals.</mark>
        <PointComp :id="args.id" />
      </div>`,
  }),
};

export const AnnotationPoint = {};
