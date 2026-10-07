/*
 * Student/Flashcards/FlashcardGuide — how flashcards work, and the draft
 * notice (OPENBRAIN-102). The how-to hides once dismissed on this device.
 */
import FlashcardGuide from "../FlashcardGuide.vue";

export default {
  title: "Student/Flashcards/FlashcardGuide",
  component: FlashcardGuide,
  tags: ["autodocs"],
  argTypes: { draft: { control: "boolean" } },
  args: { draft: false },
  render: (args) => ({
    components: { FlashcardGuide },
    setup() {
      try {
        localStorage.removeItem("ob.flashcardsGuideSeen");
      } catch {
        /* storage unavailable */
      }
      return { args };
    },
    template: `<div style="max-width:560px;padding:24px;"><FlashcardGuide v-bind="args" /></div>`,
  }),
};

export const Default = {};

/** A deck the authors have not checked yet. */
export const DraftDeck = { args: { draft: true } };
