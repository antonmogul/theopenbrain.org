/*
 * Chapter/Illustrations/IllustrationSwitch — a pane figure with two or more
 * variants (info.switches) the reader toggles between, e.g. centre-surround
 * receptive fields ON vs OFF. `isPaused` freezes the loop.
 */
import IllustrationSwitch from "../IllustrationSwitch.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const centreSurround = animationById("animationCenterSurroundReceptiveFields");
const directionSelectivity = animationById("animationDirectionSelectivity");

export default {
  title: "Chapter/Illustrations/IllustrationSwitch",
  component: IllustrationSwitch,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    info: centreSurround,
    isPaused: false,
    scopeId: "storybook-centre-surround",
  },
  argTypes: {
    info: {
      control: "object",
      description: "The animation record; info.switches lists the variants.",
    },
    isPaused: { control: "boolean" },
    scopeId: { control: "text" },
  },
  render: illustrationFrame(IllustrationSwitch),
};

export const Default = {};

export const Paused = { args: { isPaused: true } };

export const DirectionSelectivity = {
  args: {
    info: directionSelectivity,
    scopeId: "storybook-direction-selectivity",
  },
};
