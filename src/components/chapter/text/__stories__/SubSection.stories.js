/*
 * Chapter/Text/SubSection — renders every subsection listed on a paragraph's
 * `subSection` array: an H3 and its paragraphs (which may in turn nest
 * sub-subsections). Editable for creators.
 */
import SubSection from "../SubSection.vue";
import {
  proseFrame,
  subsectionParagraph,
} from "../../__stories__/chapterFixtures";

export default {
  title: "Chapter/Text/SubSection",
  component: SubSection,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { paragraph: subsectionParagraph, index: 1, isCreator: false },
  argTypes: {
    paragraph: {
      control: "object",
      description: "{ id, subSection: [{ id, title, paragraphs }] }",
    },
    index: {
      control: { type: "number", min: 0 },
      description: "The parent section's index.",
    },
    isCreator: { control: "boolean" },
  },
  render: proseFrame(SubSection),
};

export const Default = {};

export const Creator = {
  args: { isCreator: true },
  parameters: { auth: { role: "creator" } },
};

/** Two consecutive subsections on one paragraph. */
export const MultipleSubsections = {
  args: {
    paragraph: {
      id: "bipolar-diversity",
      subSection: [
        ...subsectionParagraph.subSection,
        {
          id: "rod-bipolar-pathway",
          title: "The rod bipolar pathway",
          paragraphs: [
            {
              id: "rod-bipolar-1",
              text: "Rod bipolar cells do not contact ganglion cells directly; they route through AII amacrine cells into the cone pathways.",
            },
          ],
        },
      ],
    },
  },
};
