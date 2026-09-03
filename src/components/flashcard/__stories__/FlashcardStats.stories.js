/*
 * Student/Flashcards/FlashcardStats — the end-of-session summary.
 *
 * Accuracy is correct / (correct + incorrect); the message and the accuracy
 * tile's colour key off it, and the Skipped tile only appears when > 0.
 */
import { fn } from "storybook/test";
import FlashcardStats from "../FlashcardStats.vue";

export default {
  title: "Student/Flashcards/FlashcardStats",
  component: FlashcardStats,
  tags: ["autodocs"],
  argTypes: {
    stats: {
      control: "object",
      description: "{ correct, incorrect, skipped, duration (s), totalCards }",
    },
    onContinue: { description: "Back to the dashboard." },
    onStudyAgain: { description: "Start another session." },
  },
  args: {
    stats: {
      correct: 9,
      incorrect: 2,
      skipped: 1,
      duration: 185,
      totalCards: 12,
    },
    onContinue: fn(),
    onStudyAgain: fn(),
  },
  render: (args) => ({
    components: { FlashcardStats },
    setup: () => ({ args }),
    template: `<div style="max-width:640px;"><FlashcardStats v-bind="args" /></div>`,
  }),
};

/** A good session with one skip. */
export const Default = {};

/** Every card right, nothing skipped — the Skipped tile is hidden. */
export const Perfect = {
  args: {
    stats: {
      correct: 12,
      incorrect: 0,
      skipped: 0,
      duration: 140,
      totalCards: 12,
    },
  },
};

/** Accuracy under 50%: the low treatment and the "don't give up" copy. */
export const Struggling = {
  args: {
    stats: {
      correct: 3,
      incorrect: 8,
      skipped: 1,
      duration: 420,
      totalCards: 12,
    },
  },
};

/** An hour-plus session on a big deck. */
export const LongSession = {
  args: {
    stats: {
      correct: 38,
      incorrect: 9,
      skipped: 3,
      duration: 3725,
      totalCards: 50,
    },
  },
};
