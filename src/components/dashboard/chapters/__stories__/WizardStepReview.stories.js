/*
 * Dashboard/Chapters/WizardStepReview — Chapter Wizard step 4: review and
 * create.
 *
 * Four end states: reviewing, creating (spinner on the button), a create
 * error, and the success card once `createdChapter` is set.
 */
import WizardStepReview from "../WizardStepReview.vue";
import {
  chapterMeta,
  chapterReferences,
  chapterSections,
} from "./chapterFixtures";

export default {
  title: "Dashboard/Chapters/WizardStepReview",
  component: WizardStepReview,
  tags: ["autodocs"],
  argTypes: {
    meta: { control: "object" },
    sections: { control: "object" },
    references: { control: "object" },
    creating: { control: "boolean" },
    createError: { control: "text" },
    createdChapter: {
      control: "object",
      description: "Non-null swaps the review for the success card.",
    },
  },
  args: {
    meta: chapterMeta,
    sections: chapterSections,
    references: chapterReferences,
    creating: false,
    createError: null,
    createdChapter: null,
  },
  render: (args) => ({
    components: { WizardStepReview },
    setup: () => ({ args }),
    template: `<WizardStepReview v-bind="args" />`,
  }),
};

export const Review = {};

export const Creating = { args: { creating: true } };

export const CreateError = {
  args: {
    createError: "The draft could not be created. Check your connection.",
  },
};

export const Created = {
  args: {
    createdChapter: {
      id: "module-foundations",
      title: chapterMeta.title,
      slug: chapterMeta.slug,
      order_index: chapterMeta.order_index,
    },
  },
};
