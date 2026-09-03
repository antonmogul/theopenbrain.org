/*
 * Chapter/Illustrations/IllustrationInline — the in-column figure used below
 * the two-pane breakpoint. Takes only the figure id, resolves the record
 * (Supabase first, animations.json second) and picks static / interactive /
 * fullscreen rendering from the record's flags. Interactive figures also
 * HEAD-check their Lottie asset before mounting.
 */
import IllustrationInline from "../IllustrationInline.vue";
import {
  animationIds,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Illustrations/IllustrationInline",
  component: IllustrationInline,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: { animationId: "animationEyeStructur" },
  argTypes: {
    animationId: {
      control: "select",
      options: [...animationIds, "animationDoesNotExist"],
      description: "The figure id (para.animation.id).",
    },
  },
  render: illustrationFrame(IllustrationInline),
};

export const Default = {};

/** A switch figure: two variants toggled from the figure itself. */
export const SwitchFigure = {
  args: { animationId: "animationCenterSurroundReceptiveFields" },
};

/** A fullscreen-flagged figure renders its inline stand-in. */
export const FullscreenFigure = {
  args: { animationId: "animationPhototransduction" },
};

/** An id neither source knows: nothing renders and the resolver warns. */
export const UnknownAnimation = {
  args: { animationId: "animationDoesNotExist" },
};
