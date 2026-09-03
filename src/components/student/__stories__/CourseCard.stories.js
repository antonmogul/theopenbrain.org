/*
 * Student/Dashboard Cards/CourseCard — one enrolled course with its modules.
 *
 * Takes the `course_enrollments` row with its nested course, professor and
 * modules; module rows link into the reader through the memory router.
 */
import CourseCard from "../CourseCard.vue";
import { courseFixture } from "@/stories/openBrainFixtures";

const ENROLLMENT = {
  id: "enrollment-1",
  enrolled_at: "2026-08-20T12:00:00Z",
  course: courseFixture,
};

export default {
  title: "Student/Dashboard Cards/CourseCard",
  component: CourseCard,
  tags: ["autodocs"],
  argTypes: {
    enrollment: {
      control: "object",
      description:
        "course_enrollments row with its nested course, professor and modules.",
    },
  },
  args: { enrollment: ENROLLMENT },
  render: (args) => ({
    components: { CourseCard },
    setup: () => ({ args }),
    template: `<div style="max-width:640px;"><CourseCard v-bind="args" /></div>`,
  }),
};

/** Part-way through, one module done. */
export const Default = {};

/** A course with nothing assigned yet. */
export const NoModules = {
  args: {
    enrollment: {
      ...ENROLLMENT,
      course: { ...courseFixture, modules: [], progressPercent: 0 },
    },
  },
};

/** Everything read: full bar, every module offers Review. */
export const Completed = {
  args: {
    enrollment: {
      ...ENROLLMENT,
      course: {
        ...courseFixture,
        progressPercent: 100,
        modules: courseFixture.modules.map((module) => ({
          ...module,
          is_completed: true,
        })),
      },
    },
  },
};

/** No description, semester or professor on the course row. */
export const Minimal = {
  args: {
    enrollment: {
      ...ENROLLMENT,
      course: {
        ...courseFixture,
        description: "",
        semester: "",
        professor: null,
      },
    },
  },
};
