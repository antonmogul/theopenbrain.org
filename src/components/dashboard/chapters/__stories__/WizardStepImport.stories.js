/*
 * Dashboard/Chapters/WizardStepImport — Chapter Wizard step 2: content import.
 *
 * Paste markdown, upload .md/.docx, or attach a .bib/.ris; parsed output is
 * emitted as `update:sections` / `update:references`. The populated story
 * shows the summary the step renders once something has been parsed.
 */
import WizardStepImport from "../WizardStepImport.vue";
import { chapterReferences, chapterSections } from "./chapterFixtures";

export default {
  title: "Dashboard/Chapters/WizardStepImport",
  component: WizardStepImport,
  tags: ["autodocs"],
  argTypes: {
    sections: { control: "object", description: "Parsed sections (v-model)." },
    references: {
      control: "object",
      description: "Parsed bibliography (v-model).",
    },
  },
  args: { sections: chapterSections, references: chapterReferences },
  render: (args) => ({
    components: { WizardStepImport },
    setup: () => ({ args }),
    template: `
      <WizardStepImport
        :sections="args.sections"
        :references="args.references"
        @update:sections="args.sections = $event"
        @update:references="args.references = $event"
      />`,
  }),
};

export const WithParsedContent = {};

/** Fresh step: nothing parsed yet. */
export const Empty = { args: { sections: [], references: [] } };
