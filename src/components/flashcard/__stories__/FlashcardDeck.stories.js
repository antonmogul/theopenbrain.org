/*
 * Student/Flashcards/FlashcardDeck — the deck tile on the student dashboard.
 *
 * On mount it derives total / due / mastered from `flashcards` and
 * `flashcard_responses`, and the last-studied date from `flashcard_sessions`,
 * so the states below are driven through `parameters.api`.
 */
import { fn } from "storybook/test";
import FlashcardDeck from "../FlashcardDeck.vue";
import {
  apiFixtures,
  flashcardFixture,
  moduleFixture,
} from "@/stories/openBrainFixtures";

const CARDS = Array.from({ length: 12 }, (_, i) => ({
  ...flashcardFixture,
  id: `card-${i + 1}`,
}));
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const response = (flashcard_id, interval_days, created_at) => ({
  flashcard_id,
  ease_factor: 2.5,
  interval_days,
  created_at,
});

export default {
  title: "Student/Flashcards/FlashcardDeck",
  component: FlashcardDeck,
  tags: ["autodocs"],
  parameters: { auth: { authenticated: true }, api: apiFixtures },
  argTypes: {
    moduleId: { control: "text" },
    moduleTitle: { control: "text" },
    onStart: { description: "Emitted with the module id." },
  },
  args: {
    moduleId: moduleFixture.id,
    moduleTitle: "Foundations key terms",
    onStart: fn(),
  },
  render: (args) => ({
    components: { FlashcardDeck },
    setup: () => ({ args }),
    template: `<div style="max-width:420px;"><FlashcardDeck v-bind="args" /></div>`,
  }),
};

/** One new card, due now, studied once before. */
export const Default = {};

/** A twelve-card deck part-way through: most due, two mastered. */
export const LargeDeck = {
  parameters: {
    api: {
      ...apiFixtures,
      "flashcards?": CARDS,
      "flashcard_responses?": [
        response("card-1", 30, daysAgo(2)), // mastered, not due
        response("card-2", 25, daysAgo(1)), // mastered, not due
        response("card-3", 3, daysAgo(5)), // due again
        response("card-4", 1, daysAgo(0)), // seen today
      ],
    },
  },
};

/** Nothing authored yet — the start button is disabled. */
export const EmptyDeck = {
  parameters: { api: { ...apiFixtures, "flashcards?": [] } },
};

/** Never studied: no "last studied" line. */
export const NoHistory = {
  parameters: { api: { ...apiFixtures, "flashcard_sessions?": [] } },
};
