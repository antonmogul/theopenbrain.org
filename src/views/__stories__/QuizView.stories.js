/*
 * Views/Student/QuizView — a quiz attempt at /quiz/:quizId.
 *
 * No props: the quiz and its questions come from `quizzes?` through the
 * Storybook API double; attempts are written to the double only. The intro,
 * question, progress, results and review screens have their own Student/Quiz
 * stories — this is the state machine that sequences them.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import QuizView from "../QuizView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/QuizView",
  component: QuizView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { QuizView, ViewStoryShell },
    template: `<ViewStoryShell label="QuizView" path="/quiz/quiz-foundations"><QuizView /></ViewStoryShell>`,
  }),
};

/** The Foundations knowledge check on its intro screen. */
export const Default = {};
