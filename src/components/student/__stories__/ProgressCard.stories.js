/*
 * Student/Dashboard Cards/ProgressCard — "Continue reading" on the student
 * dashboard.
 *
 * `continueReading` carries the module, its course, the scroll position and
 * a `lastAccessedAt` Date (a real Date — the relative label subtracts it).
 * Null renders the empty state that prompts enrolment.
 */
import ProgressCard from "../ProgressCard.vue";
import { courseFixture, moduleFixture } from "@/stories/openBrainFixtures";

const hoursAgo = (hours) => new Date(Date.now() - hours * 3_600_000);
const ITEM = {
  module: moduleFixture,
  course: courseFixture,
  scrollPosition: 42,
  lastAccessedAt: hoursAgo(1),
};

export default {
  title: "Student/Dashboard Cards/ProgressCard",
  component: ProgressCard,
  tags: ["autodocs"],
  argTypes: {
    continueReading: {
      control: "object",
      description:
        "{ module, course, scrollPosition (0–100), lastAccessedAt: Date }; null shows the empty state.",
    },
  },
  args: { continueReading: ITEM },
  render: (args) => ({
    components: { ProgressCard },
    setup: () => ({ args }),
    template: `<div style="max-width:520px;"><ProgressCard v-bind="args" /></div>`,
  }),
};

/** Mid-chapter, last opened an hour ago. */
export const Default = {};

/** Opened moments ago, barely begun. */
export const JustStarted = {
  args: {
    continueReading: { ...ITEM, scrollPosition: 3, lastAccessedAt: new Date() },
  },
};

/** Almost finished, three days since the last session. */
export const NearlyDone = {
  args: {
    continueReading: {
      ...ITEM,
      scrollPosition: 96,
      lastAccessedAt: hoursAgo(72),
    },
  },
};

/** Nothing in progress: the enrolment prompt. */
export const Empty = { args: { continueReading: null } };
