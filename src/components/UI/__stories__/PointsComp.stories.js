/*
 * Legacy/PointsComp — the absolutely positioned layer PointComp markers are
 * portalled into.
 *
 * No props and no content of its own; the dashed frame in the story is only
 * there so the layer's footprint is visible.
 */
import PointsComp from "../PointsComp.vue";

export default {
  title: "Legacy/PointsComp",
  component: PointsComp,
  tags: ["autodocs"],
  render: () => ({
    components: { PointsComp },
    template: `
      <div style="position:relative; min-height:180px; border:1px dashed rgb(var(--color-line));">
        <PointsComp />
        <p>Annotation points are positioned into this overlay layer.</p>
      </div>`,
  }),
};

export const AnnotationLayer = {};
