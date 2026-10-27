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

import { hippocratesPair, comparativePair } from "./breakoutReviewFixtures";

const pairedFrame = (args) => ({
  components: { SectionComp },
  setup: () => ({ args }),
  template: `<div data-chapter="fund" class="chapter-reader" style="padding:24px;max-width:1280px;margin:auto;font:calc(var(--type-body-size) * var(--reading-size, 1))/var(--type-body-lh) var(--font-body)"><SectionComp v-bind="args" /></div>`,
});

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

/** R02: the actual renderer, both complete source paragraphs and artwork. */
/** The Hippocrates box on the dark panel (OPENBRAIN-153), as History
 *  renders it: the Explore cards sit on the dark inside a hairline, their
 *  images plain until the duotoned assets arrive. The section's own
 *  `treatment` stands in for the chapter lookup here. */
export const HippocratesPairDark = {
  args: { section: { ...hippocratesPair, treatment: "dark" }, label: "A" },
};

/** The same box on violet, the Figma's treatment for Humoral theory
 *  (2730:8059): the cards stay paper, images plain on white. */
export const HippocratesPairViolet = {
  args: { section: { ...hippocratesPair, treatment: "violet" }, label: "A" },
};

/** The comparative-neuroanatomy box on the dark panel (Figma 2730:8111). */
export const ComparativePairDark = {
  args: { section: { ...comparativePair, treatment: "dark" }, label: "B" },
};

export const HippocratesPair = {
  args: { section: hippocratesPair, label: "A" },
  render: pairedFrame,
};
export const ComparativePair = {
  args: { section: comparativePair, label: "B" },
  render: pairedFrame,
};

/** Real reader CSS and widget shells: adjacent bands touch, prose splits runs. */
export const ConsecutiveWidgets = {
  render: pairedFrame,
  args: {
    section: {
      id: "widget-seams",
      title: "Consecutive inline widgets",
      paragraphs: [
        { id: "before-widgets", text: "Prose before the continuous run." },
        ...["first", "second"].map((id) => ({
          id: `widget-${id}`,
          type: "widget",
          widget: {
            kind: "inline",
            widgetId: "not-ported-yet",
            placementId: `seam-${id}`,
            title: `Widget ${id}`,
          },
        })),
        {
          id: "between-widgets",
          text: "Prose must retain its breathing room.",
        },
        {
          id: "widget-separated",
          type: "widget",
          widget: {
            kind: "inline",
            widgetId: "not-ported-yet",
            placementId: "seam-separated",
            title: "Widget after prose",
          },
        },
      ],
    },
  },
};
