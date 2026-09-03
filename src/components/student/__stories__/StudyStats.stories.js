/*
 * Student/Dashboard Cards/StudyStats — this week's four numbers.
 *
 * `timeSpentThisWeek` is seconds and is formatted to minutes / hours; the
 * other three are plain counts.
 */
import StudyStats from "../StudyStats.vue";

export default {
  title: "Student/Dashboard Cards/StudyStats",
  component: StudyStats,
  tags: ["autodocs"],
  argTypes: {
    stats: {
      control: "object",
      description:
        "{ timeSpentThisWeek (s), modulesCompleted, highlightsMade, notesTaken }",
    },
  },
  args: {
    stats: {
      timeSpentThisWeek: 7320,
      modulesCompleted: 2,
      highlightsMade: 14,
      notesTaken: 6,
    },
  },
  render: (args) => ({
    components: { StudyStats },
    setup: () => ({ args }),
    template: `<div style="max-width:720px;"><StudyStats v-bind="args" /></div>`,
  }),
};

/** A typical week: two hours, a couple of chapters. */
export const Default = {};

/** A fresh account. */
export const Empty = {
  args: {
    stats: {
      timeSpentThisWeek: 0,
      modulesCompleted: 0,
      highlightsMade: 0,
      notesTaken: 0,
    },
  },
};

/** Exam week: hours-only time label and big counts. */
export const HeavyWeek = {
  args: {
    stats: {
      timeSpentThisWeek: 36_000,
      modulesCompleted: 5,
      highlightsMade: 128,
      notesTaken: 41,
    },
  },
};
