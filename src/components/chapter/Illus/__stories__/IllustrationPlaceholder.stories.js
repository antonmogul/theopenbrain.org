/*
 * Chapter/Illustrations/IllustrationPlaceholder — the figure shell shown
 * while artwork is pending: figure label, title, type chip, caption and an
 * authoring note, with a fullscreen toggle. Purely prop-driven.
 */
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";
import { illustrationFrame } from "../../__stories__/chapterFixtures";

const DIAGRAM_TYPES = [
  "photo",
  "portrait",
  "manuscript",
  "diagram",
  "illustration",
  "map",
  "interactive",
  "chart",
];

const MANUSCRIPT = {
  id: "edwin-smith-papyrus",
  placeholder: true,
  figureNumber: 3,
  diagramType: "manuscript",
  title: "The Edwin Smith surgical papyrus",
  caption: "An early written account linking brain injury to behaviour.",
  note: "Source a public-domain plate with a readable column detail.",
};

export default {
  title: "Chapter/Illustrations/IllustrationPlaceholder",
  component: IllustrationPlaceholder,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: { animation: MANUSCRIPT },
  argTypes: {
    animation: {
      control: "object",
      description: `{ id, placeholder: true, figureNumber, diagramType, title, caption, note }. figureNumber is a number ("FIG 03") or a box letter ("FIG A"); diagramType one of ${DIAGRAM_TYPES.join(", ")}.`,
    },
  },
  render: illustrationFrame(IllustrationPlaceholder),
};

export const Default = {};

export const LongCaption = {
  args: {
    animation: {
      id: "retinal-layers",
      placeholder: true,
      figureNumber: 12,
      diagramType: "diagram",
      title: "Cellular layers of the mammalian retina",
      caption:
        "A cross-section locating photoreceptor outer segments, horizontal and bipolar cells, amacrine cells, and the ganglion-cell output layer.",
    },
  },
};

/** A figure inside a breakout box: lettered, not numbered. */
export const BreakoutBoxFigure = {
  args: {
    animation: {
      id: "gall-portrait",
      placeholder: true,
      figureNumber: "A",
      diagramType: "portrait",
      title: "Franz Joseph Gall",
      caption: "Founder of phrenology, c. 1800.",
    },
  },
};

/** No number assigned yet — the label falls back to a bare "FIG". */
export const WithoutFigureNumber = {
  args: {
    animation: {
      id: "unnumbered",
      placeholder: true,
      diagramType: "chart",
      title: "Spike rate against contrast",
    },
  },
};
