/*
 * Chapter/Text/ChapterReferences — the chapter's references, full width, at
 * the end of its back matter (OPENBRAIN-179): the section's number and title,
 * how many sources, a filter for a long list, then ReferenceList in one, two
 * or three columns as the block widens.
 *
 * The entries are the published History chapter's (the fixture's references
 * table), so the list is as long and as varied as the real one.
 */
import ChapterReferences from "../ChapterReferences.vue";
import fixture from "@/stories/historyFullReaderData.json";

export default {
  title: "Chapter/Text/ChapterReferences",
  component: ChapterReferences,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    references: { control: "object" },
    title: { control: "text" },
    label: {
      control: "text",
      description:
        "The section's number in the chapter; empty when the list is not a section.",
    },
  },
  args: {
    references: fixture.references,
    title: "References",
    label: "6",
    sectionId: "section-references",
    sectionSlug: "references",
  },
  render: (args) => ({
    components: { ChapterReferences },
    setup: () => ({ args }),
    template: `<div style="padding:clamp(1.25rem,4.17vw,3.75rem);background:rgb(var(--color-paper));"><ChapterReferences v-bind="args" /></div>`,
  }),
};

/** History's 121 sources: books, articles with a DOI, web pages. */
export const Default = {};

/** A short list has no filter, and no number when it is not a section. */
export const ShortList = {
  args: {
    references: fixture.references.slice(0, 5),
    label: "",
    sectionId: null,
    sectionSlug: null,
  },
};
