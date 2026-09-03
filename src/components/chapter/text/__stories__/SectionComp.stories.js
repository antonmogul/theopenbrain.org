/*
 * Chapter/Text/SectionComp — one top-level chapter section: the round badge,
 * the title, and its paragraphs (which may nest subsections). Creators get
 * EditableBlock in place of the static title and paragraphs.
 */
import SectionComp from "../SectionComp.vue";
import {
  proseFrame,
  retinaChapter,
  subsectionParagraph,
} from "../../__stories__/chapterFixtures";

const SECTION = retinaChapter.sections[0];

export default {
  title: "Chapter/Text/SectionComp",
  component: SectionComp,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { section: SECTION, index: 0, label: "", isCreator: false },
  argTypes: {
    section: {
      control: "object",
      description: "{ id, title, kind?, paragraphs: [...] }",
    },
    index: {
      control: { type: "number", min: 0 },
      description: "Zero-based position; the badge shows index + 1.",
    },
    label: {
      control: "text",
      description:
        'Badge text override — "A", "B", … for breakout boxes. Empty falls back to index + 1.',
    },
    isCreator: { control: "boolean" },
  },
  render: proseFrame(SectionComp),
};

export const Default = {};

/** Creator mode: title and paragraphs become EditableBlocks. */
export const Creator = {
  args: { isCreator: true },
  parameters: { auth: { role: "creator" } },
};

/** A breakout box: lettered badge and the "Breakout box" kicker. */
export const BreakoutBox = {
  args: {
    label: "A",
    section: {
      id: "box-clinical-note",
      kind: "box",
      title: "Clinical note: night blindness",
      paragraphs: [
        {
          id: "box-clinical-note-1",
          text: "Vitamin A deficiency starves rods of 11-cis retinal, and scotopic vision is the first thing to go.",
        },
      ],
    },
  },
};

/** A section whose paragraph carries a nested subsection. */
export const WithSubsections = {
  args: {
    index: 1,
    section: {
      ...retinaChapter.sections[1],
      paragraphs: [
        ...retinaChapter.sections[1].paragraphs,
        subsectionParagraph,
      ],
    },
  },
};
