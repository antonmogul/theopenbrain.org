/*
 * Chapter/Illustrations/IllustrationPlaceholder — the figure shell: figure
 * label, title and a fullscreen toggle around either the "artwork pending"
 * state (type chip, caption, authoring note) or, once the row carries images,
 * the artwork itself (OPENBRAIN-41). In a pane the legend is folded behind
 * a "Legend" control (OPENBRAIN-177); in the text column it stays in the
 * flow. Purely prop-driven.
 */
import { FIG19, FIG21, FIG15 } from "./g2MediaFixtures";
import IllustrationPlaceholder from "../IllustrationPlaceholder.vue";
import { illustrationFrame } from "../../__stories__/chapterFixtures";
import {
  FIG6_ALL_IMAGES,
  FIG7_IMAGES,
  FIG7_LEGEND,
} from "./figureImageFixtures";

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

/* The reader's figure pane has a fixed height (viewport minus the top bar);
   the artwork stories use one too, so fitting is what is on show. This is
   the paper pane (a chapter whose art was drawn for paper, the Retina):
   the toolbar is above the artwork, the legend opens under it, and the
   fullscreen dialog stays on paper, which the shell reads from the pane's
   data-ground. */
const paneFrame = illustrationFrame(IllustrationPlaceholder, {
  template: `<div class="figure-pane figure-pane--paper" data-ground="paper" style="position:relative;height:720px;overflow:hidden;"><StoryComponent v-bind="args" /></div>`,
});

/** Artwork has landed: a cycling set, each plate with its own caption. */
export const WithCyclingArtwork = {
  render: paneFrame,
  args: {
    animation: {
      id: "animationFoundationsFig6",
      figureNumber: 6,
      diagramType: "manuscript",
      title: "The cell doctrine (ventricular theory)",
      images: FIG6_ALL_IMAGES,
    },
  },
};

/** Artwork under one shared legend (config.caption). */
export const WithSharedLegendArtwork = {
  render: paneFrame,
  args: {
    animation: {
      id: "animationFoundationsFig7",
      figureNumber: 7,
      diagramType: "manuscript",
      title: "Vesalius, De Humani Corporis Fabrica",
      caption: FIG7_LEGEND,
      images: FIG7_IMAGES,
    },
  },
};

// Stuart follow-ups, 22 October: review the exact artwork and slide legends.
export const GalvaniSlideLegends = {
  render: paneFrame,
  args: { animation: FIG19 },
};
export const HuxleyFirst = { render: paneFrame, args: { animation: FIG21 } };
export const GrowthConeLegendWidth = {
  render: paneFrame,
  args: { animation: FIG15 },
};

/* The reader's pane as IllustrationsComp paints it since the History
   redesign (OPENBRAIN-152): the dark surface, the toolbar below the artwork,
   the label in amber. The wrapper carries the pane's classes, which is all
   the shell keys on; `font-mono` is the pane's own. */
const darkPaneFrame = illustrationFrame(IllustrationPlaceholder, {
  template: `<div class="figure-pane figure-pane--dark font-mono" style="position:relative;height:720px;overflow:hidden;display:flex;"><StoryComponent v-bind="args" /></div>`,
});

/** On the dark pane: a gallery of ten, opening as the grid, its toolbar
 *  below the artwork. A tile opens the image; "Legend" at the end of the
 *  toolbar shows that image's legend over the artwork's foot on hover or
 *  focus, and under the title on a click. Expand opens the same view full
 *  screen, on the same dark ground. */
export const OnTheDarkPane = {
  render: darkPaneFrame,
  args: {
    animation: {
      id: "animationFoundationsFig6",
      figureNumber: 6,
      diagramType: "manuscript",
      title: "The cell doctrine (ventricular theory)",
      images: FIG6_ALL_IMAGES,
    },
  },
};

/** On the dark pane: a single plate under one legend. */
export const OnTheDarkPaneSingle = {
  render: darkPaneFrame,
  args: {
    animation: {
      id: "animationFoundationsFig7",
      figureNumber: 7,
      diagramType: "manuscript",
      title: "Vesalius, De Humani Corporis Fabrica",
      caption: FIG7_LEGEND,
      images: FIG7_IMAGES.slice(0, 1),
    },
  },
};

/** On the dark pane: artwork still pending. */
export const OnTheDarkPanePending = { render: darkPaneFrame };
