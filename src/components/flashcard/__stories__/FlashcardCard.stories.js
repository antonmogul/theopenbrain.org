/*
 * Student/Flashcards/FlashcardCard — one card, front or back.
 *
 * Flip state is a prop, not internal state, so the parent deck owns it. Both
 * faces get their own story: a flipped card is otherwise only reachable by
 * clicking, which docs and a11y checks don't do.
 */
import FlashcardCard from "../FlashcardCard.vue";

/*
 * The component reads front_text || front_content || front (and the same for
 * back), tolerating three shapes from different call sites. Stories use the
 * *_text form, which is what the Supabase `flashcards` table returns.
 */
const CARD = {
  id: "demo-1",
  front_text: "What does a direction-selective ganglion cell respond to?",
  back_text:
    "Motion in one preferred direction — it fires strongly for that direction and weakly for the opposite (null) direction.",
};

export default {
  title: "Student/Flashcards/FlashcardCard",
  component: FlashcardCard,
  tags: ["autodocs"],
  argTypes: {
    card: {
      control: "object",
      description: "Card record. Reads front_text/back_text.",
    },
    isFlipped: {
      control: "boolean",
      description: "Owned by the parent deck, not the card.",
    },
    cardNumber: { control: { type: "number", min: 1 } },
    totalCards: { control: { type: "number", min: 1 } },
  },
  args: {
    card: CARD,
    isFlipped: false,
    cardNumber: 3,
    totalCards: 12,
  },
  render: (args) => ({
    components: { FlashcardCard },
    setup: () => ({ args }),
    // Constrain width — the card is fluid and fills the docs frame otherwise.
    template: `<div style="max-width:560px;"><FlashcardCard v-bind="args" /></div>`,
  }),
};

export const Playground = {};

export const Front = { args: { isFlipped: false } };

export const Back = { args: { isFlipped: true } };

/** Long content on both faces — the overflow case that breaks fixed heights. */
export const LongContent = {
  args: {
    isFlipped: true,
    card: {
      id: "demo-2",
      front_text:
        "Explain how the starburst amacrine cell contributes to direction selectivity in the retina.",
      back_text:
        "Starburst amacrine cells release GABA onto direction-selective ganglion cells asymmetrically. Their dendrites are themselves directionally tuned, responding most strongly to motion outward from the soma. The null-direction input arrives with a delay that coincides with the excitatory input, producing the inhibition that suppresses the response to null-direction motion.",
    },
  },
};
