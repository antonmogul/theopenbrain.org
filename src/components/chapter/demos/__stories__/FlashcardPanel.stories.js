/*
 * Chapter/Demos/FlashcardPanel — the flashcard study session inside a
 * DemoModal: loads the module's deck through the (mocked) API client, then
 * flip / rate / skip with keyboard shortcuts. `moduleId` picks the deck.
 */
import FlashcardPanel from "../FlashcardPanel.vue";
import { flashcards, modalFrame } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Demos/FlashcardPanel",
  component: FlashcardPanel,
  parameters: { layout: "fullscreen", auth: { role: "student" } },
  args: { moduleId: "retina-module" },
  argTypes: {
    moduleId: {
      control: "text",
      description: "The module whose flashcards are loaded.",
    },
  },
  render: modalFrame(FlashcardPanel),
};

/** Studying: first card, front side. */
export const Default = {
  parameters: {
    api: {
      "flashcards?module_id=eq.retina-module": flashcards,
      flashcard_responses: [],
      flashcard_sessions: [{ id: "storybook-session" }],
    },
  },
};

/** A module with no cards. */
export const Empty = {
  args: { moduleId: "empty-module" },
  parameters: {
    api: {
      "flashcards?module_id=eq.empty-module": [],
      flashcard_sessions: [{ id: "empty-session" }],
    },
  },
};

/** The deck request never resolves — the loading state stays up. */
export const Loading = {
  args: { moduleId: "loading-module" },
  parameters: {
    api: {
      "flashcards?module_id=eq.loading-module": () => new Promise(() => {}),
    },
  },
};
