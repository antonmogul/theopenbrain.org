/*
 * Chapter/Figure widgets/Split and transitions — the figures the reader
 * scrubs through by scrolling (OPENBRAIN-83). `progress` stands in for the
 * reader's scroll here.
 */
import SplitFigure from "../split/SplitFigure.vue";
import lateral from "../lateral-organization/schema.js";
import { figureContent } from "../content.js";

export default {
  title: "Chapter/Figure widgets/Split",
  component: SplitFigure,
  args: { schema: lateral, content: figureContent(lateral, {}), progress: 0.3 },
  argTypes: {
    progress: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
  },
  decorators: [
    () => ({
      template: `<div data-chapter="perc" style="height: 760px"><story /></div>`,
    }),
  ],
};

/** A third of the way: the cone mosaic, captioned. */
export const ConeMosaic = {};
/** Near the end: the ganglion cell mosaic. */
export const GanglionCells = { args: { progress: 0.8 } };
