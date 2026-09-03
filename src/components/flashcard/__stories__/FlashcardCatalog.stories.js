import FlashcardCard from "../FlashcardCard.vue";
import FlashcardDeck from "../FlashcardDeck.vue";
import FlashcardRating from "../FlashcardRating.vue";
import FlashcardStats from "../FlashcardStats.vue";
import { apiFixtures, flashcardFixture } from "@/stories/openBrainFixtures";

export default {
  title: "Student/Flashcards",
  parameters: { auth: { authenticated: true }, api: apiFixtures },
  decorators: [
    () => ({
      template: '<div style="max-width:760px;padding:24px"><story /></div>',
    }),
  ],
};

export const CardFrontAndBack = {
  render: () => ({
    components: { FlashcardCard },
    data: () => ({ card: flashcardFixture, flipped: false }),
    template:
      '<FlashcardCard :card="card" :is-flipped="flipped" :card-number="3" :total-cards="12" @flip="flipped = !flipped" />',
  }),
};

export const DeckSummary = {
  render: () => ({
    components: { FlashcardDeck },
    template:
      '<FlashcardDeck module-id="module-foundations" module-title="Foundations key terms" />',
  }),
};

export const RecallRating = {
  render: () => ({
    components: { FlashcardRating },
    template: "<FlashcardRating />",
  }),
};

export const SessionResults = {
  render: () => ({
    components: { FlashcardStats },
    data: () => ({
      stats: {
        correct: 9,
        incorrect: 2,
        skipped: 1,
        duration: 185,
        totalCards: 12,
      },
    }),
    template: '<FlashcardStats :stats="stats" />',
  }),
};
