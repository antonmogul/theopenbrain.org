/*
 * Views/Student/EnrollView — the enrolment landing page at /enroll/:courseId.
 *
 * No props: the course comes from `courses?` and the "already enrolled"
 * check from `course_enrollments?`, both served by the Storybook API double.
 */
import ViewStoryShell from "@/stories/ViewStoryShell.vue";
import EnrollView from "../EnrollView.vue";
import { apiFixtures } from "@/stories/openBrainFixtures";

export default {
  title: "Views/Student/EnrollView",
  component: EnrollView,
  parameters: {
    layout: "fullscreen",
    auth: { authenticated: true, role: "student" },
    api: apiFixtures,
  },
  render: () => ({
    components: { EnrollView, ViewStoryShell },
    template: `<ViewStoryShell label="EnrollView" path="/enroll/course-neuro-101"><EnrollView /></ViewStoryShell>`,
  }),
};

/** The fixture student is already enrolled in NEUR 101. */
export const Default = {};

/** A fresh link: the course is shown with an Enrol button. */
export const NotEnrolled = {
  parameters: { api: { ...apiFixtures, "course_enrollments?": [] } },
};

/** The course is unpublished or the id is wrong. */
export const CourseUnavailable = {
  parameters: { api: { ...apiFixtures, "courses?": [] } },
};
