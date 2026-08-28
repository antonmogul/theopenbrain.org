import CourseCard from "../CourseCard.vue";
import ProgressCard from "../ProgressCard.vue";
import StudyStats from "../StudyStats.vue";
import { courseFixture, moduleFixture } from "@/stories/openBrainFixtures";

export default {
  title: "Student/Dashboard Cards",
  decorators: [
    () => ({
      template: '<div style="max-width:900px;padding:24px"><story /></div>',
    }),
  ],
};

export const EnrolledCourse = {
  render: () => ({
    components: { CourseCard },
    data: () => ({
      enrollment: {
        enrolled_at: "2026-08-20T12:00:00Z",
        course: courseFixture,
      },
    }),
    template: '<CourseCard :enrollment="enrollment" />',
  }),
};
export const ContinueReading = {
  render: () => ({
    components: { ProgressCard },
    data: () => ({
      item: {
        module: moduleFixture,
        course: courseFixture,
        scrollPosition: 42,
        lastAccessedAt: new Date(Date.now() - 3600000),
      },
    }),
    template: '<ProgressCard :continue-reading="item" />',
  }),
};
export const WeeklyStats = {
  render: () => ({
    components: { StudyStats },
    data: () => ({
      stats: {
        timeSpentThisWeek: 7320,
        modulesCompleted: 2,
        highlightsMade: 14,
        notesTaken: 6,
      },
    }),
    template: '<StudyStats :stats="stats" />',
  }),
};
