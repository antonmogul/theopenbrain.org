/*
 * Chapter/Figure widgets/History — the History chapter's two figure widgets
 * (OPENBRAIN-87): the trepanation skull, whose arms reach in to their
 * openings (the November sketch, OPENBRAIN-173), and case 20 of the Edwin
 * Smith papyrus: a tab per part, each a card with its hieroglyphs on the
 * front and the translation on the back (OPENBRAIN-176). The accent is the
 * chapter's ramp.
 */
import TrepanationMethods from "../trepanation/TrepanationMethods.vue";
import trepanation from "../trepanation/schema.js";
import PapyrusCase from "../papyrus/PapyrusCase.vue";
import papyrus from "../papyrus/schema.js";
import { figureContent } from "../content.js";

const inChapter =
  (ramp, height = 760) =>
  () => ({
    template: `<div data-chapter="${ramp}" class="widget-root figure-widget" style="height: ${height}px"><story /></div>`,
  });

export default {
  title: "Chapter/Figure widgets/History",
  decorators: [inChapter("fund")],
};

/** Figure 2 as the reader first sees it: the skull, numbered. */
export const Trepanation = {
  render: () => ({
    components: { TrepanationMethods },
    setup: () => ({
      content: figureContent(trepanation, {}),
      schema: trepanation,
    }),
    template: `<TrepanationMethods :content="content" :schema="schema" />`,
  }),
};

/** Figure 2 in a phone's figure box: marks on the skull, a row of numbers
 *  to press under it. */
export const TrepanationNarrow = {
  ...Trepanation,
  decorators: [
    () => ({ template: `<div style="width: 360px"><story /></div>` }),
    inChapter("fund", 640),
  ],
};

/** The papyrus as the reader first sees it: the title's signs draw in on
 *  the front of the card; "Read the translation" turns it over. */
export const Papyrus = {
  render: () => ({
    components: { PapyrusCase },
    setup: () => ({ content: figureContent(papyrus, {}), schema: papyrus }),
    template: `<PapyrusCase :content="content" :schema="schema" />`,
  }),
};

/** The papyrus in the Retina's teal: the same widget takes each chapter's
 *  colour, the back of its card included. */
export const PapyrusInRetina = {
  ...Papyrus,
  decorators: [inChapter("perc")],
};

/** The papyrus in a phone's text column, where it is as tall as its content
 *  (the schema's fitHeight): the card is as tall as the taller of its sides. */
export const PapyrusNarrow = {
  ...Papyrus,
  decorators: [
    () => ({
      template: `<div data-chapter="fund" class="widget-root figure-widget figure-widget--fit" style="width: 360px"><story /></div>`,
    }),
  ],
};
