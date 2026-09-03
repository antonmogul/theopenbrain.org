/*
 * Chapter/Text/SubSubSection — the third heading level: each entry on a
 * subsection paragraph's `subSubSection` array becomes an H4 with either a
 * single `text` or a `paragraphs` list. Editable for creators.
 */
import SubSubSection from "../SubSubSection.vue";
import { proseFrame, subSubParagraph } from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/SubSubSection",
  component: SubSubSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    subParagraph: subSubParagraph,
    chapterIndex: 1,
    subIndex: 0,
    isCreator: false,
  },
  argTypes: {
    subParagraph: {
      control: "object",
      description:
        "{ id, subSubSection: [{ id, title, text } | { id, title, paragraphs }] }",
    },
    chapterIndex: { control: { type: "number", min: 0 } },
    subIndex: { control: { type: "number", min: 0 } },
    isCreator: { control: "boolean" },
  },
  render: proseFrame(SubSubSection),
};

export const Default = {};

export const Creator = {
  args: { isCreator: true },
  parameters: { auth: { role: "creator" } },
};
