import AITutorPreview from "../AITutorPreview.vue";
import { retinaChapter } from "@/components/chapter/__stories__/chapterFixtures";

export default {
  title: "Student/AI Tutor/AITutorPreview",
  component: AITutorPreview,
  tags: ["autodocs"],
  args: { chapter: retinaChapter },
  render: (args) => ({
    components: { AITutorPreview },
    setup: () => ({ args }),
    template:
      '<div style="height:640px;max-width:400px;"><AITutorPreview v-bind="args" /></div>',
  }),
};

/** Source-reading fixtures only. Device speech never starts automatically. */
export const Default = {};
export const ChapterUnavailable = { args: { chapter: null } };
