/*
 * Chapter/Illustrations/FullScreenIllustration — the full-bleed, sticky
 * figure band with its state buttons. It takes the *paragraph* that triggers
 * it and resolves the animation record itself from Supabase, so the stories pass the paragraph shape rather than a record.
 * Supabase is supplied by the captured database fixture.
 */
import FullScreenIllustration from "../FullScreenIllustration.vue";
import {
  retinaFigureApi,
  illustrationFrame,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Illustrations/FullScreenIllustration",
  component: FullScreenIllustration,
  parameters: { layout: "fullscreen", api: retinaFigureApi },
  args: {
    paragraph: { animationId: "animationPhototransduction", scroll: false },
  },
  argTypes: {
    paragraph: {
      control: "object",
      description:
        "{ animationId, scroll }. animationId is resolved from Supabase.",
    },
  },
  render: illustrationFrame(FullScreenIllustration),
};

export const Default = {};

export const PupillaryLightReflex = {
  args: {
    paragraph: { animationId: "animationPupillaryLightreflex", scroll: false },
  },
};

/** An id the database does not contain: the band renders nothing and the resolver warns. */
export const UnknownAnimation = {
  args: { paragraph: { animationId: "animationDoesNotExist", scroll: false } },
};
