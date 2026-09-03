/*
 * Student/Flashcards/FlashcardRating — the four recall buttons under a card.
 *
 * Again / Hard / Good / Easy map to ratings 1–4 (keyboard 1–4 in the deck);
 * `disabled` locks everything while a rating is being saved.
 */
import { fn } from "storybook/test";
import FlashcardRating from "../FlashcardRating.vue";

export default {
  title: "Student/Flashcards/FlashcardRating",
  component: FlashcardRating,
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Locked while a rating is being saved.",
    },
    onRate: { description: "Emitted with 1 (Again) … 4 (Easy)." },
    onSkip: { description: "Skip the card for now." },
  },
  args: { disabled: false, onRate: fn(), onSkip: fn() },
  render: (args) => ({
    components: { FlashcardRating },
    setup: () => ({ args }),
    template: `<div style="max-width:640px;"><FlashcardRating v-bind="args" /></div>`,
  }),
};

export const Default = {};

export const Disabled = { args: { disabled: true } };
