/*
 * Foundations/SectionHeader — eyebrow, title, subtitle and an actions slot.
 *
 * Every dashboard section starts with one. `preview` appends a PreviewTag to
 * the title for sections that are mocked but not yet wired.
 */
import SectionHeader from "../SectionHeader.vue";
import Button from "../Button.vue";

export default {
  title: "Foundations/SectionHeader",
  component: SectionHeader,
  tags: ["autodocs"],
  argTypes: {
    eyebrow: { control: "text" },
    title: { control: "text" },
    subtitle: { control: "text" },
    preview: { control: "boolean" },
    actionLabel: {
      control: "text",
      description: "Story-only: label of a button in the `actions` slot.",
    },
  },
  args: {
    eyebrow: "03 · Chapters",
    title: "Curriculum",
    subtitle: "Manage the chapters currently available to readers.",
    preview: false,
    actionLabel: "New chapter",
  },
  render: (args) => ({
    components: { SectionHeader, Button },
    setup: () => ({ args }),
    template: `
      <SectionHeader
        :eyebrow="args.eyebrow"
        :title="args.title"
        :subtitle="args.subtitle"
        :preview="args.preview"
      >
        <template v-if="args.actionLabel" #actions>
          <Button size="sm">{{ args.actionLabel }}</Button>
        </template>
      </SectionHeader>`,
  }),
};

export const WithAction = {};

/** Preview marker on the title plus an action — the catalog's original case. */
export const PreviewWithAction = { args: { preview: true } };

export const Plain = { args: { eyebrow: "", actionLabel: "" } };

export const TitleOnly = {
  args: { eyebrow: "", subtitle: "", actionLabel: "" },
};
