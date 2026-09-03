/*
 * Chapter/Illustrations/IllustrationComp — the standard pane figure: title,
 * Lottie, and the state buttons that jump it between labelled frames.
 * `scopeId` scopes the mount node so an inline (mobile) copy can coexist with
 * the desktop pane; the asset path still comes from animation.id.
 */
import IllustrationComp from "../IllustrationComp.vue";
import {
  animationById,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

const eye = animationById("animationEyeStructur");
const cellTypes = animationById("animationRetinalCellTypes");

export default {
  title: "Chapter/Illustrations/IllustrationComp",
  component: IllustrationComp,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    animation: eye,
    activeAnimation: eye.id.toLowerCase(),
    scopeId: null,
  },
  argTypes: {
    animation: { control: "object" },
    activeAnimation: {
      control: "text",
      description:
        "Lower-cased id of the figure the orchestrator currently shows.",
    },
    scopeId: {
      control: "text",
      description:
        "Scoped DOM id for inline/mobile mounts so two instances don't collide; null = desktop pane.",
    },
  },
  render: illustrationFrame(IllustrationComp),
};

export const Default = {};

/** Inline on a phone: scoped mount id, narrow viewport. */
export const Mobile = {
  args: { scopeId: "storybook-eye-mobile" },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};

/** A ten-state figure — the state buttons must wrap, not overflow. */
export const RetinalCellTypes = {
  args: { animation: cellTypes, activeAnimation: cellTypes.id.toLowerCase() },
};
