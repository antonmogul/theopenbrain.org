/*
 * Chapter/Illustrations/FullScreenIllustration — the full-bleed, sticky
 * figure band with its state buttons. It takes the *paragraph* that triggers
 * it and resolves the animation record itself (Supabase first, animations.json
 * second), so the stories pass the paragraph shape rather than a record.
 * Supabase is mocked empty here, so ids must exist in animations.json.
 */
import FullScreenIllustration from "../FullScreenIllustration.vue";
import { illustrationFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Illustrations/FullScreenIllustration",
  component: FullScreenIllustration,
  parameters: { layout: "fullscreen", api: { animations: [] } },
  args: {
    paragraph: { animationId: "animationPhototransduction", scroll: false },
  },
  argTypes: {
    paragraph: {
      control: "object",
      description:
        "{ animationId, scroll }. animationId is resolved DB-first, then from animations.json.",
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

/** An id neither source knows: the band renders nothing and the resolver warns. */
export const UnknownAnimation = {
  args: { paragraph: { animationId: "animationDoesNotExist", scroll: false } },
};
