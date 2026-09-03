/*
 * Dashboard/Chapters/WizardStepStructure — Chapter Wizard step 3: fix the
 * section tree.
 *
 * Rename, reorder and delete sections, move paragraphs, preview references.
 * Edits come back through `update:sections`, so the story writes them into
 * args to keep the tree interactive.
 */
import WizardStepStructure from "../WizardStepStructure.vue";
import { chapterReferences, chapterSections } from "./chapterFixtures";

export default {
  title: "Dashboard/Chapters/WizardStepStructure",
  component: WizardStepStructure,
  tags: ["autodocs"],
  argTypes: {
    sections: { control: "object" },
    references: { control: "object" },
  },
  args: {
    sections: structuredClone(chapterSections),
    references: chapterReferences,
  },
  render: (args) => ({
    components: { WizardStepStructure },
    setup: () => ({ args }),
    template: `
      <WizardStepStructure
        :sections="args.sections"
        :references="args.references"
        @update:sections="args.sections = $event"
        @update:references="args.references = $event"
      />`,
  }),
};

export const Populated = {};

export const WithoutReferences = { args: { references: [] } };

export const Empty = { args: { sections: [], references: [] } };
