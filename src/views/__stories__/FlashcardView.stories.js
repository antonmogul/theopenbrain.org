/*
 * Views/Student/FlashcardView — a study session at /flashcards/:moduleId.
 *
 * No props: the deck is loaded from `flashcards?` with the student's
 * `flashcard_responses?` for scheduling; ratings write to the Storybook API
 * double only.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import FlashcardView from "../FlashcardView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/FlashcardView",
  component: FlashcardView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { FlashcardView, ViewStoryShell },
    template: `<ViewStoryShell label="FlashcardView" path="/flashcards/module-foundations"><FlashcardView /></ViewStoryShell>`,
  }),
};

/** The Foundations deck, one card due. */
export const Default = {};
