/*
 * Dashboard/Chapters/WizardStepMeta — Chapter Wizard step 1: title & metadata.
 *
 * The slug auto-derives from the title until it is edited by hand; the
 * blank story shows the invalid (no title) state the wizard blocks on.
 */
import WizardStepMeta from "../WizardStepMeta.vue";
import { chapterMeta, emptyMeta } from "./chapterFixtures";

export default {
  title: "Dashboard/Chapters/WizardStepMeta",
  component: WizardStepMeta,
  tags: ["autodocs"],
  argTypes: {
    modelValue: {
      control: "object",
      description: "{ title, description, slug, order_index } (v-model)",
    },
    existingChapterCount: {
      control: { type: "number", min: 0 },
      description: "Used to suggest the next order_index.",
    },
  },
  args: { modelValue: chapterMeta, existingChapterCount: 1 },
  render: (args) => ({
    components: { WizardStepMeta },
    setup: () => ({ args }),
    template: `
      <WizardStepMeta
        :model-value="args.modelValue"
        :existing-chapter-count="args.existingChapterCount"
        @update:modelValue="args.modelValue = $event"
      />`,
  }),
};

export const Filled = {};

/** Nothing entered yet — the title is required, so the step is invalid. */
export const Blank = {
  args: { modelValue: emptyMeta, existingChapterCount: 0 },
};
