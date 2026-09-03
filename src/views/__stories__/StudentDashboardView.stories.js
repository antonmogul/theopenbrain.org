/*
 * Views/Student/StudentDashboardView — the student home at /student.
 *
 * No props: enrolments, reading progress, quizzes, decks, highlights and
 * notes all come from the Storybook API double. The cards it composes have
 * their own Student/Dashboard Cards stories.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import StudentDashboardView from "../StudentDashboardView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/StudentDashboardView",
  component: StudentDashboardView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { StudentDashboardView, ViewStoryShell },
    template: `<ViewStoryShell label="StudentDashboardView" path="/student"><StudentDashboardView /></ViewStoryShell>`,
  }),
};

/** Enrolled in NEUR 101 with a chapter in progress. */
export const Default = {};

/** A brand-new student: every section in its empty state. */
export const NoEnrollments = {
  parameters: {
    api: {
      ...apiFixtures,
      "course_enrollments?": [],
      "reading_progress?": [],
      "quiz_attempts?": [],
      "flashcard_sessions?": [],
    },
  },
};
