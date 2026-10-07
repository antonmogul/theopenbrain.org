/*
 * Chapter/Figure widgets/Switch — the four panel figures that switch between
 * versions of a drawing (OPENBRAIN-82), matched to theopenbrain.org.
 */
import SwitchFigure from "../switch/SwitchFigure.vue";
import centerSurround from "../center-surround/schema.js";
import directionSelectivity from "../direction-selectivity/schema.js";
import objectMotion from "../object-motion/schema.js";
import rodCone from "../rod-cone/schema.js";
import onOff from "../on-off/schema.js";
import { figureContent } from "../content.js";

const args = (schema) => ({ schema, content: figureContent(schema, {}) });

export default {
  title: "Chapter/Figure widgets/Switch",
  component: SwitchFigure,
  decorators: [
    () => ({
      template: `<div data-chapter="perc" style="height: 760px; width: 720px; background: rgb(var(--color-bg))"><story /></div>`,
    }),
  ],
};

export const CenterSurround = { args: args(centerSurround) };
export const DirectionSelectivity = { args: args(directionSelectivity) };
export const ObjectMotion = { args: args(objectMotion) };
export const RodVsCone = { args: args(rodCone) };
export const OnOff = { args: args(onOff) };
